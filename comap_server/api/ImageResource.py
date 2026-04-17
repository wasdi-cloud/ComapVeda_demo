import logging
import asyncio
from datetime import datetime
import os
import os
import subprocess
import zipfile

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from dataproviders.copernicus_dataspace.QueryExecutorCopernicusDataspace import QueryExecutorCopernicusDataspace
from database import get_db
from concurrent.futures import ProcessPoolExecutor

from viewmodels.search.SearchQueryParameters import SearchQueryParameters
from viewmodels.images.SearchResultItem import SearchResultItem
from entities.DatasetImage import DatasetImageEntity
from viewmodels.images.ProjectImageItem import ProjectImageResponse
from viewmodels.images.ImageImport import ImageImport
from entities.User import User
from utils.auth_utils import get_current_user
from utils.auth_utils import canReadProject
from utils.auth_utils import canWriteProject

oRouter = APIRouter(prefix="/images")

# Global process pool (set max_workers based on your CPU cores)
s_oConversionPool = ProcessPoolExecutor(max_workers=4)

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
    
    import zipfile

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
    sZipPath = await oQueryExecutor.downloadProduct(
            sProductName = oImageImport.imageName,
            sDownloadLink = oImageImport.imageUrl,
            sPlatform = oImageImport.platform,
            sProjectId = oImageImport.projectId        
    )

    if not sZipPath:
        logging.error(f"ImageResource.handle_download_and_convert: Failed to download image {oImageImport.imageName} from {oImageImport.imageUrl}")
        return
    
    # Convert
    oAsyncioRunningLoop = asyncio.get_running_loop()
    sCogPath = sZipPath.replace(".zip", "_COG.tif")
    
    logging.info(f"ImageResource.handle_download_and_convert: Starting COG conversion for {sZipPath}")
    try:
        # This line is the key: it doesn't block the main FastAPI thread
        await oAsyncioRunningLoop.run_in_executor(s_oConversionPool, convert_s2_zip_to_cog, sZipPath, sCogPath)
        logging.info(f"ImageResource.handle_download_and_convert: Conversion complete: {sCogPath}")
        
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