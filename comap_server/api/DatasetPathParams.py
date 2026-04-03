from fastapi import Query, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from entities.DatasetImage import DatasetImageEntity


def DatasetPathParams(
    dataset_id: str = Query(..., description="The ID (UUID) of the dataset image"),
    oDb: Session = Depends(get_db)
) -> str:
    """
    Recover the physical path (link) from the database using the provided ID.
    """
    oRecord = oDb.query(DatasetImageEntity).filter(DatasetImageEntity.id == dataset_id).first()
    
    if not oRecord:
        raise HTTPException(
            status_code=404, 
            detail=f"Image record {dataset_id} not found."
        )
    
    if not oRecord.link:
        raise HTTPException(
            status_code=500, 
            detail=f"Image record {dataset_id} exists but has no file path (link)."
        )
        
    return oRecord.link