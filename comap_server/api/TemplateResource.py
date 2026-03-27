from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session

from database import get_db
from entities.LabellingTemplate import LabellingTemplateEntity
from viewmodels.templates.LabellingTemplateViewModel import LabellingTemplateViewModel
from viewmodels.templates.TemplateListItem import TemplateListItem

from utils.auth_utils import canWriteTemplate, get_current_user
from entities.User import User

oRouter = APIRouter(prefix="/templates")

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
            # SECURITY UPGRADE: Ignore frontend 'creator', use actual logged-in user!
            creator=oCurrentUser.email,
            description=oData['description'],
            creationDate=oData['creationDate'],
            hasPolygons=('polygon' in oData['geometryTypes']),
            hasLines=('polyline' in oData['geometryTypes']),
            hasPoints=('point' in oData['geometryTypes']),
            isFixedColorStyle=oData['isSingleColorStyle'],
            fixedColor=oData['featureColor'],
            colourAttributeName=oData['colourAttributeName'],
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

        # OPTIONAL SECURITY: Check if current_user.email == oTemplate.creator to ensure they own it!

        oUpdateData = oTemplateData.model_dump()
        for key, value in oUpdateData.items():
            setattr(oTemplate, key, value)

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
        return oTemplate
    except HTTPException:
        raise
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error retrieving template: {str(oE)}')


# --- 5. GET ATTRIBUTES ---
@oRouter.get("/getAttributes")
async def getAttributes(
        sTemplateId: str= Query(..., description="Unique identifier for the template"),
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

        asGeomTypes = []
        if oTemplate.hasPolygons: asGeomTypes.append("polygon")
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
            creationDate=oTemplate.creationDate
        )

    except HTTPException:
        raise
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error retrieving template: {str(oE)}')