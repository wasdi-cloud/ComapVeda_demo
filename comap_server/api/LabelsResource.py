import json

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from entities.Label import LabelEntity
# Import your Pydantic model
from viewmodels.labels.LabelItem import LabelItem

oRouter = APIRouter(prefix="/labels")


# --- 1. GET LABELS BY IMAGE ---
@oRouter.get("/getByImage", response_model=list[LabelItem])
async def getByImage(
        project_id: str = Query(..., description="Unique identifier for the project"),
        sImageName: str = Query(..., description="Unique identifier for the image (used as datasetImageId)"),
        oDB: Session = Depends(get_db)
):
    """
    Retrieve aoLabels associated with a specific image.
    We convert the DB Geometry back to GeoJSON coordinates for the frontend.
    """
    try:
        # Query: Select all columns + convert geometry to GeoJSON string
        aoLabels = oDB.query(
            LabelEntity,
            func.ST_AsGeoJSON(LabelEntity.geometry).label("geojson")
        ).filter(
            LabelEntity.datasetImageId == sImageName
            # Note: If you want to filter by project_id, you'd need to join with DatasetProject
            # or ensure image_name is unique across projects.
        ).all()

        oResult = []
        for oLabelRow, sGeojson in aoLabels:
            # Parse the GeoJSON string from PostGIS
            geometry_data = json.loads(sGeojson)

            # Extract coordinates based on type
            # PostGIS GeoJSON format: {"type": "Polygon", "coordinates": [[[x,y]...]]}
            coords = geometry_data.get("coordinates")
            geom_type = geometry_data.get("type")

            oResult.append(LabelItem(
                labelId=oLabelRow.id,
                imageName=oLabelRow.datasetImageId,
                geometryType=geom_type,
                coordinates=coords,
                attributes=oLabelRow.attributes if oLabelRow.attributes else [],
                # Map other fields if your LabelItem has them (e.g., status, creator)
            ))

        return oResult

    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error retrieving aoLabels: {str(oE)}')


# --- 2. ADD LABEL ---
@oRouter.post("/add")
async def addLabel(
        oLabelData: LabelItem,
        oDB: Session = Depends(get_db)
):
    """
    Add a new label. Converts frontend coordinates to PostGIS Geometry.
    """
    try:
        # 1. Construct GeoJSON string for PostGIS
        # Format: {"type": "Polygon", "coordinates": [...]}
        aoGeojson = {
            "type": oLabelData.geometryType,
            "coordinates": oLabelData.coordinates
        }
        sGeojson = json.dumps(aoGeojson)

        # 2. Create Entity
        oNewLabel = LabelEntity(
            datasetImageId=oLabelData.imageName,
            # Use ST_GeomFromGeoJSON to convert string -> Geometry
            geometry=func.ST_SetSRID(func.ST_GeomFromGeoJSON(sGeojson), 4326),

            attributes=[attr.dict() for attr in oLabelData.attributes] if oLabelData.attributes else [],

            # Set Flags based on type
            isPolygon=(oLabelData.geometryType.lower() == "polygon"),
            isLine=(oLabelData.geometryType.lower() == "linestring"),
            isPoint=(oLabelData.geometryType.lower() == "point"),

            creatorId="user-123"  # TODO: Replace with real user ID from auth
        )

        # 3. Save
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
        oDB: Session = Depends(get_db)
):
    """
    Edit geometry or attributes of an existing oLabel.
    """
    try:
        # Find the oLabel
        oLabel = oDB.query(LabelEntity).filter(LabelEntity.id == oLabelData.labelId).first()
        if not oLabel:
            raise HTTPException(status_code=404, detail="Label not found")

        # Update Geometry
        aoGeojson = {
            "type": oLabelData.geometryType,
            "coordinates": oLabelData.coordinates
        }
        sGeojson = json.dumps(aoGeojson)

        # We must use an UPDATE statement for geometry functions usually,
        # but assigning a func() to a column attribute works in modern SQLAlchemy.
        oLabel.geometry = func.ST_SetSRID(func.ST_GeomFromGeoJSON(sGeojson), 4326)

        # Update Attributes
        oLabel.attributes = [attr.dict() for attr in oLabelData.attributes]

        # Update Flags
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
        oDB: Session = Depends(get_db)
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
# Note: You need columns 'approved' or 'status' in your LabelEntity.
# I assumed 'reviewCount' or similar from your UML, but for now I'll use a placeholder logic.

@oRouter.get("/approve")
async def approveLabel(
        sLabelId: str = Query(...),
        oDB: Session = Depends(get_db)
):
    try:
        oLabel = oDB.query(LabelEntity).filter(LabelEntity.id == sLabelId).first()
        if not oLabel:
            raise HTTPException(status_code=404, detail="Label not found")

        # Example logic: Increment review count or set a status flag
        oLabel.reviewCount = (oLabel.reviewCount or 0) + 1
        # label.status = "approved" # If you add this column later

        oDB.commit()
        return {"labelId": sLabelId, "status": "approved"}
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error approving label: {str(oE)}')


@oRouter.get("/reject")
async def rejectLabel(
        sLabelId: str = Query(...),
        oDB: Session = Depends(get_db)
):
    try:
        OLabel = oDB.query(LabelEntity).filter(LabelEntity.id == sLabelId).first()
        if not OLabel:
            raise HTTPException(status_code=404, detail="Label not found")

        # Example logic: Add a note or set status
        # OLabel.status = "rejected"

        oDB.commit()
        return {"labelId": sLabelId, "status": "rejected"}
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error rejecting OLabel: {str(oE)}')
