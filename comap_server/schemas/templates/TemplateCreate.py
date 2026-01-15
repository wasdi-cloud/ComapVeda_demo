from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List

class CategoryValue(BaseModel):
    """Represents a category value with its associated color."""
    
    value: str = Field(..., description="The category value")
    
    color: str = Field(..., description="The color associated with this category value")




class Attribute(BaseModel):
    """Represents an attribute in the template."""
    name: str = Field(..., description="Name of the attribute")

    type: str = Field(..., description="Type of the attribute")

    @field_validator('type')
    @classmethod
    def validate_geometry_type(cls, v: str) -> str:
        allowed_types = {'string', 'integer', 'float', 'category'}
        if v not in allowed_types:
            raise ValueError(f"Type must be one of: {', '.join(allowed_types)}")
        return v

    categoryValues: Optional[List[CategoryValue]] = Field(None, description="Optional list of category values with colors")
    
    isOptional: bool = Field(..., description="Whether this attribute is optional")




class TemplateCreate(BaseModel):
    """Input validator for creating a template."""
    
    name: str = Field(..., description="Name of the template")
    
    description: Optional[str] = Field(None, description="Optional description of the template")
    
    geometryTypes: List[str] = Field(..., description="List of types associated with the template")
    
    attributes: List[Attribute] = Field(..., description="List of attributes for the template")
    
    isSingleColorStyle: bool = Field(..., description="Whether the template uses a single color style")
    
    featureColor: Optional[str] = Field(None, description="Optional feature color for single color style")

    @field_validator('geometryTypes')
    @classmethod
    def validate_geometry_type(cls, v: List[str]) -> List[str]:
        allowed_types = {'polygon', 'polyline', 'point'}
        
        # FIX: Iterate through the list 'v' to check each item
        for item in v:
            if item not in allowed_types:
                raise ValueError(f"Invalid geometry type '{item}'. Must be one of: {', '.join(allowed_types)}")
        
        return v