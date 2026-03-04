from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from database import get_db
from entities.DatasetProject import DatasetProjectEntity
from entities.ImageStyle import ImageStyleEntity
from entities.User import User
from utils.auth_dependencies import get_current_user
from viewmodels.projects.InviteCollaborator import InviteCollaborator
# Import your Pydantic Models
from viewmodels.projects.ProjectViewModel import ProjectViewModel
from viewmodels.projects.ProjectListItem import ProjectPublic, AOI
from viewmodels.projects.ProjectPropertiesViewModel import ProjectPropertiesViewModel
from viewmodels.projects.ProjectRequest import ProjectRequestViewModel

oRouter = APIRouter(prefix="/projects")


# --- 1. CREATE PROJECT ---
@oRouter.post("/create")
async def create(
        oProjectData: ProjectViewModel,
        oDB: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """
    Create a new project and its associated ImageStyle.
    Requires authentication via X-Session-Token header.
    """
    try:
        oData = oProjectData.model_dump()

        # 1. Extract Style Data (if any) to save separately
        # Assuming your ProjectCreate has a field 'style' or similar.
        # If not, you might need to adjust where style info comes from.
        oStyle= oData.pop('style', None)

        # 2. Map Frontend names to DB names (if they differ)
        # Example: Frontend 'isGlobalAoI' -> DB 'isGlobal'
        oProject = {
            "name": oData.get("name"),
            "description": oData.get("description"),
            "isGlobal": oData.get("isGlobalAoI"),  # Mapping here
            "bbox": [oData.get("bbox")] if oData.get("bbox") else None,  # Store as JSON list
            "isPublic": oData.get("isPublic"),
            "creationDate": oData.get("creationDate"),
            "startDate": oData.get("datasetStartDate"),
            "endDate": oData.get("datasetEndDate"),
            "mission": oData.get("mission"),
            "task": oData.get("tasks"),  # List of strings
            "annotatorsSeeAllLabels": oData.get("hasAnnotatorGlobalView"),
            "reviewRequired": oData.get("doesNeedReview"),
            "minReviewCount": oData.get("reviewersNumber") or 0,

            # Hosting
            "selfHosted": oData.get("isOwnerHosting"),
            "s3Address": oData.get("hostingUrl"),
            "s3User": oData.get("hostingUsername"),
            "s3Password": oData.get("hostingPassword"),

            # Foreign Key (Template)
            # Assuming the frontend sends 'labellingTemplate' as the UUID string
            "template_id": oData.get("labellingTemplate")
        }

        # 3. Create Project Entity
        oNewProject = DatasetProjectEntity(**oProject)
        oDB.add(oNewProject)
        oDB.flush()  # Flush to generate the new_project.id (GUID) without committing yet

        # 4. Create Image Style Entity (if provided)
        if oStyle:
            new_style = ImageStyleEntity(
                projectId=oNewProject.id,
                **oStyle
            )
            oDB.add(new_style)

        # 5. Commit everything
        oDB.commit()
        oDB.refresh(oNewProject)

        return {"projectId": oNewProject.id}

    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error creating project: {str(oE)}')


# --- 2. GET PUBLIC PROJECTS ---
@oRouter.get("/getPublic", response_model=list[ProjectPublic])
async def getPublic(oDB: Session = Depends(get_db)):
    try:
        # Fetch where isPublic = True
        aoPublicProjects = oDB.query(DatasetProjectEntity) \
            .filter(DatasetProjectEntity.isPublic == True) \
            .order_by(desc(DatasetProjectEntity.creationDate)) \
            .all()

        oResult = []
        for oProject in aoPublicProjects:
            # Map DB Entity -> ProjectPublic Pydantic Model
            oAOI = AOI(
                isGlobal=oProject.isGlobal,
                bbox=oProject.bbox[0] if oProject.bbox and len(oProject.bbox) > 0 else None
            )

            oResult.append(ProjectPublic(
                id=oProject.id,
                name=oProject.name,
                description=oProject.description,
                aoi=oAOI,
                mission=oProject.mission.value if oProject.mission else None,
                tasks=oProject.task if oProject.task else []
            ))

        return oResult
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error fetching public projects: {str(oE)}')


# --- 3. GET USER PROJECTS ---
# --- GET USER PROJECTS (Updated to supply Role and Count) ---
@oRouter.get("/getByUser", response_model=list[ProjectPublic])
async def getByUser(
        user_id: str = "jihed_admin",  # Mock Auth user
        oDB: Session = Depends(get_db)
):
    try:
        # Fetching all projects for demo purposes.
        # In reality, filter where user_id is in owners, annotators, or reviewers lists.
        aoUserProjects = oDB.query(DatasetProjectEntity).all()

        oResult = []
        for oProject in aoUserProjects:
            # 1. Mock determining the role.
            # In a real app, check if user_id is in oProject.owners, oProject.annotators, etc.
            role = "OWNER"  # Defaulting to OWNER for testing your Delete UC

            # 2. Count owners to prevent the last owner from leaving
            owners_list = oProject.owners if oProject.owners else []
            count = len(owners_list)
            if count == 0: count = 1  # Fake fallback for testing

            oResult.append(ProjectPublic(
                id=oProject.id,
                name=oProject.name,
                description=oProject.description,
                aoi=AOI(isGlobal=oProject.isGlobal, bbox=oProject.bbox[0] if oProject.bbox else None),
                mission=oProject.mission.value if oProject.mission else None,
                tasks=oProject.task if oProject.task else [],
                userRole=role,
                ownersCount=count
            ))

        return oResult
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error fetching user projects: {str(oE)}')


# --- DELETE PROJECT ---
@oRouter.delete("/delete")
async def delete_project(
        project_id: str = Query(...),
        oDB: Session = Depends(get_db)
):
    try:
        oProject = oDB.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == project_id).first()
        if not oProject:
            raise HTTPException(status_code=404, detail="Project not found")

        oDB.delete(oProject)
        oDB.commit()

        # UC: "The system sends an email to all collaborators stating that the project has been deleted."
        print(f"MOCK EMAIL: Sent to collaborators of project {project_id} notifying deletion.")

        return {"status": "success", "message": "Project completely removed from the system"}
    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error deleting project: {str(oE)}')


# --- LEAVE PROJECT ---
@oRouter.post("/leave")
async def leave_project(
        project_id: str = Query(...),
        user_id: str = Query(...),
        oDB: Session = Depends(get_db)
):
    try:
        oProject = oDB.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == project_id).first()
        if not oProject:
            raise HTTPException(status_code=404, detail="Project not found")

        # In a real app, you would do:
        # if user_id in oProject.owners: oProject.owners.remove(user_id)
        # elif user_id in oProject.annotators: oProject.annotators.remove(user_id)

        oDB.commit()
        return {"status": "success", "message": f"User {user_id} dropped from collaborators"}
    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error leaving project: {str(oE)}')

# --- 4. GET SINGLE PROJECT ---
@oRouter.get("/getProject", response_model=ProjectViewModel)
async def getProject(
        project_id: str = Query(..., description="The unique identifier of the project"),
        oDB: Session = Depends(get_db)
):
    try:
        oProject = oDB.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == project_id).first()

        if not oProject:
            raise HTTPException(status_code=404, detail="Project not found")

        # Extract style if it exists
        oStyle = oProject.style  # SQLAlchemy relationship magic

        # Map DB Entity -> ProjectCreate Pydantic Model
        return ProjectViewModel(
            id=oProject.id,
            name=oProject.name,
            description=oProject.description,
            isGlobalAoI=oProject.isGlobal,
            # Handle bbox array -> string conversion if needed
            bbox=oProject.bbox[0] if oProject.bbox and len(oProject.bbox) > 0 else None,
            isPublic=oProject.isPublic,
            link=oProject.link,
            creationDate=oProject.creationDate,
            datasetStartDate=oProject.startDate,
            datasetEndDate=oProject.endDate,
            hasAnnotatorGlobalView=oProject.annotatorsSeeAllLabels,
            doesNeedReview=oProject.reviewRequired,
            reviewersNumber=oProject.minReviewCount,
            mission=oProject.mission.value if oProject.mission else None,
            tasks=oProject.task if oProject.task else [],
            labellingTemplate=oProject.template_id,
            isOwnerHosting=oProject.selfHosted,
            hostingUsername=oProject.s3User,
            hostingPassword=oProject.s3Password,
            hostingUrl=oProject.s3Address,
            approved=oProject.approved,
            rejected=oProject.rejected,
            rejectionNote=oProject.rejectionNote
            # TODO: Map style object back to Pydantic if needed
        )

    except HTTPException:
        raise
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error fetching project: {str(oE)}')


@oRouter.get("/reject")
async def reject(
        # Notice we use project_id to match the frontend URL parameter
        project_id: str = Query(...),
        note: str = Query(None, description="Reason for rejection"),
        oDB: Session = Depends(get_db)
):
    try:
        oProject = oDB.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == project_id).first()
        if not oProject:
            raise HTTPException(status_code=404, detail="Project not found")

        oProject.rejected = True
        oProject.approved = False
        oProject.rejectionNote = note # <-- SAVE THE NOTE
        oDB.commit()

        return {"status": "success", "message": f"Project {project_id} rejected"}
    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error rejecting: {str(oE)}')


@oRouter.get("/approve")
async def approve(
        project_id: str = Query(...),
        maxStorage: int = Query(None, description="Max storage in GB"),
        oDB: Session = Depends(get_db)
):
    try:
        oProject = oDB.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == project_id).first()
        if not oProject:
            raise HTTPException(status_code=404, detail="Project not found")

        oProject.approved = True
        oProject.rejected = False
        oProject.maxStorage = maxStorage # <-- SAVE THE STORAGE LIMIT
        oDB.commit()

        return {"status": "success", "message": f"Project {project_id} approved"}
    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error approving: {str(oE)}')
# --- 6. COLLABORATORS (Placeholder) ---
# Since we don't have a 'Collaborators' table yet (just JSON arrays in Project),
# we will append to the JSON list for now.

@oRouter.post("/inviteCollaborator")
async def inviteCollaborator(
        oInviteData: InviteCollaborator,
        oDB: Session = Depends(get_db)
):
    # TODO: Logic depends on if you want to store invitations in a separate table
    # or just append email to project.annotators JSON list.
    return {
        "status": "success",
        "message": f"Mock invite sent to {oInviteData.userEmail}"
    }


@oRouter.delete("/removeCollaborator")
async def removeCollaborator(sId: str = Query(...)):
    # TODO: Logic to remove ID from project.annotators JSON list
    return {"status": "success", "message": f"User {sId} removed"}


@oRouter.put("/update")
async def updateProject(
        project_id: str = Query(..., description="The unique identifier of the project"),
        oProjectPropertiesData: ProjectPropertiesViewModel = ...,
        oDB: Session = Depends(get_db)
):
    """
    Update specific properties of an existing project.
    """
    try:
        oProject = oDB.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == project_id).first()

        if not oProject:
            raise HTTPException(status_code=404, detail="Project not found")

        # Map the incoming ViewModel data to the Database Entity
        oProject.name = oProjectPropertiesData.name
        oProject.description = oProjectPropertiesData.description
        oProject.isPublic = oProjectPropertiesData.isPublic
        oProject.annotatorsSeeAllLabels = oProjectPropertiesData.hasAnnotatorGlobalView

        if oProjectPropertiesData.labellingTemplate:
            oProject.template_id = oProjectPropertiesData.labellingTemplate

        oDB.commit()

        return {"status": "success", "projectId": oProject.id}

    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error updating project: {str(oE)}')


@oRouter.get("/getRequests", response_model=list[ProjectRequestViewModel])
async def getRequests(oDB: Session = Depends(get_db)):
    """
    Get all projects with their raw approval flags.
    """
    try:
        # Fetch all projects, newest first
        aoProjects = oDB.query(DatasetProjectEntity).order_by(desc(DatasetProjectEntity.creationDate)).all()

        oResult = []
        for oProject in aoProjects:
            sRequester = oProject.owners[0] if oProject.owners and len(oProject.owners) > 0 else "System Admin"

            oResult.append(ProjectRequestViewModel(
                id=oProject.id,
                name=oProject.name,
                requester=sRequester,
                creationDate=oProject.creationDate or 0,
                approved=oProject.approved,
                rejected=oProject.rejected,
                description=oProject.description or "No description provided."
            ))

        return oResult
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error fetching requests: {str(oE)}')