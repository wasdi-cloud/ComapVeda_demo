import logging

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session

from database import get_db
from entities.LabellingTemplate import LabellingTemplateEntity
from viewmodels.templates.LabellingTemplateViewModel import LabellingTemplateViewModel
from viewmodels.templates.TemplateListItem import TemplateListItem

from utils.auth_utils import canWriteTemplate, get_current_user
from entities.User import User

oRouter = APIRouter(prefix="/templates")

logger = logging.getLogger(__name__)


# --- 1. CREATE ---
@oRouter.post("/create")
async def create(
        oTemplateData: LabellingTemplateViewModel,
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        oData = oTemplateData.model_dump()

        oNewtemplate = LabellingTemplateEntity(
            name=oData['name'],
            creator=oCurrentUser.email,
            description=oData['description'],
            creationDate=oData['creationDate'],

            # --- MAP GEOMETRY Bools ---
            hasPolygons=('polygon' in oData['geometryTypes']),
            hasMultiPolygons=('multipolygon' in oData['geometryTypes']),  # <-- NEW
            hasLines=('polyline' in oData['geometryTypes']),
            hasPoints=('point' in oData['geometryTypes']),

            # --- MAP STYLING Bools ---
            isFixedColorStyle=oData['isSingleColorStyle'],
            fixedColor=oData['featureColor'],
            colourAttributeName=oData['colourAttributeName'],

            # --- MAP INTERSECTION Bools ---
            isSelfIntersectAllowed=oData['isSelfIntersectAllowed'],  # <-- NEW
            isPolygonsIntersectAllowed=oData['isPolygonsIntersectAllowed'],  # <-- NEW

            attributes=[attr for attr in oData['attributes']]
        )

        oDB.add(oNewtemplate)
        oDB.commit()
        oDB.refresh(oNewtemplate)

        return {
            "templateId": oNewtemplate.id,
            "status": "created"
        }

    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error creating template: {str(oE)}')


# --- GET LIST ---
@oRouter.get("/getList", response_model=list[TemplateListItem])
async def getList(
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        aoTemplates = oDB.query(LabellingTemplateEntity).all()
        oTemplateItemList = []
        for t in aoTemplates:
            oTemplateItemList.append({
                "templateId": t.id,
                "name": t.name,
                "user": t.creator,
                "creationDate": t.creationDate or 0
            })
        return oTemplateItemList
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error retrieving templates: {str(oE)}')


# --- 2. UPDATE ---
@oRouter.put("/update")
async def update(
        oTemplateData: LabellingTemplateViewModel,
        sTemplateId: str = Query(..., description="Unique identifier for the template"),
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        bCanWrite = canWriteTemplate(oCurrentUser, sTemplateId, oDB)
        if not bCanWrite:
            raise HTTPException(status_code=403, detail="User does not have write access to this template")

        oTemplate = oDB.query(LabellingTemplateEntity).filter(LabellingTemplateEntity.id == sTemplateId).first()

        if not oTemplate:
            raise HTTPException(status_code=404, detail="Template not found")

        # --- FIX: Explicit mapping so ViewModel names match Entity columns correctly ---
        oData = oTemplateData.model_dump()

        oTemplate.name = oData['name']
        oTemplate.description = oData['description']
        oTemplate.hasPolygons = ('polygon' in oData['geometryTypes'])
        oTemplate.hasMultiPolygons = ('multipolygon' in oData['geometryTypes'])
        oTemplate.hasLines = ('polyline' in oData['geometryTypes'])
        oTemplate.hasPoints = ('point' in oData['geometryTypes'])
        oTemplate.isFixedColorStyle = oData['isSingleColorStyle']
        oTemplate.fixedColor = oData['featureColor']
        oTemplate.colourAttributeName = oData['colourAttributeName']
        oTemplate.isSelfIntersectAllowed = oData['isSelfIntersectAllowed']
        oTemplate.isPolygonsIntersectAllowed = oData['isPolygonsIntersectAllowed']
        oTemplate.attributes = [attr for attr in oData['attributes']]

        oDB.commit()
        oDB.refresh(oTemplate)

        return {"templateId": oTemplate.id, "status": "updated"}

    except HTTPException:
        raise
    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error updating template: {str(oE)}')


# --- 3. DELETE ---
@oRouter.delete("/delete")
async def delete(
        sTemplateId: str = Query(..., description="Unique identifier for the template"),
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        bCanWrite = canWriteTemplate(oCurrentUser, sTemplateId, oDB)
        if not bCanWrite:
            raise HTTPException(status_code=403, detail="User does not have write access to this template")

        oTemplate = oDB.query(LabellingTemplateEntity).filter(LabellingTemplateEntity.id == sTemplateId).first()

        if not oTemplate:
            raise HTTPException(status_code=404, detail="Template not found")

        oDB.delete(oTemplate)
        oDB.commit()

        return {"templateId": sTemplateId, "status": "deleted"}

    except HTTPException:
        raise
    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error deleting template: {str(oE)}')


# --- 4. GET BY PROJECT ---
@oRouter.get("/getByProject", response_model=LabellingTemplateViewModel)
async def getByProject(
        project_id: str = Query(..., description="Unique identifier for the project"),
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        oTemplate = oDB.query(LabellingTemplateEntity).filter(LabellingTemplateEntity.projectId == project_id).first()
        if not oTemplate:
            raise HTTPException(status_code=404, detail="Template not found for this project")

        # Re-use the same mapping logic from getById below if you ever use this endpoint!
        # (Assuming you don't use this one often, but you should map it similarly if needed)
        return oTemplate
    except HTTPException:
        raise
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error retrieving template: {str(oE)}')


# --- 5. GET ATTRIBUTES ---
@oRouter.get("/getAttributes")
async def getAttributes(
        sTemplateId: str = Query(..., description="Unique identifier for the template"),
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        oTemplate = oDB.query(LabellingTemplateEntity).filter(LabellingTemplateEntity.id == sTemplateId).first()
        if not oTemplate:
            raise HTTPException(status_code=404, detail="Template not found")
        return oTemplate.attributes

    except HTTPException:
        raise
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error retrieving attributes: {str(oE)}')


# --- 6. GET BY ID ---
@oRouter.get("/getById", response_model=LabellingTemplateViewModel)
async def getByID(
        template_id: str = Query(..., description="Unique identifier for the template"),
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        oTemplate = oDB.query(LabellingTemplateEntity).filter(LabellingTemplateEntity.id == template_id).first()

        if not oTemplate:
            raise HTTPException(status_code=404, detail="Template not found for this id")

        # --- Reconstruct the geometryTypes list ---
        asGeomTypes = []
        if oTemplate.hasPolygons: asGeomTypes.append("polygon")
        if getattr(oTemplate, "hasMultiPolygons", False): asGeomTypes.append("multipolygon")  # Safe fallback
        if oTemplate.hasLines: asGeomTypes.append("polyline")
        if oTemplate.hasPoints: asGeomTypes.append("point")

        return LabellingTemplateViewModel(
            name=oTemplate.name,
            creator=oTemplate.creator,
            description=oTemplate.description,
            geometryTypes=asGeomTypes,
            attributes=oTemplate.attributes if oTemplate.attributes else [],
            isSingleColorStyle=oTemplate.isFixedColorStyle,
            featureColor=oTemplate.fixedColor,
            colourAttributeName=oTemplate.colourAttributeName,

            # --- FIX: PACK THE NEW FIELDS SO PYDANTIC DOES NOT CRASH ---
            # Cast to bool() just in case the legacy data is None
            isSelfIntersectAllowed=bool(oTemplate.isSelfIntersectAllowed),
            isPolygonsIntersectAllowed=bool(oTemplate.isPolygonsIntersectAllowed),

            creationDate=oTemplate.creationDate
        )

    except HTTPException:
        raise
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error retrieving template: {str(oE)}')