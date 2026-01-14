from pydantic import BaseModel, Field
from typing import Optional, List

class AOI(BaseModel):
    """Area of Interest model"""

    isGlobal: bool = Field(..., description="Indicates if the area of interest is global")

    bbox: Optional[str] = Field(None, description="Bounding box in WKT format")


class ProjectPublic(BaseModel):
    """Public project response model"""

    id: str = Field(..., description="Unique identifier of the project")

    name: str = Field(..., description="Name of the project")

    description: Optional[str] = Field(None, description="Description of the project")

    aoi: AOI = Field(..., description="Area of interest")

    mission: str = Field(..., description="Mission associated with the project")
    
    tasks: List[str] = Field(default_factory=list, description="List of tasks associated with the project")

    userRole: Optional[str] = Field(None, description="Role of the user in the project (e.g., annotator, reviewer)")
