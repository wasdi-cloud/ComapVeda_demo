import io
import json
import logging
import os
import time
import zipfile
from datetime import datetime
from fastapi.responses import StreamingResponse
import geopandas as gpd
from fastapi import APIRouter, HTTPException, Query, Depends
from shapely.geometry import shape
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from database import get_db
from entities.DatasetImage import DatasetImageEntity
from entities.DatasetProject import DatasetProjectEntity
from entities.ImageStyle import ImageStyleEntity
from entities.Label import LabelEntity
from entities.User import User
from utils import MailUtils
from utils.CollaboratorRole import CollaboratorRole
from utils.auth_utils import get_current_user
from viewmodels.projects.CollaboratorListItem import CollaboratorListItem
from viewmodels.projects.ExportRequestViewModel import ExportRequestViewModel
from viewmodels.projects.InviteCollaborator import InviteCollaborator
from viewmodels.projects.ProjectListItem import ProjectPublic, AOI
from viewmodels.projects.ProjectPropertiesViewModel import ProjectPropertiesViewModel
from viewmodels.projects.ProjectRequest import ProjectRequestViewModel
from viewmodels.projects.ProjectViewModel import ProjectViewModel
from utils.auth_utils import canReadProject
from utils.auth_utils import canWriteProject
from utils.auth_utils import isProjectOwner


logger = logging.getLogger(__name__)

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
            "maxStorage": os.environ.get("MAX_STORAGE_GB", "2"),
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
        # Fetch all projects ordered by newest.
        # We will filter them in Python to safely handle list/array matching regardless of DB type.
        aoAllProjects = oDB.query(DatasetProjectEntity).order_by(desc(DatasetProjectEntity.creationDate)).all()

        oResult = []
        for oProject in aoAllProjects:

            # Safely grab the lists (fallback to empty list if None in the DB)
            aoOwners = oProject.owners if oProject.owners else []
            aoReviewers = oProject.reviewers if oProject.reviewers else []
            aoAnnotators = oProject.annotators if oProject.annotators else []

            # --- 1. Is the current user involved in this project? ---
            bIsOwner = oCurrentUser.email in aoOwners
            bIsReviewer = oCurrentUser.email in aoReviewers
            bIsAnnotator = oCurrentUser.email in aoAnnotators

            bIsInvolved = bIsOwner or bIsReviewer or bIsAnnotator

            # --- 2. Is the project public and approved? ---
            bIsPublicAndApproved = (oProject.isPublic == True and oProject.approved == True)

            # --- 3. THE FILTER ---
            # If they are NOT involved, and it is NOT a public/approved project... hide it!
            if not bIsInvolved and not bIsPublicAndApproved:
                continue

            # --- 4. Determine their actual role ---
            if bIsOwner:
                role = "OWNER"
            elif bIsReviewer:
                role = "REVIEWER"
            elif bIsAnnotator:
                role = "ANNOTATOR"
            else:
                # If they aren't on any list, they are only seeing this because it's public.
                # You can change this to "ANNOTATOR" if public users are allowed to label!
                role = "GUEST"

                # Fix for owners count div-by-zero UI bugs
            count = len(aoOwners)
            if count == 0: count = 1

            oResult.append(ProjectPublic(
                id=oProject.id,
                name=oProject.name,
                description=oProject.description,
                # Added the safe len() check you used in the public endpoint to prevent index errors
                aoi=AOI(
                    isGlobal=oProject.isGlobal,
                    bbox=oProject.bbox[0] if oProject.bbox and len(oProject.bbox) > 0 else None
                ),
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
        if not oProject.owners or oCurrentUser.email not in oProject.owners:
            raise HTTPException(status_code=403, detail="Only project owners can delete the project")



        # 1. Collect all unique collaborator emails BEFORE we delete the project
        setAllCollabs = set()
        if oProject.owners: setAllCollabs.update(oProject.owners)
        if oProject.reviewers: setAllCollabs.update(oProject.reviewers)
        if oProject.annotators: setAllCollabs.update(oProject.annotators)

        # 2. Remove the person actually pressing the delete button (they already know!)
        if oCurrentUser.email in setAllCollabs:
            setAllCollabs.remove(oCurrentUser.email)

        # Save the name for the email
        sProjectName = oProject.name

        # 3. Actually delete the project from the DB
        oDB.delete(oProject)
        oDB.commit()

        # 4. SEND REAL EMAILS TO EVERYONE
        sTitle = f"Project Deleted: {sProjectName}"
        sMessage = f"Hello,\n\nThis is an automated notification to inform you that the project '{sProjectName}' has been completely removed from the system by the owner ({oCurrentUser.email}).\n\nBest regards,\nSystem Admin"

        for sEmail in setAllCollabs:
            try:
                # Assuming MailUtils is imported at the top of your file!
                MailUtils.sendEmailMailJet("sysadmin@wasdi.cloud", sEmail, sTitle, sMessage, False)
            except Exception as e:
                logging.error(f"Failed to send delete notification email to {sEmail}: {str(e)}")

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

        # Helper to safely strip an email out of a JSON list array
        def _remove_email(collab_list, target_email):
            if not collab_list:
                return []
            return [email for email in collab_list if email != target_email]

        # ACTUALLY remove the user from all possible lists!
        oProject.owners = _remove_email(oProject.owners, oCurrentUser.email)
        oProject.annotators = _remove_email(oProject.annotators, oCurrentUser.email)
        oProject.reviewers = _remove_email(oProject.reviewers, oCurrentUser.email)

        oDB.commit()
        return {"status": "success", "message": f"User {oCurrentUser.email} successfully left the project."}
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
        logging.debug(f"getProject. User {oCurrentUser.email} is requesting details for project_id: {project_id}")

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
            logging.error("listCollaborators.Throwing 404: Project was None!")
            raise HTTPException(status_code=404, detail="Project not found")
        aoResult = []

        # Helper to parse the JSON array into our ViewModels
        def add_to_results(collab_list, role_value):
            if not collab_list:
                return
            for email in collab_list:
                aoResult.append(CollaboratorListItem(
                    userEmail=email,
                    userRole=role_value,
                    dateAdded=0  # Hardcoded to 0 since we dropped tracking dates
                ))

        add_to_results(oProject.owners, CollaboratorRole.CO_OWNER.value)
        add_to_results(oProject.annotators, CollaboratorRole.ANNOTATOR.value)
        add_to_results(oProject.reviewers, CollaboratorRole.REVIEWER.value)

        return aoResult


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

        # 3. Add their email string to the correct role list.
        # We assign it to a new list to force SQLAlchemy to detect the JSON update.
        if payload.role == CollaboratorRole.CO_OWNER:
            current_list = list(oProject.owners or [])
            if payload.userEmail not in current_list:
                current_list.append(payload.userEmail)
            oProject.owners = current_list

        elif payload.role == CollaboratorRole.ANNOTATOR:
            current_list = list(oProject.annotators or [])
            if payload.userEmail not in current_list:
                current_list.append(payload.userEmail)
            oProject.annotators = current_list

        elif payload.role == CollaboratorRole.REVIEWER:
            current_list = list(oProject.reviewers or [])
            if payload.userEmail not in current_list:
                current_list.append(payload.userEmail)
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

        # Helper to filter out the target email string
        def _remove_email(collab_list, target_email):
            if not collab_list:
                return []
            return [email for email in collab_list if email != target_email]

        # 2. Clean them out of all role lists
        oProject.owners = _remove_email(oProject.owners, userEmail)
        oProject.annotators = _remove_email(oProject.annotators, userEmail)
        oProject.reviewers = _remove_email(oProject.reviewers, userEmail)

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

# --- EXPORT PROJECT (TRIGGER GENERATION) ---
@oRouter.post("/export")
async def export_project(
        oExportData: ExportRequestViewModel,
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        # 1. Security Check
        if not canReadProject(oCurrentUser, oExportData.projectId, oDB):
            raise HTTPException(status_code=403, detail="User does not have access to this project")

        oProject = oDB.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == oExportData.projectId).first()
        if not oProject:
            raise HTTPException(status_code=404, detail="Project not found")

        # 2. Query Labels Joined with Images
        # We need the image metadata (name, date) to satisfy the Use Case!
        aoResults = oDB.query(
            LabelEntity,
            func.ST_AsGeoJSON(LabelEntity.geometry).label("geojson"),
            DatasetImageEntity.fileName.label("image_name"),
            DatasetImageEntity.date.label("image_date")
        ).join(
            DatasetImageEntity, LabelEntity.datasetImageId == DatasetImageEntity.id
        ).filter(
            DatasetImageEntity.projectId == oExportData.projectId
        ).all()

        if not aoResults:
            raise HTTPException(status_code=404, detail="No labels found for this project.")

        # ==========================================
        # TODO: Implement Label Validation Filtering
        # if oExportData.labelFilter == "validated":
        #     aoResults = [r for r in aoResults if r.LabelEntity.isValidated == True]
        # ==========================================

        # 3. Parse Data for GeoPandas
        aoFeatures = []
        for oRow in aoResults:
            oLabel = oRow.LabelEntity
            sGeojson = oRow.geojson

            # Parse Geometry
            oGeom = shape(json.loads(sGeojson))

            # Parse Dates
            oImgDate = datetime.fromtimestamp(oRow.image_date / 1000.0) if oRow.image_date else datetime.now()
            sCreationTime = datetime.fromtimestamp(
                oLabel.creationDate / 1000.0).isoformat() if oLabel.creationDate else ""

            # Base properties required by Use Case
            # NOTE: Shapefile column names are strictly limited to 10 characters!
            oProps = {
                "geometry": oGeom,
                "annotator": oLabel.creatorId or "System",
                "timestamp": sCreationTime,
                "img_name": oRow.image_name,
                "img_year": oImgDate.year,
                "img_month": oImgDate.month,
                "img_day": oImgDate.day,
                "geom_type": oGeom.geom_type
            }

            # Unpack dynamic attributes (Template properties)
            if oLabel.attributes and isinstance(oLabel.attributes, dict):
                for key, val in oLabel.attributes.items():
                    # Truncate custom keys to 10 chars to prevent Shapefile corruption
                    safe_key = str(key)[:10]
                    oProps[safe_key] = val

            aoFeatures.append(oProps)

        # 4. Create GeoDataFrame and Split by Geometry Type
        gdf = gpd.GeoDataFrame(aoFeatures, geometry="geometry", crs="EPSG:4326")

        dictGDFs = {
            "Points": gdf[gdf['geom_type'] == 'Point'],
            "Lines": gdf[gdf['geom_type'] == 'LineString'],
            "Polygons": gdf[gdf['geom_type'] == 'Polygon']
        }

        # 5. Package into an In-Memory ZIP File
        oZipBuffer = io.BytesIO()
        with zipfile.ZipFile(oZipBuffer, "w", zipfile.ZIP_DEFLATED) as zip_file:

            for sGeomType, sub_gdf in dictGDFs.items():
                if sub_gdf.empty:
                    continue

                # Drop the geom_type column as it's redundant now
                sub_gdf = sub_gdf.drop(columns=['geom_type'])

                # Write shapefile components (.shp, .shx, .dbf, .cpg, .prj) to temp memory
                # Geopandas requires a folder path, so we use a trick with io.BytesIO
                import tempfile
                import os

                with tempfile.TemporaryDirectory() as tmpdir:
                    sShpPath = os.path.join(tmpdir, f"{oProject.name.replace(' ', '_')}_{sGeomType}.shp")
                    sub_gdf.to_file(sShpPath, driver="ESRI Shapefile")

                    # Read them back and write to our Zip archive
                    for filename in os.listdir(tmpdir):
                        sFilePath = os.path.join(tmpdir, filename)
                        zip_file.write(sFilePath, arcname=f"labels/{sGeomType}/{filename}")

            # ==========================================
            # TODO: Include Raw Data (GeoTIFFs)
            # if oExportData.includeRawData and oProject.selfHosted:
            #     # Fetch files from S3 and write them to zip_file
            #     pass
            # ==========================================

        # Reset buffer pointer to the beginning
        oZipBuffer.seek(0)

        # 6. Return as a Downloadable File
        sSafeProjectName = oProject.name.replace(' ', '_')
        return StreamingResponse(
            oZipBuffer,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename=ComapVeda_Export_{sSafeProjectName}.zip"}
        )

    except HTTPException:
        raise
    except Exception as oE:
        logging.error(f"Error triggering export: {str(oE)}")
        raise HTTPException(status_code=500, detail=f'Error triggering export: {str(oE)}')