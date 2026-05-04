import logging
import os
from pathlib import Path
from database import SessionLocal
from entities.DatasetProject import DatasetProjectEntity


oLogger = logging.getLogger(__name__)

def getDirSizeTifFiles(sPath: str) -> int | None:
    """
    Recursively calculates the total size of all files in the given directory.
    Returns the value in bytes, or None if an error occurs.
    """
    sTotalSize = 0
    try:
        with os.scandir(sPath) as oIt:
            for oEntry in oIt:
                if oEntry.is_file() and oEntry.name.endswith(".tif"):
                    sTotalSize += oEntry.stat().st_size
                elif oEntry.is_dir():
                    sTotalSize += getDirSizeTifFiles(oEntry.path)

    except Exception as oE:
        oLogger.error(f"getDirSize: Error occurred while calculating directory size for {sPath}: {oE}")
        return None

    return sTotalSize


def projectHasStorageCapacity(sProjectId: str) -> bool:
    # check if the user is not exceeding the storage limitations
    if not sProjectId:
        oLogger.error("_projectHasStorageCapacity: No project ID provided for storage check")
        return False
    
    oProjectFolderPath = Path(os.environ.get("COMAP_PROJECTS_BASE_PATH", "")) / sProjectId

    oLogger.debug(f"_projectHasStorageCapacity: Checking storage limits for project {oProjectFolderPath}")

    if not oProjectFolderPath.exists():
        # If the folder doesn't exist, we can assume 0 storage usage and allow the import
        return True  

    if oProjectFolderPath.exists() and oProjectFolderPath.is_dir():
        iProjectSize = getDirSizeTifFiles(oProjectFolderPath)
        oLogger.debug(f"_projectHasStorageCapacity: {sProjectId} is {iProjectSize / (1024 * 1024 * 1024):.2f} GB")

        if iProjectSize is None:
            oLogger.error(f"_projectHasStorageCapacity: Could not determine project size for {oProjectFolderPath}")
            return False
        
        # read the allowed project size for the project
        oProject = None
        with SessionLocal() as oDB:
            oProject = oDB.query(DatasetProjectEntity) \
                .filter(DatasetProjectEntity.id == sProjectId) \
                .first()
            
        if not oProject:
            oLogger.error(f"_projectHasStorageCapacity: Project {sProjectId} not found in database")
            return False
        
        iMaxStorageGiga = getattr(oProject, 'maxStorage', 2)
        iMaxStorageBytes = iMaxStorageGiga * 1024 * 1024 * 1024 
        oLogger.debug(f"_projectHasStorageCapacity: Project {sProjectId} has a storage limit of {iMaxStorageGiga} GB ({iMaxStorageBytes} bytes)")

        if iProjectSize >= iMaxStorageBytes:
            oLogger.warning(f"_projectHasStorageCapacity: Storage limit exceeded for project {sProjectId}. " \
                            f"Current size: {iProjectSize / (1024 * 1024 * 1024):.2f} GB. Allowed size: {iMaxStorageGiga} GB")
            return False
        
        oLogger.debug(f"_projectHasStorageCapacity: Project {sProjectId} is within storage limits")
        return True
    
    return False

