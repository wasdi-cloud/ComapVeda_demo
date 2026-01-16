from fastapi import APIRouter, HTTPException, Query
from schemas.templates.TemplateCreate import TemplateCreate
from schemas.templates.TemplateListItem import TemplateListItem


oRouter = APIRouter(prefix="/templates")

@oRouter.post("/create")
async def create(oTemplateData: TemplateCreate):
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
async def update(template_id: str = Query(..., description="Unique identifier for the template to update"), oTemplateData: TemplateCreate = ...):
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
    

@oRouter.get("/getByProject", response_model=TemplateListItem)
async def getByProject(project_id: str = Query(..., description="Unique identifier for the project")):
    """
    Retrieve the template associated with a specific project.

    :param project_id: Unique identifier for the project
    :return: TemplateListItem object containing template information
    """
    try:
        # TODO: Add database logic to retrieve the template associated with the project
        return TemplateListItem(
            templateId="template-1111-2222",
            name="Template 1",
            user="user-1234",
            creationDate=1678886400000  # Unix timestamp in milliseconds
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
    