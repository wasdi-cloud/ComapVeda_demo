from pydantic import BaseModel, Field, field_validator
from typing import List, Optional

from viewmodels.templates.Attribute import Attribute,CategoryValue


# Import your existing Attribute classes here



class LabellingTemplateViewModel(BaseModel):
    """Input validator for creating a template."""

    name: str = Field(..., description="Name of the template")
    creator: str = Field(..., description="Creator of the template")
    description: Optional[str] = Field(None)

    # Client sends ["polygon", "point"]
    geometryTypes: List[str] = Field(..., description="List of geometry types")

    # Uses your existing Attribute model!
    attributes: List[Attribute] = Field(..., description="List of attributes")

    # Styling
    isSingleColorStyle: bool = Field(..., description="Whether the template uses a single color style")
    featureColor: Optional[str] = Field(None, description="Hex color for single style")
    colourAttributeName: Optional[str] = Field(None, description="Attribute name used for category coloring")

    creationDate: Optional[float] = Field(None)

    @field_validator('geometryTypes')
    @classmethod
    def validate_geometry_type(cls, v: List[str]) -> List[str]:
        allowed = {'polygon', 'polyline', 'point'}
        for item in v:
            if item.lower() not in allowed:
                raise ValueError(f"Invalid geometry: {item}")
        return [i.lower() for i in v]