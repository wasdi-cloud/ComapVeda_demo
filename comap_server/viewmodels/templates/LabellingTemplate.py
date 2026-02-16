from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List

from .Attribute import Attribute


class LabellingTemplate(BaseModel):
    """Input validator for creating a template."""
    
    name: str = Field(..., description="Name of the template")

    creator: str = Field(..., description="Creator of the template")

    description: Optional[str] = Field(None, description="Optional description of the template")
    
    geometryTypes: List[str] = Field(..., description="List of types associated with the template")
    
    attributes: List[Attribute] = Field(..., description="List of attributes for the template")
    
    isSingleColorStyle: bool = Field(..., description="Whether the template uses a single color style")
    
    featureColor: Optional[str] = Field(None, description="Optional feature color for single color style")


    creationDate: Optional[float] = Field(None, description="Creation date of the template")

    @field_validator('geometryTypes')
    @classmethod
    def validate_geometry_type(cls, v: List[str]) -> List[str]:
        allowed_types = {'polygon', 'polyline', 'point'}
        
        # FIX: Iterate through the list 'v' to check each item
        for item in v:
            if item not in allowed_types:
                raise ValueError(f"Invalid geometry type '{item}'. Must be one of: {', '.join(allowed_types)}")
        
        return v