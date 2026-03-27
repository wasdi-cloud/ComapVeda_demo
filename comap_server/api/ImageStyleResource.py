from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session

from database import get_db
from entities.ImageStyle import ImageStyleEntity
# Import your Pydantic model
from viewmodels.imagesStyle import ImageStyleItem
from entities.User import User
from utils.auth_utils import get_current_user
from utils.auth_utils import canReadProject
from utils.auth_utils import canWriteProject

oRouter = APIRouter(prefix="/imagestyle")


# --- 1. ADD IMAGE STYLE ---
@oRouter.post("/add")  
async def add(
        oImageStyleData: ImageStyleItem,
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    """
    Add a new image style.
    Enforces One-to-One rule: If a style already exists for this project, it fails or updates.
    """
    try:
        bCanWrite = canWriteProject(oCurrentUser, oImageStyleData.projectId, oDB)
        if not bCanWrite:
            raise HTTPException(status_code=403, detail="User does not have write access to this project")

        # 1. Check if style already exists for this project (One-to-One constraint)
        # We assume oImageStyleData has a 'projectId' field
        oExistingStyle = oDB.query(ImageStyleEntity).filter(
            ImageStyleEntity.projectId == oImageStyleData.projectId
        ).first()

        if oExistingStyle:
            raise HTTPException(status_code=400,
                                detail="Image Style already exists for this project. Use Update instead.")

        # 2. Extract Band Logic (Frontend Nested -> Backend Flat)
        # Assuming oImageStyleData.multiBand is a Pydantic model or dict
        oBand1 = None
        oBand2 = None
        oBand3 = None

        # Safe access to nested multiband data
        if oImageStyleData.multiBand:
            # Handle if it's a dict or object
            aoMultiBands = oImageStyleData.multiBand
            oBand1 = aoMultiBands.get('redBand') if isinstance(aoMultiBands, dict) else getattr(aoMultiBands, 'redBand', None)
            oBand2 = aoMultiBands.get('greenBand') if isinstance(aoMultiBands, dict) else getattr(aoMultiBands, 'greenBand', None)
            oBand3 = aoMultiBands.get('blueBand') if isinstance(aoMultiBands, dict) else getattr(aoMultiBands, 'blueBand', None)

        # 3. Create Entity
        oNewStyle = ImageStyleEntity(
            projectId=oImageStyleData.projectId,
            singleBand=(oImageStyleData.renderType != "RGB"),  # Infer bool from renderType
            band1=oBand1,
            band2=oBand2,
            band3=oBand3,
            brightness=oImageStyleData.brightness,
            contrast=oImageStyleData.contrast,
            hue=oImageStyleData.hue,
            saturation=oImageStyleData.saturation,
            lightness=oImageStyleData.lightness,
            # Map "linear" -> True, "none" -> False if needed
            autoLevel=(oImageStyleData.autoLevel == "linear"),
            saturateLevel=False,  # Default or add to input model
            saturationValue=0
        )

        oDB.add(oNewStyle)
        oDB.commit()
        oDB.refresh(oNewStyle)

        return {"imageStyleId": oNewStyle.id}

    except HTTPException:
        raise
    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error adding image style: {str(oE)}')


# --- 2. UPDATE IMAGE STYLE ---
@oRouter.put("/update")
async def update(
        oImageStyleData: ImageStyleItem,
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    """
    Update an existing image oStyle.
    """
    try:
        bCanWrite = canWriteProject(oCurrentUser, oImageStyleData.projectId, oDB)
        if not bCanWrite:
            raise HTTPException(status_code=403, detail="User does not have write access to this project")

        # Find by ID (preferred) or ProjectID
        # oImageStyleData must have either imageStyleId or projectId
        oStyle = None
        if hasattr(oImageStyleData, 'imageStyleId') and oImageStyleData.imageStyleId:
            oStyle = oDB.query(ImageStyleEntity).filter(ImageStyleEntity.id == oImageStyleData.imageStyleId).first()
        elif hasattr(oImageStyleData, 'projectId') and oImageStyleData.projectId:
            oStyle = oDB.query(ImageStyleEntity).filter(ImageStyleEntity.projectId == oImageStyleData.projectId).first()

        if not oStyle:
            raise HTTPException(status_code=404, detail="Image Style not found")

        # Extract Bands again
        sBand1, sBand2, sBand3 = None, None, None
        if oImageStyleData.multiBand:
            mb = oImageStyleData.multiBand
            sBand1 = mb.get('redBand') if isinstance(mb, dict) else getattr(mb, 'redBand', None)
            sBand2 = mb.get('greenBand') if isinstance(mb, dict) else getattr(mb, 'greenBand', None)
            sBand3 = mb.get('blueBand') if isinstance(mb, dict) else getattr(mb, 'blueBand', None)

        # Update Fields
        oStyle.singleBand = (oImageStyleData.renderType != "RGB")
        oStyle.band1 = sBand1
        oStyle.band2 = sBand2
        oStyle.band3 = sBand3
        oStyle.brightness = oImageStyleData.brightness
        oStyle.contrast = oImageStyleData.contrast
        oStyle.hue = oImageStyleData.hue
        oStyle.saturation = oImageStyleData.saturation
        oStyle.lightness = oImageStyleData.lightness
        oStyle.autoLevel = (oImageStyleData.autoLevel == "linear")

        oDB.commit()

        return {"imageStyleId": oStyle.id, "status": "updated"}

    except HTTPException:
        raise
    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error updating image oStyle: {str(oE)}')


# --- 3. GET IMAGE STYLE ---
@oRouter.get("/get")
async def get(
        sImageStyleId: str = Query(..., description="Unique identifier for the image oStyle"),
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    """
    Retrieve an existing image oStyle by its ID.
    Maps Flat DB columns -> Nested Frontend JSON.
    """
    try:
        
        oStyle = oDB.query(ImageStyleEntity).filter(ImageStyleEntity.id == sImageStyleId).first()

        if not oStyle:
            raise HTTPException(status_code=404, detail="Image Style not found")
        
        bCanRead = canReadProject(oCurrentUser, oStyle.projectId, oDB)
        if not bCanRead:
            raise HTTPException(status_code=403, detail="User does not have access to this project")

        # Construct the nested response manually to match frontend expectations
        return {
            "imageStyleId": oStyle.id,
            "projectId": oStyle.projectId,
            "imageName": "sample_image.png",  # DB doesn't store this, keeping mock or fetch from Project
            "renderType": "SingleBand" if oStyle.singleBand else "RGB",
            "singleBand": oStyle.band1 if oStyle.singleBand else None,  # Return band name if single
            "multiBand": {
                "redBand": oStyle.band1,
                "greenBand": oStyle.band2,
                "blueBand": oStyle.band3
            } if not oStyle.singleBand else None,
            "brightness": oStyle.brightness,
            "contrast": oStyle.contrast,
            "hue": oStyle.hue,
            "saturation": oStyle.saturation,
            "lightness": oStyle.lightness,
            "autoLevel": "linear" if oStyle.autoLevel else "none"
        }

    except HTTPException:
        raise
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error retrieving image oStyle: {str(oE)}')
