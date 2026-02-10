from datetime import time

from fastapi import APIRouter, HTTPException, Query

from schemas.templates.Attribute import Attribute, CategoryValue
from schemas.templates.LabellingTemplate import LabellingTemplate
from schemas.templates.TemplateListItem import TemplateListItem


oRouter = APIRouter(prefix="/templates")

@oRouter.post("/create")
async def create(oTemplateData: LabellingTemplate):
    """
    Create a new template with validated data.
    
    :param oTemplateData: TemplateCreate validator containing all required and optional fields
    :return: dict containing templateId of the newly created template
    """
    try:
        # The TemplateCreate validator has already validated the input
        # Convert to dict for storage/processing
        dTemplateDict = oTemplateData.model_dump()

        # TODO: Add database logic to store the template
        # TODO: may be worth saving also a timestampe with the creation time and the id of the user who create it

        return {
            "templateId": "template-1111-2222"
        }
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error creating template: {str(oE)}')
    

@oRouter.get("/getList", response_model=list[TemplateListItem])
async def getList():
    """
    Retrieve all templates in simplified format.
    
    :return: list of TemplateListItem objects containing template information
    """
    try:
        # TODO: Add database logic to retrieve all templates
        # For now, return a mock list of templates
        return [
            TemplateListItem(
                templateId="template-1111-2222",
                name="Template 1",
                user="user-1234",
                creationDate=1678886400000  # Unix timestamp in milliseconds
            ),
            TemplateListItem(
                templateId="template-3333-4444",
                name="Template 2",
                user="user-5678",
                creationDate=1678886500000  # Unix timestamp in milliseconds
            )
        ]
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error retrieving templates: {str(oE)}')
    

@oRouter.put("/update")
async def update(template_id: str = Query(..., description="Unique identifier for the template to update"), oTemplateData: LabellingTemplate = ...):
    """
    Update an existing template with validated data.

    :param template_id: Unique identifier for the template to update
    :param oTemplateData: TemplateCreate validator containing updated fields
    :return: dict indicating success or failure of the update operation
    """
    try:
        # The TemplateCreate validator has already validated the input
        # Convert to dict for storage/processing
        dTemplateDict = oTemplateData.model_dump()

        return {
            "templateId": "template-1111-2222"
        }
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error updating template: {str(oE)}');

@oRouter.delete("/delete")
async def delete(template_id: str = Query(..., description="Unique identifier for the template to delete")):
    """
    Delete an existing template.

    :param template_id: Unique identifier for the template to delete
    :return: dict indicating success or failure of the delete operation
    """
    try:
        # TODO: Add database logic to delete the template  
        return {
            "templateId": template_id
        }
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error deleting template: {str(oE)}')
    

@oRouter.get("/getByProject", response_model=LabellingTemplate)
async def getByProject(project_id: str = Query(..., description="Unique identifier for the project")):
    """
    Retrieve the template associated with a specific project.

    :param project_id: Unique identifier for the project
    :return: TemplateListItem object containing template information
    """
    try:
        # TODO: Real DB lookup using project_id

        # MOCK RETURN: A template with 3 dynamic attributes
        return LabellingTemplate(
            name="temp-dynamic-001",
            creator="jihed-admin",
            creationDate=111000000000,
            description="Template for city zoning.",
            geometryTypes=["polygon", "polyline"],
            isSingleColorStyle=False,
            featureColor="blue",
            # DYNAMIC ATTRIBUTES HERE:
            attributes=[
                Attribute(name="Zone Type", type="category", categoryValues=[
                    CategoryValue(value="Residential", color="#3b82f6"),
                    CategoryValue(value="Commercial", color="#ef4444"),
                    CategoryValue(value="Industrial", color="#eab308")
                ]),
                Attribute(name="Floors", type="integer", isOptional=True),
                Attribute(name="Avg Height", type="float", isOptional=True)
            ]
        )
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error retrieving template: {str(oE)}')
    

@oRouter.get("/getAttributes")
async def getAttributes(template_id: str = Query(..., description="Unique identifier for the template")):
    """
    Retrieve all attributes associated with a specific template.

    :param template_id: Unique identifier for the template
    :return: list of dicts containing attribute information
    """
    try:
        # TODO: Add database logic to retrieve attributes associated with the template
        return [
            {
                "name": "Attribute 1",
                "type": "string",
                "isOptional": False
            },
            {
                "name": "Attribute 2",
                "type": "category",
                "categoryValues": [
                    {"value": "Category A", "color": "#FF0000"},
                    {"value": "Category B", "color": "#00FF00"}
                ],
                "isOptional": True
            }
        ]
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error retrieving attributes: {str(oE)}')
    