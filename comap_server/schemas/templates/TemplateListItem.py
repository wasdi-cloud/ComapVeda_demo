from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List

def TemplateListItem(BaseModel):
    """Represents a template item in a list."""
    
    templateId: str = Field(..., description="Unique identifier for the template")
    
    name: str = Field(..., description="Name of the template")

    user: str = Field(..., description="User who created the template")
        
    creationDate: int = Field(..., description="Timestamp in milliseconds of when the template was created")
    