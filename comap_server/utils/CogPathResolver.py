import os
import logging
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from entities.DatasetImage import DatasetImageEntity

logger = logging.getLogger(__name__)

"""
def get_dataset_url(dataset_id: str, db: Session = Depends(get_db)) -> str:
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
"""

s_sBASE_STORAGE_PATH = os.environ.get("COMAP_PROJECTS_BASE_PATH")

def get_dataset_url(encoded_path: str) -> str:
    """
    Resolves a relative path like 'project_id/image_name.tif' 
    into a full server path.
    """
    if not encoded_path:
        raise HTTPException(status_code=400, detail="No path provided")

    # Construct the full path
    sFullPath = os.path.normpath(os.path.join(s_sBASE_STORAGE_PATH, encoded_path))

    logging.debug(f"CogPathResolver: Resolving encoded path '{encoded_path}' to full path '{sFullPath}'")
    
    # Ensure forward slashes for GDAL
    sFullPath = sFullPath.replace('\\', '/')

    # Prevent "Path Traversal"
    # Ensure the final path is actually INSIDE the base storage folder
    if not sFullPath.startswith(s_sBASE_STORAGE_PATH.replace('\\', '/')):
        logger.error(f"CogPathResolver: Security Alert: Attempted access outside base path: {sFullPath}")
        raise HTTPException(status_code=403, detail="Access denied: Invalid path scope")

    # Verify file exists
    if not os.path.exists(sFullPath):
        logger.error(f"CogPathResolver: File not found: {sFullPath}")
        raise HTTPException(status_code=404, detail="The requested image does not exist")

    logger.debug(f"CogPathResolver: Resolved relative path to: {sFullPath}")

    return sFullPath