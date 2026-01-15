from fastapi import APIRouter, HTTPException, Query
from schemas.projects.ProjectCreate import ProjectCreate
from schemas.projects.ProjectListItem import ProjectPublic, AOI
from schemas.projects.InviteCollaborator import InviteCollaborator

oRouter = APIRouter(prefix="/projects")


@oRouter.post("/create")
async def create(oProjectData: ProjectCreate):
    """
    Create a new project with validated data.
    
    :param oProjectData: ProjectCreate validator containing all required and optional fields
    :return: dict containing projectId of the newly created project
    """
    try:
        # The ProjectCreate validator has already validated the input
        # Convert to dict for storage/processing
        dProjectDict = oProjectData.model_dump()
        
        # TODO: Add database logic to store the project
        
        return {
            "projectId": "1111-2222-3333-4444"
        }
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error creating project: {str(oE)}')


@oRouter.get("/getPublic", response_model=list[ProjectPublic])
async def getPublic():
    """
    Retrieve all public projects in simplified format.
    
    :return: list of ProjectPublic objects containing public project information
    """
    try:
        # TODO: Query database for all public projects
        # For now, return mock data
        oAOI = AOI(isGlobal=True, bbox=None)
        
        aoPublicProjects = [
            ProjectPublic(
                id="123-456-789",
                name="Public Project 1",
                description="First test public project",
                aoi=oAOI,
                mission="Sentinel-2",
                tasks=["classification", "other"]
            ),
            ProjectPublic(
                id="987-654-321",
                name="Public Project 2",
                description="Second test public project",
                aoi=oAOI,
                mission="Sentinel-2",
                tasks=[]
            ),
        ]
        
        return aoPublicProjects
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error fetching public projects: {str(oE)}')
    

@oRouter.get("/getByUser", response_model=list[ProjectPublic])
async def getByUser():
    """
    Retrieve all projects associated with the current user.
    
    :return: list of ProjectPublic objects containing user's project information
    """
    try:
        # TODO: Query database for all public projects
        # For now, return mock data
        oAOI = AOI(isGlobal=True, bbox=None)
        
        aoPublicProjects = [
            ProjectPublic(
                id = "555-666-777",
                name="User Project 1",
                description="First test user project",
                aoi=oAOI,
                mission="Sentinel-2",
                tasks=["classification", "other"],
                userRole="annotator"
            ),
            ProjectPublic(
                id="888-999-000",
                name="User Project 2",
                description="Second test user project",
                aoi=oAOI,
                mission="Sentinel-2",
                tasks=[],
                userRole ="owner"
            ),
        ]
        
        return aoPublicProjects
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error fetching public projects: {str(oE)}')  


@oRouter.get("/getProject", response_model=ProjectCreate)
async def getProject(project_id: str = Query(..., description="The unique identifier of the project")):
    """
    Retrieve detailed information about a specific project.
    
    :param project_id: The unique identifier of the project (required, non-null query parameter)
    :return: ProjectCreate object containing all project details
    """
    try:
        # TODO: Query database for project by ID
        # For now, return mock data
        oProject = ProjectCreate(
            id="9876-5432-1098-7654",
            userRole="owner",
            name="Sample Project",
            description="This is a sample project retrieved by ID",
            isGlobalAoI=False,
            bbox="POLYGON ((30 10, 40 40, 20 40, 10 20, 30 10))",
            isPublic=True,
            link="https://example.com/project",
            creationDate="2025-01-01",
            datasetStartDate="2020-01-01",
            datasetEndDate="2023-12-31",
            hasAnnotatorGlobalView=True,
            doesNeedReview=False,
            reviewersNumber=None,
            mission="Sentinel-2",
            tasks=["segmentation", "detection"],
            labellingTemplate="labelling-template-1",
            isOwnerHosting=False,
            hostingUsername=None,
            hostingPassword=None,
            hostingUrl=None
        )
        
        return oProject
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error fetching project: {str(oE)}')


@oRouter.get("/reject")
async def reject(project_id: str = Query(..., description="The unique identifier of the project to reject")):
    """
    Reject a project by its ID.
    
    :param project_id: The unique identifier of the project to reject (required, non-null query parameter)
    :return: dict containing success status message
    """
    try:
        # TODO: Add database logic to reject the project
        
        return {
            "status": "success",
            "message": f"Project {project_id} has been rejected"
        }
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error rejecting project: {str(oE)}')


@oRouter.get("/approve")
async def approve(project_id: str = Query(..., description="The unique identifier of the project to approve")):
    """
    Approve a project by its ID.

    :param project_id: The unique identifier of the project to approve (required, non-null query parameter)
    :return: dict containing success status message
    """
    try:
        # TODO: Add database logic to approve the project
        
        return {
            "status": "success",
            "message": f"Project {project_id} has been approved"
        }
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error approving project: {str(oE)}')


@oRouter.post("/inviteCollaborator")
async def inviteCollaborator(oInviteData: InviteCollaborator):
    """
    Invite a collaborator to a project.
    
    :param oInviteData: InviteCollaborator validator containing email, role, and optional note
    :return: dict containing success status and invitation details
    """
    try:
        # TODO: Add database logic to create invitation and send email
        
        return {
            "status": "success",
            "message": f"Invitation sent to {oInviteData.userEmail} with role {oInviteData.role}"
        }
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error inviting collaborator: {str(oE)}')


@oRouter.delete("/removeCollaborator")
async def removeCollaborator(id: str = Query(..., description="The unique identifier of the collaborator to remove")):
    """
    Remove a collaborator from a project.
    
    :param id: The unique identifier of the collaborator to remove (required, non-empty query parameter)
    :return: dict containing success status message
    """
    try:
        # TODO: Add database logic to remove the collaborator
        
        return {
            "status": "success",
            "message": f"Collaborator {id} has been removed from the project"
        }
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error removing collaborator: {str(oE)}')


