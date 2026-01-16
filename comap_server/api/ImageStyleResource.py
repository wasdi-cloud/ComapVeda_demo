from fastapi import APIRouter, HTTPException, Query
from schemas.imagesStyle import ImageStyleItem



oRouter = APIRouter(prefix="/imagestyle")


oRouter.get("/add")
async def add(oImageStyleData: ImageStyleItem):
    """
    Add a new image style.
    
    :param oImageStyleData: dict containing image style data
    :return: ImageStyleItem containing imageStyleId of the newly created image style
    """
    try:
        # The ImageStyleItem validator has already validated the input
        # Convert to dict for storage/processing
        dImageStyleDict = oImageStyleData.model_dump()

        return {
            "imageStyleId": "imagestyle-1111-2222"
        }
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error adding image style: {str(oE)}')
    

oRouter.put("/update")
async def update(oImageStyleData: ImageStyleItem):
    """
    Update an existing image style.
    
    :param oImageStyleData: dict containing updated image style data
    :return: ImageStyleItem containing imageStyleId of the updated image style
    """
    try:
        # The ImageStyleItem validator has already validated the input
        # Convert to dict for storage/processing
        dImageStyleDict = oImageStyleData.model_dump()

        return {
            "imageStyleId": "imagestyle-1111-2222"
        }
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error updating image style: {str(oE)}')
    

oRouter.get("/get")
async def get(image_style_id: str = Query(..., description="Unique identifier for the image style")):
    """
    Retrieve an existing image style by its ID.
    
    :param image_style_id: Unique identifier for the image style
    :return: ImageStyleItem containing image style data
    """
    try:
        # Simulate retrieving image style data from a database or storage
        return {
            "imageStyleId": "image_style_id",
            "projectId": "project-1234",
            "imageName": "sample_image.png",
            "renderType": "RGB",
            "singleBand": None,
            "multiBand": {
                "redBand": "band1",
                "greenBand": "band2",
                "blueBand": "band3"
            },
            "brightness": 1.0,
            "contrast": 1.0,
            "hue": 0.0,
            "saturation": 1.0,
            "lightness": 1.0,
            "autoLevel": "linear"
        }
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error retrieving image style: {str(oE)}')