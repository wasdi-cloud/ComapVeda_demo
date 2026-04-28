from pydantic import BaseModel

class ExportRequestViewModel(BaseModel):
    projectId: str
    includeRawData: bool
    labelFilter: str  # Will be 'all' or 'validated'