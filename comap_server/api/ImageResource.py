from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session

from viewmodels.images.SearchResultItem import SearchResultItem
from database import get_db
from entities.DatasetImage import DatasetImageEntity
from entities.DatasetProject import DatasetProjectEntity
from viewmodels.images.ImageItem import ImageItem
from viewmodels.images.ImageImport import ImageImport


oRouter = APIRouter(prefix="/images")


# TODO: add response model
@oRouter.get("/search", response_model=list[SearchResultItem])
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
        oResults = []

        oItem1 = SearchResultItem(
            title="S2C_MSIL1C_20260304T102921_N0512_R108_T32TMR_20260304T140806",
            id = "180b33ba-3be1-4d5b-b864-25de076b6b4b",
            link = "https://zipper.creodias.eu/odata/v1/Products(180b33ba-3be1-4d5b-b864-25de076b6b4b)/$value",
            footprint= "POLYGON ((8.882253959239932 46.05225955358549, 7.706951084723532 46.0462596089832, 7.729416423067862 45.058191670236305, 8.469916935283441 45.06190917118712, 8.485059196314161 45.09861670033944, 8.487631380638613 45.104856267978775, 8.488215547780069 45.106268256683286, 8.488987956252917 45.108140711957766, 8.490854378861282 45.1126465676415, 8.547846107201718 45.25040110903268, 8.608218819819822 45.39590425011436, 8.668705527519169 45.54138664599366, 8.729217438988133 45.68682741753341, 8.789848807141269 45.83221827126314, 8.803703002987273 45.86502177746246, 8.852404999791245 45.980822232539296, 8.87117159388612 46.02557410463011, 8.882253959239932 46.05225955358549))",
            date = "2026-03-04T10:29:21.025000Z",
            startDate =  "2026-03-04T10:29:21.025000Z",
            endDate = "2026-03-04T10:29:21.025000Z",
            platform = "Sentinel-2C",
            productType = "S2MSI1C",
            productLevel = "S2MSI1C",
            instrument = "MSI",
            sensorOperationalMode = "INS-NOBS",
            cloudCover = 63.383160184512,
            orbitNumber = 7800,
            relativeOrbitNumber = 108,
            size = "544.43 MB"
        )

        oItem2 =  SearchResultItem(
            title="S2C_MSIL1C_20260304T102921_N0512_R108_T32TLR_20260304T140806",
            id = "56407d80-90c3-4fc9-9910-c07e937f54df",
            link = "https://zipper.creodias.eu/odata/v1/Products(56407d80-90c3-4fc9-9910-c07e937f54df)/$value",
            footprint= "POLYGON ((6.41593487960282 46.02435339629007, 6.460785793001177 45.037023116804335, 7.854365464520267 45.05951360004942, 7.834108089722306 46.0476276229589, 6.41593487960282 46.02435339629007))",
            date = "2026-03-04T10:29:21.025000Z",
            startDate =  "2026-03-04T10:29:21.025000Z",
            endDate = "2026-03-04T10:29:21.025000Z",
            platform = "Sentinel-2C",
            productType = "S2MSI1C",
            productLevel = "S2MSI1C",
            instrument = "MSI",
            sensorOperationalMode = "INS-NOBS",
            cloudCover = 63.383160184512,
            orbitNumber = 7800,
            relativeOrbitNumber = 108,
            size = "853.02 MB"
        )  

        oResults.append(oItem1)
        oResults.append(oItem2)

        return oResults

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