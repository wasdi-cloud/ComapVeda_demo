import os
import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)

s_sBASE_STORAGE_PATH = os.environ.get("COMAP_PROJECTS_BASE_PATH")

def getDatasetUrl(encoded_path: str) -> str:
    """
    Resolves a relative path like 'project_id/image_name.tif' into a full server path.
    """
    if not encoded_path:
        logging.error("getDatasetUrl. No path provided in request")
        raise HTTPException(status_code=400, detail="No path provided")

    # Construct the full path
    sFullPath = os.path.normpath(os.path.join(s_sBASE_STORAGE_PATH, encoded_path))

    logging.debug(f"getDatasetUrl. Resolving encoded path '{encoded_path}' to full path '{sFullPath}'")
    
    # Ensure forward slashes for GDAL
    sFullPath = sFullPath.replace('\\', '/')

    # Prevent "Path Traversal"
    # Ensure the final path is actually INSIDE the base storage folder
    if not sFullPath.startswith(s_sBASE_STORAGE_PATH.replace('\\', '/')):
        logger.error(f"getDatasetUrl. Security Alert: Attempted access outside base path: {sFullPath}")
        raise HTTPException(status_code=403, detail="Access denied: Invalid path scope")

    # Verify file exists
    if not os.path.exists(sFullPath):
        logger.error(f"getDatasetUrl. File not found: {sFullPath}")
        raise HTTPException(status_code=404, detail="The requested image does not exist")

    logger.debug(f"getDatasetUrl. Resolved relative path to: {sFullPath}")

    return sFullPath