import logging
import asyncio
from datetime import datetime
import os
import os
import subprocess
import zipfile
import tempfile

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from dataproviders.copernicus_dataspace.QueryExecutorCopernicusDataspace import QueryExecutorCopernicusDataspace
from database import get_db
from concurrent.futures import ProcessPoolExecutor
from database import SessionLocal

from viewmodels.search.SearchQueryParameters import SearchQueryParameters
from viewmodels.images.SearchResultItem import SearchResultItem
from entities.DatasetImage import DatasetImageEntity
from viewmodels.images.ProjectImageItem import ProjectImageResponse
from viewmodels.images.ImageImport import ImageImport
from entities.User import User
from utils.auth_utils import get_current_user
from utils.auth_utils import canReadProject
from utils.auth_utils import canWriteProject
from utils.WebsocketManager import oWsManager

oRouter = APIRouter(prefix="/images")

# Global process pool (set max_workers based on your CPU cores)


def init_worker_logging():
    """
    This runs once when each worker process in the pool starts.
    """
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s [%(levelname)s] (Worker %(process)d): %(message)s"
    )

s_oConversionPool = ProcessPoolExecutor(max_workers=4, initializer=init_worker_logging)

# TODO: add response model
@oRouter.get("/search", response_model=list[SearchResultItem])
async def search(bbox: str = Query(..., description="Bounding box coordinates in WKT format"),
                 start_date: str = Query(..., description="Start date with YYYY-MM-DD) format"),
                 end_date: str = Query(..., description="End date with YYYY-MM-DD format"),
                 platform: str = Query(None, description="Satellite platform to search for"),
                 product_level: str = Query(None, description="Product level to search for"),
                 max_cloud_cover: float = Query(0.0, description="Maximum cloud cover percentage"),
                 product_name : str = Query(None, description="Product name to search for"),
                 oCurrentUser: User = Depends(get_current_user)):
    """
    Search images

    :param bbox: Bounding box coordinates in WKT format
    :param start_date: Start date with YYYY-MM-DD format
    :param end_date: End date with YYYY-MM-DD format
    :param platform: Satellite platform to search for
    :param product_type: Type of product to search for
    :param max_cloud_cover: Maximum cloud cover percentage
    :return: dict containing list of image IDs matching the search criteria
    """
    try:

        # check the inputs 
        if not bbox or not start_date or not end_date or not platform or not product_level:
            raise HTTPException(status_code=400, detail="Missing required query parameters: bbox, start_date, end_date, platform")
        
        if not bbox.startswith("POLYGON"):
            raise HTTPException(status_code=400, detail="Invalid bbox format. Expected WKT POLYGON format.")
        
        if platform != "Sentinel-2":
            raise HTTPException(status_code=400, detail="Invalid platform.")
        
        if product_level not in ["L1C", "L2A"]:
            raise HTTPException(status_code=400, detail="Invalid product level.")
        
        if max_cloud_cover < 0 or max_cloud_cover > 100:
            raise HTTPException(status_code=400, detail="Invalid cloud cover percentage. Must be between 0 and 100.")
        
        try:
            datetime.strptime(start_date, "%Y-%m-%dT%H:%M:%S.%fZ")
            datetime.strptime(end_date, "%Y-%m-%dT%H:%M:%S.%fZ")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DDTHH:MM:SS.sssZ.")

        oSearchQueryParameters = SearchQueryParameters(
            sPlatform = platform,
            sStartDate = start_date,
            sEndDate = end_date,
            sBoundingBox = bbox,
            sProductLevel = product_level,
            fCloudCover = str(max_cloud_cover)
        )
        
        oQueryExecutor = QueryExecutorCopernicusDataspace()
        oResults = oQueryExecutor.executeQuery(oSearchQueryParameters)

        return oResults

    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error processing template data: {str(oE)}')
    


def find_s2_bands(sZipPath: str):
    """
    Returns a list of VSI paths for all spectral bands in the ZIP.
    Priority is give to 10m bands and includes 20m bands for a complete stack
    """
    # Standard S2 band order for a logical stack
    # B02, B03, B04 (10m) | B08 (10m) | B05, B06, B07, B8A, B11, B12 (20m)
    sTargetBands = ["B02", "B03", "B04", "B08", "B05", "B06", "B07", "B8A", "B11", "B12"]
    dFoundBands = {}

    sNormalizedZip = sZipPath.replace('\\', '/')
    
    logging.debug(f"find_s2_bands: Scanning ZIP file {sZipPath} for target bands")

    with zipfile.ZipFile(sZipPath, 'r') as oZipFile:
        for sFileName in oZipFile.namelist():
            if "IMG_DATA/" in sFileName and sFileName.endswith(".jp2"):
                # Extract band ID from filename (e.g., ..._B02_10m.jp2 -> B02)
                for sBand in sTargetBands:
                    if f"_{sBand}" in sFileName:
                        # For L2A, prefer R10m for the first 4 bands, R20m for the rest
                        vsi_path = f"/vsizip/{sNormalizedZip}/{sFileName}"
                        
                        # Logic to avoid duplicates (e.g., B02 at 10m vs 20m)
                        if sBand not in dFoundBands:
                            dFoundBands[sBand] = vsi_path
                        elif "10m" in sFileName: # Favor higher res if found later
                            dFoundBands[sBand] = vsi_path

    # Return paths in the specific order defined in sTargetBands
    logging.debug(f"find_s2_bands: Found bands: {list(dFoundBands.keys())}")
    return [dFoundBands[b] for b in sTargetBands if b in dFoundBands]



def find_s2_internal_path(sZipPath: str, sTarget: str = "TCI") -> str | None:
    """
    Scans the ZIP to find the actual internal path to the image data.
    Works for both L1C and L2A structures.
    """
    with zipfile.ZipFile(sZipPath, 'r') as oZipFile:
        # look for any .jp2 file inside an IMG_DATA folder
        for sFileName in oZipFile.namelist():
            if "IMG_DATA/" in sFileName and sFileName.endswith(".jp2"):
                # If it's L2A, we usually want the 10m bands by default
                # TODO: is it really the resolution we want? Maybe we should be more flexible here?
                if "MSIL2A" in sZipPath:
                    if "/R10m/" in sFileName and f"_{sTarget}" in sFileName:
                        return sFileName
                else:
                    if f"_{sTarget}" in sFileName:
                        # L1C structure: IMG_DATA is the direct parent
                        return sFileName
    return None
    

def convert_s2_zip_to_cog(sZipPath: str, sOutputPath: str):
    """
    Stacks all S2 bands into a single multi-band COG.
    """
    sBaseDir = os.path.dirname(sZipPath)

    # 1. Get all band paths
    asBandPaths = find_s2_bands(sZipPath)

    if not asBandPaths:
        logging.error(f"convert_s2_zip_to_cog: No spectral bands found in {sZipPath}")
        raise Exception(f"No spectral bands found in {sZipPath}")

    logging.debug(f"convert_s2_zip_to_cog: Found band paths")

    # 2. Create a temporary VRT to stack them
    # We use a context manager to ensure the temp file is cleaned up
    # TODO: I want to create this temp file in the same folder of the S2 path
    with tempfile.NamedTemporaryFile(suffix=".vrt", dir=sBaseDir, delete=False) as oTempVrt:
        sVrtPath = oTempVrt.name

    try:
        # Step A: Build the Virtual Stack
        # -separate: puts each input file into a separate band
        # -resolution highest: upsamples 20m bands to 10m automatically
        asVrtCmd = [
            "gdalbuildvrt",
            "-separate",
            "-resolution", "highest",
            sVrtPath
        ] + asBandPaths
        
        logging.debug(f"convert_s2_zip_to_cog: Running GDAL command gdalbuildvrt")
        subprocess.run(asVrtCmd, check=True, capture_output=True)
        logging.debug(f"convert_s2_zip_to_cog: VRT created at {sVrtPath}")

        # Step B: Translate VRT to Multi-band COG
        asCogCmd = [
            "gdal_translate",
            sVrtPath,
            sOutputPath,
            "-of", "COG",
            "-co", "COMPRESS=DEFLATE",
            "-co", "NUM_THREADS=ALL_CPUS",
            "-co", "BIGTIFF=YES" # Stacked S2 can exceed 4GB
        ]
        
        logging.debug(f"convert_s2_zip_to_cog: Running GDAL command: gdal_translate")
        oResult = subprocess.run(asCogCmd, capture_output=True, text=True)
        logging.debug(f"GDAL Output: {oResult.stdout}")

        if oResult.returncode != 0:
            raise Exception(f"GDAL Stack Error: {oResult.stderr}")
        
        logging.debug(f"convert_s2_zip_to_cog: COG created at {sOutputPath}")

    finally:
        # Clean up the temporary VRT file
        if os.path.exists(sVrtPath):
            os.remove(sVrtPath)
            
    return sOutputPath


def convert_s2_zip_to_cog_easy(sZipPath: str, sOutputPath: str):
    # 1. Now returns a FILE path, not a FOLDER path
    sInternalFile = find_s2_internal_path(sZipPath, sTarget="TCI")
    
    if not sInternalFile:
        raise Exception(f"Could not find TCI image inside {sZipPath}")

    sNormalizedZip = sZipPath.replace('\\', '/')
    sVsiPath = f"/vsizip/{sNormalizedZip}/{sInternalFile}"

    # 3. GDAL will now see a .jp2 file and be happy
    asCmd = [
        "gdal_translate",
        sVsiPath,
        sOutputPath,
        "-of", "COG",
        "-co", "COMPRESS=DEFLATE",
        "-co", "NUM_THREADS=ALL_CPUS"
    ]
    
    oProcessResult = subprocess.run(asCmd, capture_output=True, text=True)
    if oProcessResult.returncode != 0:
        raise Exception(f"GDAL Error: {oProcessResult.stderr}")
        
    return sOutputPath

async def handle_download_and_convert(oImageImport):

    oQueryExecutor = QueryExecutorCopernicusDataspace()

    # Asynch Download 
    sZipPath, sFootprint, sProductId = await oQueryExecutor.downloadProduct(
            sProductName = oImageImport.imageName,
            sDownloadLink = oImageImport.imageUrl,
            sPlatform = oImageImport.platform,
            sProjectId = oImageImport.projectId        
    )

    if not sZipPath:
        logging.error(f"ImageResource.handle_download_and_convert: Failed to download image {oImageImport.imageName} from {oImageImport.imageUrl}")
        return

    logging.debug(f"ImageResource.handle_download_and_convert: Downloaded image to {sZipPath}")
    
    # Convert
    oAsyncioRunningLoop = asyncio.get_running_loop()
    sCogPath = sZipPath.replace(".zip", "_COG.tif")
    
    logging.debug(f"ImageResource.handle_download_and_convert: Starting COG conversion for {sZipPath}")

    try:
        # This line is the key: it doesn't block the main FastAPI thread
        sPathToCOG = await oAsyncioRunningLoop.run_in_executor(s_oConversionPool, convert_s2_zip_to_cog, sZipPath, sCogPath)
        logging.debug(f"ImageResource.handle_download_and_convert: Conversion complete: {sCogPath}")

        oNow = datetime.now()
        oDatasetImage = DatasetImageEntity(
                projectId=oImageImport.projectId,
                fileName=os.path.basename(sPathToCOG),
                link=sPathToCOG,
                bandpaths="", # TODO: remove
                bbox=sFootprint,
                date=int(oNow.timestamp() * 1000)
            )
        oDB = SessionLocal()
        oDB.add(oDatasetImage)
        oDB.commit()
        oDB.refresh(oDatasetImage)

        await oWsManager.broadcastToProject(oImageImport.projectId, {
            "type": "import_completed",
            "productId": sProductId,
            "message": f"Image {oImageImport.imageName} successfully imported!",
            "messageType": "success"
        })

        # TODO: delete the s2 zip file
        
        # 3. Update TiTiler / Database
        # Here you update your catalog so TiTiler points to 'cog_path' instead of the .zip
    except Exception as oE:
        logging.error(f"ImageResource.handle_download_and_convert: Background processing failed: {oE}")



@oRouter.post("/import")
async def import_image(oImageImport: ImageImport, 
                       oDB: Session = Depends(get_db), 
                       response_model=ImageImport,
                       oCurrentUser: User = Depends(get_current_user)):
    """
    Import an image by its unique name.

    :param image_name: Unique name for the image to import
    :return: dict confirming the import of the image
    """
    try:

        bCanWrite = canWriteProject(oCurrentUser, oImageImport.projectId, oDB)
        if not bCanWrite:
            raise HTTPException(status_code=403, detail="User does not have write access to this project")

        # Schedule async task to run in background without blocking response
        asyncio.create_task(handle_download_and_convert(oImageImport))

        logging.debug(f"ImageResource.import_image: Scheduled background task to download image {oImageImport.imageName} for project {oImageImport.projectId}")
        return oImageImport 
        

    except Exception as oE:
        # oDB.rollback()  # Important: rollback on error
        raise HTTPException(status_code=500, detail=f'Error importing image: {str(oE)}')


@oRouter.get("/getListByProject/{project_id}", response_model=list[ProjectImageResponse])
async def getListByProject(project_id: str, oDB: Session = Depends(get_db),
                           oCurrentUser: User = Depends(get_current_user)):
    """
    Fetch all images associated with a specific project ID for the Editor.
    """
    try:
        bCanRead = canReadProject(oCurrentUser, project_id, oDB)
        if not bCanRead:
            raise HTTPException(status_code=403, detail="User does not have access to this project")

        aoImages = oDB.query(DatasetImageEntity).filter(DatasetImageEntity.projectId == project_id).all()

        oResult = []
        for oImg in aoImages:
            # Safely map the DB Entity to our new React-friendly ViewModel
            oResult.append(ProjectImageResponse(
                id=oImg.id,
                name=oImg.fileName or "Unknown Image",
                filename=oImg.fileName or "",
                date=oImg.date or 0,
                bbox=oImg.bbox,
                annotator="System"
            ))

        return oResult
    except Exception as oE:
        logging.error(f"Error fetching images for project {project_id}: {str(oE)}")
        raise HTTPException(status_code=500, detail=f"Error fetching images: {str(oE)}")

# TODO: not sure what does it mean
# NOTE: Probably not needed, is directly titler that provides images.
@oRouter.get("/get")
async def get(image_id: str = Query(..., description="Unique identifier for the image to retrieve"),
              project_id: str = Query(..., description="Project ID associated with the image"),
              oCurrentUser: User = Depends(get_current_user), oDB: Session = Depends(get_db)):
    """
    Retrieve details of a specific image.

    :param image_id: Unique identifier for the image to retrieve
    :param project_id: Project ID associated with the image
    :return: dict containing image details
    """
    try:
        bCanRead = canReadProject(oCurrentUser, project_id, oDB)
        if not bCanRead:
            raise HTTPException(status_code=403, detail="User does not have access to this project")

        i = 0
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error retrieving image: {str(oE)}')
    

@oRouter.delete("/remove")
async def delete(image_title: str = Query(..., description="Unique identifier for the image to delete"),
                 project_id: str = Query(..., description="Project ID associated with the image"),
                 oCurrentUser: User = Depends(get_current_user), oDB: Session = Depends(get_db)):
    """
    Delete a specific image from the project

    :param image_title: Unique identifier for the image to delete
    :param project_id: Project ID associated with the image
    :return: dict confirming deletion of the image
    """
    try:
        bCanWrite = canWriteProject(oCurrentUser, project_id, oDB)
        if not bCanWrite:
            raise HTTPException(status_code=403, detail="User does not have write access to this project")

        # todo
        return {
            "imageTitle": image_title
        }
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error deleting image: {str(oE)}')