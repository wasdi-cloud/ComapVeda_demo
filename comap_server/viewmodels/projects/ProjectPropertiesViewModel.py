from pydantic import BaseModel, Field
from typing import Optional

class ProjectPropertiesViewModel(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Name of the project")
    description: Optional[str] = Field(None, description="Description of the project")
    isPublic: bool = Field(False, description="Indicates if the project is public")
    hasAnnotatorGlobalView: bool = Field(True, description="Indicates if annotators can see all labels")
    labellingTemplate: Optional[str] = Field(None, description="Labelling template ID")