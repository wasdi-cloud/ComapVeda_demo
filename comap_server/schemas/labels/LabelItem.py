from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from shapely import wkt, errors

class Attribute(BaseModel):
    """Represents an attribute in a label."""

    name: str = Field(..., description="Name of the attribute")

    type: str = Field(..., description="Type of the attribute")

    @field_validator('type')
    @classmethod
    def validate_geometry_type(cls, v: str) -> str:
        allowed_types = {'string', 'integer', 'float', 'category'}
        if v not in allowed_types:
            raise ValueError(f"Type must be one of: {', '.join(allowed_types)}")
        return v

    value: str = Field(..., description="Value of the attribute")

    isWaitingForReview: Optional[bool] = Field(False, description="Whether this attribute is waiting for review")


class LabelItem(BaseModel):

    labelId: Optional[str] = Field(None, description="Unique identifier for the label")

    projectId: Optional[str] = Field(None, description="Unique identifier for the projectl")

    imageName: str = Field(..., description="Unique identifier for the image associated with the label")

    geometryType: str = Field(..., description="Type of geometry (e.g., Point, LineString, Polygon)")

    coordinates: str = Field(..., description="Coordinates of the geometry in GeoJSON format")

    attributes: Optional[List[Attribute]] = Field(None, description="List of attributes associated with the label")

