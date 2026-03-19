import logging

from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from comap_server.dataproviders.copernicus_dataspace import S2GeoTIFFTranslator
from comap_server.entities import DatasetProject
from dataproviders.copernicus_dataspace.QueryExecutorCopernicusDataspace import QueryExecutorCopernicusDataspace
from database import get_db

from viewmodels.search.SearchQueryParameters import SearchQueryParameters
from viewmodels.images.SearchResultItem import SearchResultItem
from entities.DatasetImage import DatasetImageEntity
from entities.DatasetProject import DatasetProjectEntity
from viewmodels.images.ProjectImageItem import ProjectImageResponse
from viewmodels.images.SearchImageItem import SearchImageItem
from viewmodels.images.ImageImport import ImageImport


oRouter = APIRouter(prefix="/images")


# TODO: add response model
@oRouter.get("/search", response_model=list[SearchResultItem])
async def search(bbox: str = Query(..., description="Bounding box coordinates in WKT format"),
                 start_date: str = Query(..., description="Start date with YYYY-MM-DD) format"),
                 end_date: str = Query(..., description="End date with YYYY-MM-DD format"),
                 platform: str = Query(None, description="Satellite platform to search for"),
                 product_level: str = Query(None, description="Product level to search for"),
                 max_cloud_cover: float = Query(0.0, description="Maximum cloud cover percentage")):
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

        # TODO: here we probably miss all the checks about user permissions.

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



@oRouter.post("/import")
async def import_image(oImageImport: ImageImport, oDB: Session = Depends(get_db), response_model=ImageImport):
    """
    Import an image by its unique name.

    :param image_name: Unique name for the image to import
    :return: dict confirming the import of the image
    """
    try:
        # TODO: verify that the project ID exists and that the user has permissions to add images to it
        oProject = oDB.query(DatasetProject).filter(DatasetProject.id == oImageImport.projectId).first()
        if not oProject:
            raise HTTPException(status_code=404, detail=f'Project with ID {oImageImport.projectId} not found')

        oQueryExecutor = QueryExecutorCopernicusDataspace()
        sDownloadedFilePath = oQueryExecutor.downloadProduct(
            sProductName = oImageImport.imageName,
            sDownloadLink = oImageImport.imageUrl,
            sPlatform = oImageImport.platform,
            sProjectId = oImageImport.projectId
        )
        if sDownloadedFilePath is None:
            raise HTTPException(status_code=500, detail=f'Failed to download image from {oImageImport.imageUrl}')
        
        logging.debug(f"ImageResource.import_image: Image downloaded successfully to {sDownloadedFilePath}")

        if not sDownloadedFilePath.endswith(".SAFE.zip"):
            raise HTTPException(status_code=500, detail=f'Unexpected file format for downloaded image: {sDownloadedFilePath}')
        
        # return sDownloadedFilePath
        logging.debug(f"ImageResource.import_image: converting image to GeoTIFF")

        sOutputGeoTIFFPath = sDownloadedFilePath.removesuffix(".SAFE.zip") + ".tif"

        asBandSuffixes = [
        "B01", "B02", "B03", "B04", "B05", "B06", 
        "B07", "B08", "B8A", "B09", "B11", "B12"
        ]

        sOutputFilePath = S2GeoTIFFTranslator.getGeoTiff(
            sZipPath = sDownloadedFilePath, 
            sGeoTIFFOutputPath = sOutputGeoTIFFPath,
            asTargetBandSuffixes = asBandSuffixes
        )

        if sOutputFilePath is None:
            raise HTTPException(status_code=500, detail=f'Failed to convert image to GeoTIFF format.')
        
        logging.debug(f"ImageResource.import_image: Image converted to GeoTIFF successfully at {sOutputFilePath}")

        # now we need to store the image in the database
        oDatasetImage = DatasetImageEntity(
            projectId=oImageImport.projectId,
            fileName=oImageImport.imageName,  # or extract from the downloaded file
            link=oImageImport.imageUrl,
            # bbox=...  # You may need to extract this from the GeoTIFF metadata
            # date=...  # You may need to extract this from the image metadata
        )
        
        oDB.add(oDatasetImage)
        oDB.commit()
        oDB.refresh(oDatasetImage)  # Optional: refresh to get the generated ID
        
        logging.debug(f"ImageResource.import_image: Image stored in database with ID: {oDatasetImage.id}")
        
        return oImageImport  # TODO: or return the created entity details

    except Exception as oE:
        oDB.rollback()  # Important: rollback on error
        raise HTTPException(status_code=500, detail=f'Error importing image: {str(oE)}')


@oRouter.get("/getListByProject/{project_id}", response_model=list[ProjectImageResponse])
async def getListByProject(project_id: str, oDB: Session = Depends(get_db)):
    """
    Fetch all images associated with a specific project ID for the Editor.
    """
    try:
        aoImages = oDB.query(DatasetImageEntity).filter(DatasetImageEntity.projectId == project_id).all()

        oResult = []
        for img in aoImages:
            # Safely map the DB Entity to our new React-friendly ViewModel
            oResult.append(ProjectImageResponse(
                id=img.id,
                name=img.fileName or "Unknown Image",
                filename=img.fileName or "",
                date=img.date or 0,
                bbox=img.bbox,
                annotator="System"
            ))

        return oResult
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching images: {str(e)}")


# @oRouter.get("/getListByProject", response_model=list[ImageItem])
# async def getListByProject(project_id: str = Query(..., description="Project ID to list images for")):
#     """
#     Retrieve all images associated with a specific project.
#
#     :param project_id: Project ID to list images for
#     :return: dict containing list of image IDs associated with the project
#     """
#     try:
#         # todo
#         return [
#             {
#                 "title": "s2_image_001",
#                 "footprint": "POLYGON((...))",
#                 "startDate": 1678886400000,
#                 "endDate": 1678972800000,
#                 "platform": "Sentinel-2",
#                 "productType": "S2MSI2A",
#                 "productLevel": "L2A",
#                 "cloudCover": 12.5,
#                 "bands": ["B2", "B3", "B4", "B8"]
#             },
#             {
#                 "title": "s2_image_002",
#                 "footprint": "POLYGON((...))",
#                 "startDate": 1678972800000,
#                 "endDate": 1679059200000,
#                 "platform": "Sentinel-2",
#                 "productType": "S2MSI2A",
#                 "productLevel": "L2A",
#                 "cloudCover": 8.0,
#                 "bands": ["B2", "B3", "B4", "B8"]
#             }
#         ]
#     except Exception as oE:
#         raise HTTPException(status_code=500, detail=f'Error retrieving images for project: {str(oE)}')
#

# TODO: not sure what does it mean
@oRouter.get("/get")
async def get(image_id: str = Query(..., description="Unique identifier for the image to retrieve"),
              project_id: str = Query(..., description="Project ID associated with the image")):
    """
    Retrieve details of a specific image.

    :param image_id: Unique identifier for the image to retrieve
    :param project_id: Project ID associated with the image
    :return: dict containing image details
    """
    try:
        # todo
        i = 0
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error retrieving image: {str(oE)}')
    

@oRouter.delete("/remove")
async def delete(image_title: str = Query(..., description="Unique identifier for the image to delete"),
                 project_id: str = Query(..., description="Project ID associated with the image")):
    """
    Delete a specific image from the project

    :param image_title: Unique identifier for the image to delete
    :param project_id: Project ID associated with the image
    :return: dict confirming deletion of the image
    """
    try:
        # todo
        return {
            "imageTitle": image_title
        }
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error deleting image: {str(oE)}')