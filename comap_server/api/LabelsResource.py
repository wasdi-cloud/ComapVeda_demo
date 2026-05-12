import json
import logging
import uuid

from fastapi import APIRouter, HTTPException, Query, Depends, Body
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from entities.DatasetImage import DatasetImageEntity
from entities.DatasetProject import DatasetProjectEntity
from entities.Label import LabelEntity
from entities.User import User
from utils.auth_utils import get_current_user
from viewmodels.labels.LabelItem import LabelItem
from viewmodels.labels.NoteRequest import NoteRequest, ResolveNoteRequest

oRouter = APIRouter(prefix="/labels")

logger = logging.getLogger(__name__)


# --- 1. GET LABELS BY IMAGE ---
@oRouter.get("/getByImage", response_model=list[LabelItem])
async def getByImage(
        project_id: str = Query(...),
        sImageName: str = Query(...),
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        # 1. Fetch the project to check visibility rules
        oProject = oDB.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == project_id).first()
        if not oProject:
            raise HTTPException(status_code=404, detail="Project not found")

        # 2. Check if the user is an Admin/Owner/Reviewer (they always bypass this restriction)
        bIsOwnerOrReviewer = (oCurrentUser.email in (oProject.owners or [])) or (
                    oCurrentUser.email in (oProject.reviewers or []))

        # 3. Start building the base query
        query = oDB.query(
            LabelEntity,
            func.ST_AsGeoJSON(LabelEntity.geometry).label("geojson")
        ).filter(LabelEntity.datasetImageId == sImageName)

        # 4. ENFORCE ACCESS CONTROL: If they are a standard annotator and the project is restricted
        if not oProject.annotatorsSeeAllLabels and not bIsOwnerOrReviewer:
            query = query.filter(LabelEntity.creatorId == oCurrentUser.email)

        # 5. Execute query
        aoLabels = query.all()

        oResult = []
        for oLabelRow, sGeojson in aoLabels:
            geometry_data = json.loads(sGeojson)
            oResult.append(LabelItem(
                labelId=oLabelRow.id,
                imageName=oLabelRow.datasetImageId,
                geometryType=geometry_data.get("type"),
                coordinates=geometry_data.get("coordinates"),
                attributes=oLabelRow.attributes if oLabelRow.attributes else {},
                reviewCount=oLabelRow.reviewCount,
                reviewers=oLabelRow.reviewers if oLabelRow.reviewers else [],
                reviewNotes=oLabelRow.reviewNotes if oLabelRow.reviewNotes else [],
                # Make sure the new validation flag gets mapped to the client!
                isValidated=oLabelRow.isValidated
            ))
        return oResult
    except Exception as oE:
        raise HTTPException(status_code=500, detail=str(oE))
# --- 2. ADD LABEL ---
@oRouter.post("/add")
async def addLabel(
        oLabelData: LabelItem,
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        aoGeojson = {
            "type": oLabelData.geometryType,
            "coordinates": oLabelData.coordinates
        }
        sGeojson = json.dumps(aoGeojson)

        oNewLabel = LabelEntity(
            datasetImageId=oLabelData.imageName,
            geometry=func.ST_SetSRID(func.ST_GeomFromGeoJSON(sGeojson), 4326),
            attributes=[attr.dict() for attr in oLabelData.attributes] if oLabelData.attributes else [],
            isPolygon=(oLabelData.geometryType.lower() == "polygon"),
            isLine=(oLabelData.geometryType.lower() == "linestring"),
            isPoint=(oLabelData.geometryType.lower() == "point"),

            # SECURITY INJECTION: Use the authenticated user's email
            creatorId=oCurrentUser.email
        )

        oDB.add(oNewLabel)
        oDB.commit()
        oDB.refresh(oNewLabel)

        return {"labelId": oNewLabel.id}

    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error adding label: {str(oE)}')


# --- 3. EDIT LABEL ---
@oRouter.put("/edit")
async def editLabel(
        oLabelData: LabelItem,
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        oLabel = oDB.query(LabelEntity).filter(LabelEntity.id == oLabelData.labelId).first()
        if not oLabel:
            raise HTTPException(status_code=404, detail="Label not found")

        aoGeojson = {
            "type": oLabelData.geometryType,
            "coordinates": oLabelData.coordinates
        }
        sGeojson = json.dumps(aoGeojson)

        oLabel.geometry = func.ST_SetSRID(func.ST_GeomFromGeoJSON(sGeojson), 4326)
        oLabel.attributes = [attr.dict() for attr in oLabelData.attributes]
        oLabel.isPolygon = (oLabelData.geometryType.lower() == "polygon")
        oLabel.isLine = (oLabelData.geometryType.lower() == "linestring")
        oLabel.isPoint = (oLabelData.geometryType.lower() == "point")

        oDB.commit()
        return {"labelId": oLabel.id, "status": "updated"}

    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error editing oLabel: {str(oE)}')


# --- 4. DELETE LABEL ---
@oRouter.delete("/delete")
async def deleteLabel(
        sLabelId: str = Query(...),
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        oLabel = oDB.query(LabelEntity).filter(LabelEntity.id == sLabelId).first()
        if not oLabel:
            raise HTTPException(status_code=404, detail="Label not found")

        oDB.delete(oLabel)
        oDB.commit()

        return {"labelId": sLabelId, "status": "deleted"}

    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error deleting oLabel: {str(oE)}')


# --- 5. APPROVE / REJECT ---
# --- 5. APPROVE (Updated) ---
@oRouter.get("/approve")
async def approveLabel(
        sLabelId: str = Query(...),
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        oLabel = oDB.query(LabelEntity).filter(LabelEntity.id == sLabelId).first()
        if not oLabel:
            raise HTTPException(status_code=404, detail="Label not found")

        # 1. Fetch the associated Project to get the minReviewCount
        oImage = oDB.query(DatasetImageEntity).filter(DatasetImageEntity.id == oLabel.datasetImageId).first()
        oProject = oDB.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == oImage.projectId).first()
        min_required_reviews = oProject.minReviewCount if oProject and oProject.minReviewCount else 1

        current_reviewers = oLabel.reviewers if oLabel.reviewers else []

        # 2. Add reviewer and check threshold
        if oCurrentUser.email not in current_reviewers:
            current_reviewers.append(oCurrentUser.email)
            oLabel.reviewers = current_reviewers
            oLabel.reviewCount = (oLabel.reviewCount or 0) + 1

            # --- DYNAMIC VALIDATION CHECK ---
            if oLabel.reviewCount >= min_required_reviews:
                oLabel.isValidated = True

            oDB.commit()

        return {
            "labelId": sLabelId,
            "status": "approved",
            "isValidated": oLabel.isValidated,
            "reviewCount": oLabel.reviewCount
        }
    except Exception as oE:
        raise HTTPException(status_code=500, detail=str(oE))

# --- NEW: ADD NOTE ---
from sqlalchemy.orm.attributes import flag_modified  # <-- MUST BE IMPORTED

import uuid
from pydantic import BaseModel
from sqlalchemy.orm.attributes import flag_modified





# --- 7. ADD NOTE (Updated) ---
@oRouter.post("/addNote")
async def addLabelNote(
        oRequest: NoteRequest,
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        oLabel = oDB.query(LabelEntity).filter(LabelEntity.id == oRequest.labelId).first()
        if not oLabel:
            raise HTTPException(status_code=404, detail="Label not found")

        current_notes = list(oLabel.reviewNotes) if oLabel.reviewNotes else []

        # We now generate a unique ID and a resolved flag for each note!
        new_note = {
            "id": str(uuid.uuid4()),
            "sender": oCurrentUser.email,
            "note": oRequest.note,
            "resolved": False
        }

        current_notes.append(new_note)
        oLabel.reviewNotes = current_notes

        flag_modified(oLabel, "reviewNotes")
        oDB.commit()

        # Return the generated note ID so React has it immediately
        return {"labelId": oRequest.labelId, "status": "note_added", "note": new_note}
    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=str(oE))


# --- 8. RESOLVE SPECIFIC NOTE ---
@oRouter.post("/resolveNote")
async def resolveLabelNote(
        oRequest: ResolveNoteRequest,
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        oLabel = oDB.query(LabelEntity).filter(LabelEntity.id == oRequest.labelId).first()
        if not oLabel:
            raise HTTPException(status_code=404, detail="Label not found")

        current_notes = list(oLabel.reviewNotes) if oLabel.reviewNotes else []

        # Find the specific note and flip it to resolved
        for note in current_notes:
            if note.get("id") == oRequest.noteId:
                note["resolved"] = True
                break

        oLabel.reviewNotes = current_notes
        flag_modified(oLabel, "reviewNotes")
        oDB.commit()

        return {"labelId": oRequest.labelId, "status": "resolved"}
    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=str(oE))


@oRouter.get("/reject")
async def rejectLabel(
        sLabelId: str = Query(...),
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        oLabel = oDB.query(LabelEntity).filter(LabelEntity.id == sLabelId).first()
        if not oLabel:
            raise HTTPException(status_code=404, detail="Label not found")

        # If a label is explicitly rejected, it loses its validation status
        oLabel.isValidated = False
        oDB.commit()

        return {"labelId": sLabelId, "status": "rejected"}
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error rejecting Label: {str(oE)}')
# --- 6. BULK SYNC ---
@oRouter.post("/sync")
@oRouter.post("/sync")
async def syncLabels(
        image_id: str = Query(...),
        aoLabels: list[LabelItem] = Body(...),
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        # 1. Check Project Visibility Rules
        oImage = oDB.query(DatasetImageEntity).filter(DatasetImageEntity.id == image_id).first()
        oProject = oDB.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == oImage.projectId).first()
        bIsOwnerOrReviewer = (oCurrentUser.email in (oProject.owners or [])) or (
                    oCurrentUser.email in (oProject.reviewers or []))

        # 2. Determine Scope
        oExistingQuery = oDB.query(LabelEntity).filter(LabelEntity.datasetImageId == image_id)
        if not oProject.annotatorsSeeAllLabels and not bIsOwnerOrReviewer:
            oExistingQuery = oExistingQuery.filter(LabelEntity.creatorId == oCurrentUser.email)

        # Map existing labels by ID for quick lookup
        aoExistingLabels = {lbl.id: lbl for lbl in oExistingQuery.all()}

        # 3. Identify labels from the frontend
        asIncomingIds = [str(lbl.labelId) for lbl in aoLabels if lbl.labelId and len(str(lbl.labelId)) > 20]

        # 4. DELETE logic
        for sOldId, oOldLbl in aoExistingLabels.items():
            if str(sOldId) not in asIncomingIds:
                # --- NEW PADLOCK: Prevent annotators from deleting other people's labels ---
                if not bIsOwnerOrReviewer and oOldLbl.creatorId != oCurrentUser.email:
                    continue

                oDB.delete(oOldLbl)

        # 5. UPSERT logic
        for oLabelData in aoLabels:
            sGeojson = json.dumps({"type": oLabelData.geometryType, "coordinates": oLabelData.coordinates})
            sIncomingId = str(oLabelData.labelId) if oLabelData.labelId else None

            if sIncomingId and sIncomingId in aoExistingLabels:
                # --- UPDATE EXISTING LABEL ---
                oExistingLbl = aoExistingLabels[sIncomingId]

                # --- NEW PADLOCK: Prevent annotators from editing other people's labels ---
                if not bIsOwnerOrReviewer and oExistingLbl.creatorId != oCurrentUser.email:
                    continue

                oExistingLbl.geometry = func.ST_SetSRID(func.ST_GeomFromGeoJSON(sGeojson), 4326)
                oExistingLbl.attributes = oLabelData.attributes
                oExistingLbl.isPolygon = (oLabelData.geometryType.lower() == "polygon")
                oExistingLbl.isLine = (oLabelData.geometryType.lower() == "linestring")
                oExistingLbl.isPoint = (oLabelData.geometryType.lower() == "point")

                # CRITICAL: Do NOT overwrite creatorId here!
                oExistingLbl.reviewCount = oLabelData.reviewCount
                oExistingLbl.reviewers = oLabelData.reviewers
                oExistingLbl.reviewNotes = oLabelData.reviewNotes
                oExistingLbl.isValidated = oLabelData.isValidated if oProject.reviewRequired else True

            elif sIncomingId and len(sIncomingId) > 20:
                # --- INSERT NEW LABEL ---
                oNewLabel = LabelEntity(
                    id=sIncomingId,
                    datasetImageId=image_id,
                    geometry=func.ST_SetSRID(func.ST_GeomFromGeoJSON(sGeojson), 4326),
                    attributes=oLabelData.attributes,
                    isPolygon=(oLabelData.geometryType.lower() == "polygon"),
                    isLine=(oLabelData.geometryType.lower() == "linestring"),
                    isPoint=(oLabelData.geometryType.lower() == "point"),
                    creatorId=oCurrentUser.email,
                    reviewCount=oLabelData.reviewCount,
                    reviewers=oLabelData.reviewers,
                    reviewNotes=oLabelData.reviewNotes,
                    isValidated=oLabelData.isValidated if oProject.reviewRequired else True
                )
                oDB.add(oNewLabel)

        oDB.commit()
        return {"status": "success", "message": "Smart sync completed."}
    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=str(oE))