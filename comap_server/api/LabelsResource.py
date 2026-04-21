import json
import logging
import uuid

from fastapi import APIRouter, HTTPException, Query, Depends, Body
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from entities.Label import LabelEntity
from viewmodels.labels.LabelItem import LabelItem

from entities.User import User
from utils.auth_utils import get_current_user
from utils.auth_utils import canReadProject
from utils.auth_utils import canWriteProject

oRouter = APIRouter(prefix="/labels")

logger = logging.getLogger(__name__)

# --- 1. GET LABELS BY IMAGE ---
@oRouter.get("/getByImage", response_model=list[LabelItem])
async def getByImage(
        project_id: str = Query(..., description="Unique identifier for the project"),
        sImageName: str = Query(..., description="Unique identifier for the image (used as datasetImageId)"),
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        aoLabels = oDB.query(
            LabelEntity,
            func.ST_AsGeoJSON(LabelEntity.geometry).label("geojson")
        ).filter(
            LabelEntity.datasetImageId == sImageName
        ).all()

        oResult = []
        for oLabelRow, sGeojson in aoLabels:
            geometry_data = json.loads(sGeojson)
            coords = geometry_data.get("coordinates")
            geom_type = geometry_data.get("type")

            oResult.append(LabelItem(
                labelId=oLabelRow.id,
                imageName=oLabelRow.datasetImageId,
                geometryType=geom_type,
                coordinates=coords,
                attributes=oLabelRow.attributes if oLabelRow.attributes else [],
            ))

        return oResult

    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error retrieving aoLabels: {str(oE)}')


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

        oLabel.reviewCount = (oLabel.reviewCount or 0) + 1

        oDB.commit()
        return {"labelId": sLabelId, "status": "approved"}
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error approving label: {str(oE)}')


@oRouter.get("/reject")
async def rejectLabel(
        sLabelId: str = Query(...),
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        OLabel = oDB.query(LabelEntity).filter(LabelEntity.id == sLabelId).first()
        if not OLabel:
            raise HTTPException(status_code=404, detail="Label not found")

        oDB.commit()
        return {"labelId": sLabelId, "status": "rejected"}
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error rejecting OLabel: {str(oE)}')


# --- 6. BULK SYNC ---
@oRouter.post("/sync")
async def syncLabels(
        image_id: str = Query(..., description="The ID of the image being annotated"),
        aoLabels: list[LabelItem] = Body(...),
        oDB: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    try:
        # 1. Clear existing labels for this specific image
        oDB.query(LabelEntity).filter(LabelEntity.datasetImageId == image_id).delete(synchronize_session=False)

        # 2. Insert the new state
        for oLabelData in aoLabels:
            oGeojson = {
                "type": oLabelData.geometryType,
                "coordinates": oLabelData.coordinates
            }
            sGeojson = json.dumps(oGeojson)

            # Preserve UUID if it already exists from a previous save, otherwise generate new one
            sNewId = oLabelData.labelId if oLabelData.labelId and len(str(oLabelData.labelId)) > 20 else str(
                uuid.uuid4())

            oNewLabel = LabelEntity(
                id=sNewId,
                datasetImageId=image_id,
                geometry=func.ST_SetSRID(func.ST_GeomFromGeoJSON(sGeojson), 4326),
                attributes=oLabelData.attributes,
                isPolygon=(oLabelData.geometryType.lower() == "polygon"),
                isLine=(oLabelData.geometryType.lower() == "linestring"),
                isPoint=(oLabelData.geometryType.lower() == "point"),

                # SECURITY INJECTION: Use the authenticated user's email
                creatorId=oCurrentUser.email
            )
            oDB.add(oNewLabel)

        oDB.commit()
        return {"status": "success", "message": f"Synced {len(aoLabels)} labels."}

    except Exception as oE:
        oDB.rollback()
        raise HTTPException(status_code=500, detail=f'Error syncing labels: {str(oE)}')