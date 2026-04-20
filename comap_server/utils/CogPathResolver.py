import os
import logging
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from entities.DatasetImage import DatasetImageEntity

logger = logging.getLogger(__name__)

def get_dataset_url(dataset_id: str, db: Session = Depends(get_db)) -> str:
    """
    This function is our 'Path Resolver'. 
    It takes the ID from the URL, finds the path in the DB, 
    and returns ONLY the string path.
    """
    oImage = db.query(DatasetImageEntity).filter(DatasetImageEntity.id == dataset_id).first()

    if not oImage:
        logger.error(f"CogPathResolver: CDB lookup failed for dataset_id: {dataset_id}")
        raise HTTPException(status_code=404, detail="Dataset not found in database")
    
    # Ensure forward slashes for GDAL/Rasterio compatibility
    sNormalizedPath = oImage.link.replace('\\', '/')
    
    if not os.path.exists(sNormalizedPath):
        logger.error(f"CogPathResolver: File physically missing: {sNormalizedPath}")
        raise HTTPException(status_code=404, detail="File missing on server storage")

    logger.info(f"CogPathResolver: TiTiler resolving {dataset_id} to {sNormalizedPath}")
    
    # CRITICAL: Return just the string.
    return sNormalizedPath