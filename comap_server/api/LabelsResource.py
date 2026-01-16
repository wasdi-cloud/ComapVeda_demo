from fastapi import APIRouter, HTTPException, Query

from schemas.labels.LabelItem import LabelItem


oRouter = APIRouter(prefix="/labels")

@oRouter.get("/getByImage", response_model=list[LabelItem])
async def getByImage(
    project_id: str = Query(..., description="Unique identifier for the project"),
    image_name: str = Query(..., description="Unique identifier for the image")):

    """
    Retrieve labels associated with a specific image within a project.  
    :param project_id: Unique identifier for the project
    :param image_name: Unique identifier for the image
    """
    try:
        return [
            {
                "labelId": "label-1234",
                "imageName": image_name,
                "geometryType": "Polygon",
                "coordinates": [[[30.0, 10.0], [40.0, 40.0], [20.0, 40.0], [10.0, 20.0], [30.0, 10.0]]],
                "attributes":
                [
                    {"name": "name_1",
                     "value": "value_1",
                     "waitingForReview": False
                    }
                ]
            }
        ]
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error retrieving labels: {str(oE)}')
    

@oRouter.post("/add")
async def addLabel(oLabelData: LabelItem):

    """
    Add a new label to an image.

    :param oLabelData: LabelItem validator containing label fields
    :return: dict indicating success or failure of the add operation
    """
    try:
        # The LabelItem validator has already validated the input
        # Convert to dict for storage/processing
        dLabelDict = oLabelData.model_dump()

        return {
            "labelId": "label-1234"
        }
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error adding label: {str(oE)}')
    

@oRouter.put("/edit")
async def editLabel(oLabelData: LabelItem):

    """
    Edit an existing label with validated data.

    :param oLabelData: LabelItem validator containing label fields
    :return: dict indicating success or failure of the edit operation
    """
    try:
        # The LabelItem validator has already validated the input
        # Convert to dict for storage/processing
        dLabelDict = oLabelData.model_dump()

        return {
            "labelId": "label-1234"
        }
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error editing label: {str(oE)}')
    
@oRouter.delete("/delete")
async def deleteLabel(
        project_id: str = Query(..., description="Unique identifier for the project"),
        image_name: str = Query(..., description="Unique identifier for the image"),
        label_id: str = Query(..., description="Unique identifier for the label to delete")):
    """
    Delete an existing label.

    :param label_id: Unique identifier for the label to delete
    :return: dict indicating success or failure of the delete operation
    """
    try:
        return {
            "labelId": label_id
        }
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error deleting label: {str(oE)}')
    

@oRouter.get("/approve")
async def approveLabel(
        project_id: str = Query(..., description="Unique identifier for the project"),
        image_name: str = Query(..., description="Unique identifier for the image"),
        label_id: str = Query(..., description="Unique identifier for the label to approve")):
    """
    Approve a label.

    :param label_id: Unique identifier for the label to approve
    :return: dict indicating success or failure of the approve operation
    """
    try:
        return {
            "labelId": label_id,
            "status": "approved"
        }
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error approving label: {str(oE)}')
    

@oRouter.get("/reject")
async def rejectLabel(
        project_id: str = Query(..., description="Unique identifier for the project"),
        image_name: str = Query(..., description="Unique identifier for the image"),
        label_id: str = Query(..., description="Unique identifier for the label to reject")):
    """
    Reject a label.

    :param label_id: Unique identifier for the label to reject
    :return: dict indicating success or failure of the reject operation
    """
    try:
        return {
            "labelId": label_id,
            "status": "rejected"
        }
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error rejecting label: {str(oE)}')