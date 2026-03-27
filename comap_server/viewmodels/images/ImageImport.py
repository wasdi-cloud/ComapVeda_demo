from pydantic import BaseModel, Field, field_validator
from typing import Optional, List

class ImageImport(BaseModel):

    projectId: str = Field(..., description="Identifier of the project to which images are being imported")

    platform: str = Field(..., description="Platform from which the image is sourced (e.g., Sentinel-2)")

    imageUrl: str = Field(..., description="URL of the image to be imported")

    imageName: str = Field(..., description="Name of the imported image")