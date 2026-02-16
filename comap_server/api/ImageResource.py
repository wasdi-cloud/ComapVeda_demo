from fastapi import APIRouter, HTTPException, Query
from viewmodels.images.ImageItem import ImageItem
from viewmodels.images.ImageImport import ImageImport


oRouter = APIRouter(prefix="/images")


# TODO: add response model
@oRouter.get("/search", response_model=ImageItem)
async def search(bbox: str = Query(..., description="Bounding box coordinates in WKT format"),
                 start_date: str = Query(..., description="Start date with YYYY-MM-DD) format"),
                 end_date: str = Query(..., description="End date with YYYY-MM-DD format"),
                 platform: str = Query(None, description="Satellite platform to search for"),
                 product_type: str = Query(None, description="Type of product to search for"),
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
        # todo
        i = 0
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error processing template data: {str(oE)}')


@oRouter.post("/import")
async def import_image(oImageImport: ImageImport):
    """
    Import an image by its unique name.

    :param image_name: Unique name for the image to import
    :return: dict confirming the import of the image
    """
    try:
        # todo
        i = 0
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error importing image: {str(oE)}')
    

@oRouter.get("/getListByProject", response_model=list[ImageItem])
async def getListByProject(project_id: str = Query(..., description="Project ID to list images for")):
    """
    Retrieve all images associated with a specific project.

    :param project_id: Project ID to list images for
    :return: dict containing list of image IDs associated with the project
    """
    try:
        # todo
        return [
            {
                "title": "s2_image_001",
                "footprint": "POLYGON((...))",
                "startDate": 1678886400000,
                "endDate": 1678972800000,
                "platform": "Sentinel-2",
                "productType": "S2MSI2A",
                "productLevel": "L2A",
                "cloudCover": 12.5,
                "bands": ["B2", "B3", "B4", "B8"]
            },
            {
                "title": "s2_image_002",
                "footprint": "POLYGON((...))",
                "startDate": 1678972800000,
                "endDate": 1679059200000,
                "platform": "Sentinel-2",
                "productType": "S2MSI2A",
                "productLevel": "L2A",
                "cloudCover": 8.0,
                "bands": ["B2", "B3", "B4", "B8"]
            }
        ]
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error retrieving images for project: {str(oE)}')
    

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