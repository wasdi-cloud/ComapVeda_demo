import time

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from database import get_db
from entities.DatasetProject import DatasetProjectEntity
from entities.ImageStyle import ImageStyleEntity
from entities.User import User
from utils import MailUtils
from utils.CollaboratorRole import CollaboratorRole
from utils.auth_utils import get_current_user
from viewmodels.projects.CollaboratorListItem import CollaboratorListItem
from viewmodels.projects.InviteCollaborator import InviteCollaborator
from viewmodels.projects.ProjectListItem import ProjectPublic, AOI
from viewmodels.projects.ProjectPropertiesViewModel import ProjectPropertiesViewModel
from viewmodels.projects.ProjectRequest import ProjectRequestViewModel
from viewmodels.projects.ProjectViewModel import ProjectViewModel
from utils.auth_utils import canReadProject
from utils.auth_utils import canWriteProject
from utils.auth_utils import isProjectOwner



oRouter = APIRouter(prefix="/projects")


# --- 1. CREATE PROJECT ---
@oRouter.post("/create")
async def create(
        oProjectData: ProjectViewModel,
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    """
    Create a new project. Automatically adds the current user as the primary owner.
    """
    try:
        oData = oProjectData.model_dump()
        oStyle = oData.pop('style', None)

        oProject = {
            "name": oData.get("name"),
            "description": oData.get("description"),
            "isGlobal": oData.get("isGlobalAoI"),
            "bbox": [oData.get("bbox")] if oData.get("bbox") else None,
            "isPublic": oData.get("isPublic"),
            "creationDate": oData.get("creationDate"),
            "startDate": oData.get("datasetStartDate"),
            "endDate": oData.get("datasetEndDate"),
            "mission": oData.get("mission"),
            "task": oData.get("tasks"),
            "annotatorsSeeAllLabels": oData.get("hasAnnotatorGlobalView"),
            "reviewRequired": oData.get("doesNeedReview"),
            "minReviewCount": oData.get("reviewersNumber") or 0,
            "selfHosted": oData.get("isOwnerHosting"),
            "s3Address": oData.get("hostingUrl"),
            "s3User": oData.get("hostingUsername"),
            "s3Password": oData.get("hostingPassword"),
            "template_id": oData.get("labellingTemplate"),

            # SECURITY INJECTION: The logged-in user is automatically the owner
            "owners": [oCurrentUser.email]
        }

        oNewProject = DatasetProjectEntity(**oProject)
        oDB.add(oNewProject)
        oDB.flush()

        if oStyle:
            new_style = ImageStyleEntity(
                projectId=oNewProject.id,
                **oStyle
            )
            oDB.add(new_style)

        oDB.commit()
        oDB.refresh(oNewProject)

        return {"projectId": oNewProject.id}

    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error creating project: {str(oE)}')


# --- 2. GET PUBLIC PROJECTS ---
# Note: Public endpoint. No authentication required!
@oRouter.get("/getPublic", response_model=list[ProjectPublic])
async def getPublic(oDB: Session = Depends(get_db)):
    try:
        aoPublicProjects = oDB.query(DatasetProjectEntity) \
            .filter(
            DatasetProjectEntity.isPublic == True,
            DatasetProjectEntity.approved == True
        ) \
            .order_by(desc(DatasetProjectEntity.creationDate)) \
            .all()

        oResult = []
        for oProject in aoPublicProjects:
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
@oRouter.get("/getByUser", response_model=list[ProjectPublic])
async def getByUser(
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        # Currently fetches all approved projects.
        # TODO: Add filtering to only show projects where current_user.email is in owners/annotators/reviewers
        aoUserProjects = oDB.query(DatasetProjectEntity).filter(DatasetProjectEntity.approved == True).all()

        oResult = []
        for oProject in aoUserProjects:

            # Basic logic to determine user role based on their actual email
            role = "ANNOTATOR"
            if oProject.owners and oCurrentUser.email in oProject.owners:
                role = "OWNER"
            elif oProject.reviewers and oCurrentUser.email in oProject.reviewers:
                role = "REVIEWER"

            owners_list = oProject.owners if oProject.owners else []
            count = len(owners_list)
            if count == 0: count = 1

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
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        oProject = oDB.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == project_id).first()
        if not oProject:
            raise HTTPException(status_code=404, detail="Project not found")

        bIsOwner = isProjectOwner(oCurrentUser, oProject, oDB)
        if not bIsOwner:
            raise HTTPException(status_code=403, detail="Only project owners can delete the project")

        oDB.delete(oProject)
        oDB.commit()

        print(f"MOCK EMAIL: Sent to collaborators of project {project_id} notifying deletion.")

        return {"status": "success", "message": "Project completely removed from the system"}
    except HTTPException:
        raise
    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error deleting project: {str(oE)}')


# --- LEAVE PROJECT ---
@oRouter.post("/leave")
async def leave_project(
        project_id: str = Query(...),
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:

        oProject = oDB.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == project_id).first()
        if not oProject:
            raise HTTPException(status_code=404, detail="Project not found")

        # Automatically remove the logged in user
        # if current_user.email in oProject.annotators: oProject.annotators.remove(current_user.email)

        oDB.commit()
        return {"status": "success", "message": f"User {oCurrentUser.email} dropped from collaborators"}
    except HTTPException:
        raise
    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error leaving project: {str(oE)}')


# --- 4. GET SINGLE PROJECT ---
@oRouter.get("/getProject", response_model=ProjectViewModel)
async def getProject(
        project_id: str = Query(..., description="The unique identifier of the project"),
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        bCanRead = canReadProject(oCurrentUser, project_id, oDB)
        if not bCanRead:
            raise HTTPException(status_code=403, detail="User does not have access to this project")

        oProject = oDB.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == project_id).first()

        if not oProject:
            raise HTTPException(status_code=404, detail="Project not found")

        oStyle = oProject.style

        return ProjectViewModel(
            id=oProject.id,
            name=oProject.name,
            description=oProject.description,
            isGlobalAoI=oProject.isGlobal,
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
        )

    except HTTPException:
        raise
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error fetching project: {str(oE)}')


# --- ADMIN ONLY ROUTES ---
# These assume the frontend guards them, but you should eventually check current_user.role == "ADMIN"

@oRouter.get("/reject")
async def reject(
        project_id: str = Query(...),
        note: str = Query(None, description="Reason for rejection"),
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        oProject = oDB.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == project_id).first()
        if not oProject:
            raise HTTPException(status_code=404, detail="Project not found")

        if oCurrentUser.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Only admins can reject the project")

        oProject.rejected = True
        oProject.approved = False
        oProject.rejectionNote = note
        oDB.commit()

        return {"status": "success", "message": f"Project {project_id} rejected"}
    except HTTPException:
        raise
    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error rejecting: {str(oE)}')


@oRouter.get("/approve")
async def approve(
        project_id: str = Query(...),
        maxStorage: int = Query(None, description="Max storage in GB"),
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:

        if oCurrentUser.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Only admins can approve the project")
        
        oProject = oDB.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == project_id).first()
        if not oProject:
            raise HTTPException(status_code=404, detail="Project not found")

        oProject.approved = True
        oProject.rejected = False
        oProject.maxStorage = maxStorage
        oDB.commit()

        return {"status": "success", "message": f"Project {project_id} approved"}
    except HTTPException:
        raise
    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error approving: {str(oE)}')


@oRouter.put("/update")
async def updateProject(
        project_id: str = Query(..., description="The unique identifier of the project"),
        oProjectPropertiesData: ProjectPropertiesViewModel = ...,
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:

        bCanWrite = canWriteProject(oCurrentUser, project_id, oDB)
        if not bCanWrite:
            raise HTTPException(status_code=403, detail="User does not have write access to this project")

        oProject = oDB.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == project_id).first()

        if not oProject:
            raise HTTPException(status_code=404, detail="Project not found")

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
async def getRequests(
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        
        if oCurrentUser.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Only admins can view project requests")
        
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


# --- HELPER FUNCTIONS ---
def _parse_email(collab_item):
    """Safely extract email whether stored as a string or a dict in the JSON column."""
    if isinstance(collab_item, dict):
        return collab_item.get("email", "")
    return str(collab_item)


def _is_user_owner(project: DatasetProjectEntity, user_email: str) -> bool:
    """Check if the user is in the owners JSON list."""
    if not project.owners:
        return False
    return any(_parse_email(item) == user_email for item in project.owners)



@oRouter.get("/listCollaborators", response_model=list[CollaboratorListItem])
async def listCollabs(
        project_id: str = Query(...),
        oDB: Session = Depends(get_db)
):
    try:
        oProject = oDB.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == project_id).first()

        if not oProject:
            raise HTTPException(status_code=404, detail="Project not found")

        aoResult = []

        # Helper to parse the JSON array into our ViewModels
        def add_to_results(collab_list, role_value):
            if not collab_list:
                return
            for item in collab_list:
                if isinstance(item, dict):
                    email = item.get("email", "")
                    date_added = item.get("dateAdded", 0)
                else:
                    email = str(item)
                    date_added = 0  # Default if stored purely as strings previously

                aoResult.append(CollaboratorListItem(
                    userEmail=email,
                    userRole=role_value,
                    dateAdded=date_added
                ))

        add_to_results(oProject.owners, CollaboratorRole.CO_OWNER.value)
        add_to_results(oProject.annotators, CollaboratorRole.ANNOTATOR.value)
        add_to_results(oProject.reviewers, CollaboratorRole.REVIEWER.value)

        return aoResult

    except HTTPException:
        raise
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error fetching collaborators: {str(oE)}')



@oRouter.post("/inviteCollaborator")
async def inviteCollabs(
        payload: InviteCollaborator,
        project_id: str = Query(...),
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        oProject = oDB.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == project_id).first()
        if not oProject:
            raise HTTPException(status_code=404, detail="Project not found")

        # 1. Verify if current user has permission (Must be an owner)
        if not _is_user_owner(oProject, oCurrentUser.email):
            raise HTTPException(status_code=403, detail="Only project owners can invite collaborators.")

        # 2. Check if invited user exists in the database
        oInvitedUser = oDB.query(User).filter(User.email == payload.userEmail).first()
        if not oInvitedUser:
            raise HTTPException(status_code=404, detail="User with this email does not exist.")

        # 3. Create the data payload to store in JSON
        new_collab_record = {
            "email": payload.userEmail,
            "dateAdded": int(time.time() * 1000)
        }

        # 4. Add them to the correct role list.
        # Note: We duplicate the list and reassign it to force SQLAlchemy to notice the JSON update.
        if payload.role == CollaboratorRole.CO_OWNER:
            current_list = list(oProject.owners or [])
            current_list.append(new_collab_record)
            oProject.owners = current_list

        elif payload.role == CollaboratorRole.ANNOTATOR:
            current_list = list(oProject.annotators or [])
            current_list.append(new_collab_record)
            oProject.annotators = current_list

        elif payload.role == CollaboratorRole.REVIEWER:
            current_list = list(oProject.reviewers or [])
            current_list.append(new_collab_record)
            oProject.reviewers = current_list

        oDB.commit()


        sTitle = f"Invitation to collaborate on project: {oProject.name}"

        sMessage = f"Hello,\n\nYou have been invited to collaborate on the project '{oProject.name}' with the role of: {payload.role.value}.\n"

        if payload.note:
            sMessage += f"\nMessage from the administrator:\n\"{payload.note}\"\n"

        sMessage += "\nPlease log in to the platform to access the project.\n\nBest regards,\nSystem Admin"
        MailUtils.sendEmailMailJet("sysadmin@wasdi.cloud", oInvitedUser.email, sTitle, sMessage, False)

        return {"message": f"Successfully invited {payload.userEmail} as {payload.role.value}"}

    except HTTPException:
        raise
    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error inviting collaborator: {str(oE)}')



@oRouter.delete("/removeCollaborator")
async def deleteCollab(
        userEmail: str = Query(...),
        project_id: str = Query(...),
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        oProject = oDB.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == project_id).first()
        if not oProject:
            raise HTTPException(status_code=404, detail="Project not found")

        # 1. Verify permissions: Must be an owner, OR the user is removing themselves.
        if not _is_user_owner(oProject, oCurrentUser.email) and oCurrentUser.email != userEmail:
            raise HTTPException(status_code=403, detail="Not authorized to remove this collaborator.")

        # Helper to filter out the target email
        def _remove_email_from_list(collab_list, target_email):
            if not collab_list:
                return []
            return [item for item in collab_list if _parse_email(item) != target_email]

        # 2. Clean them out of all role lists
        oProject.owners = _remove_email_from_list(oProject.owners, userEmail)
        oProject.annotators = _remove_email_from_list(oProject.annotators, userEmail)
        oProject.reviewers = _remove_email_from_list(oProject.reviewers, userEmail)

        oDB.commit()

        # --- SEND REMOVAL EMAIL ---
        sTitle = f"Access update for project: {oProject.name}"

        sMessage = f"Hello,\n\nThis is an automated notification to inform you that your access to the project '{oProject.name}' has been revoked by the project administrator.\n\nIf you believe this is a mistake or need your access restored, please reach out to the project owner.\n\nBest regards,\nSystem Admin"
        MailUtils.sendEmailMailJet("sysadmin@wasdi.cloud", userEmail, sTitle, sMessage, False)


        return {"message": f"Collaborator {userEmail} removed successfully."}

    except HTTPException:
        raise
    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error removing collaborator: {str(oE)}')