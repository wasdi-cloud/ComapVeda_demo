from pydantic import BaseModel
from typing import Optional

class ProjectImageResponse(BaseModel):
    id: str
    name: str
    filename: str
    date: int
    bbox: Optional[str] = None
    annotator: str = "System"