from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session

from database import get_db
from entities.LabellingTemplate import LabellingTemplateEntity
from viewmodels.templates.LabellingTemplate import LabellingTemplate
from viewmodels.templates.TemplateListItem import TemplateListItem

oRouter = APIRouter(prefix="/templates")

@oRouter.post("/create")
async def create(
        oTemplateData: LabellingTemplate,
        oDB: Session = Depends(get_db)  # <--- Inject the DB here
):
    """
    Create a new template with validated data.
    """
    try:
        # 1. Create the Entity from the Pydantic model
        # We can use **model_dump() to unpack the data because names match
        oNewtemplate = LabellingTemplateEntity(
            **oTemplateData.model_dump()
        )

        # 2. Add to DB
        oDB.add(oNewtemplate)
        oDB.commit()

        # 3. Refresh to get the auto-generated ID
        oDB.refresh(oNewtemplate)

        return {
            "templateId": oNewtemplate.id,  # Returns the real DB ID
            "status": "created"
        }

    except Exception as oE:
        # Rollback in case of error so the DB isn't stuck
        oDB.rollback()
        print(f"Error: {oE}")  # Print to console for debugging
        raise HTTPException(status_code=500, detail=f'Error creating template: {str(oE)}')


# --- 1. GET LIST ---
@oRouter.get("/getList",response_model=list[TemplateListItem])  # Add response_model=list[TemplateListItem] back if imported
async def getList(oDB: Session = Depends(get_db)):
    """
    Retrieve all templates from the database.
    """
    try:
        # Fetch all records from the database
        aoTemplates = oDB.query(LabellingTemplateEntity).all()

        oTemplateItemList = []
        for t in aoTemplates:
            oTemplateItemList.append({
                "templateId":t.id,  # Convert int to str for your frontend
                "name": t.name,
                "user": t.creator,  # Mapping DB 'creator' to expected 'user'
                "creationDate": t.creationDate or 0
            })
        return oTemplateItemList
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error retrieving templates: {str(oE)}')


# --- 2. UPDATE ---
@oRouter.put("/update")
async def update(
        oTemplateData: LabellingTemplate,
        sTemplateId: str = Query(..., description="Unique identifier (int) for the template"),
        oDB: Session = Depends(get_db)
):
    """
    Update an existing template in the database.
    """
    try:
        # 1. Find the existing template
        oTemplate = oDB.query(LabellingTemplateEntity).filter(LabellingTemplateEntity.id == sTemplateId).first()

        if not oTemplate:
            raise HTTPException(status_code=404, detail="Template not found")

        # 2. Update the fields dynamically
        oUpdateData = oTemplateData.model_dump()
        for key, value in oUpdateData.items():
            setattr(oTemplate, key, value)  # This updates the Python object

        # 3. Save changes
        oDB.commit()
        oDB.refresh(oTemplate)

        return {"templateId": oTemplate.id, "status": "updated"}

    except HTTPException:
        raise  # Re-raise 404s so they don't get caught as 500s below
    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error updating template: {str(oE)}')


# --- 3. DELETE ---
@oRouter.delete("/delete")
async def delete(
        sTemplateId: str = Query(..., description="Unique identifier for the template"),
        oDB: Session = Depends(get_db)
):
    """
    Delete an existing template from the database.
    """
    try:
        # 1. Find it
        oTemplate = oDB.query(LabellingTemplateEntity).filter(LabellingTemplateEntity.id == sTemplateId).first()

        if not oTemplate:
            raise HTTPException(status_code=404, detail="Template not found")

        # 2. Delete it
        oDB.delete(oTemplate)
        oDB.commit()

        return {"templateId": sTemplateId, "status": "deleted"}

    except HTTPException:
        raise
    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error deleting template: {str(oE)}')


# --- 4. GET BY PROJECT ---
@oRouter.get("/getByProject", response_model=LabellingTemplate)
async def getByProject(
        sProjectId: str = Query(..., description="Unique identifier for the project"),
        oDB: Session = Depends(get_db)
):
    """
    Retrieve the template associated with a specific project.
    """
    try:
        oTemplate = oDB.query(LabellingTemplateEntity).filter(LabellingTemplateEntity.projectId == sProjectId).first()

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
        oDB: Session = Depends(get_db)
):
    """
    Retrieve all attributes associated with a specific template.
    """
    try:
        # Find the template
        oTemplate = oDB.query(LabellingTemplateEntity).filter(LabellingTemplateEntity.id == sTemplateId).first()

        if not oTemplate:
            raise HTTPException(status_code=404, detail="Template not found")

        # Because we stored attributes as a JSON column, we can just return it directly!
        # FastAPI will automatically serialize it back into JSON for the frontend.
        return oTemplate.attributes

    except HTTPException:
        raise
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error retrieving attributes: {str(oE)}')