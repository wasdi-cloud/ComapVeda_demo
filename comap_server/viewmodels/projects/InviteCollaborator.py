from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional
from utils.CollaboratorRole import CollaboratorRole



class InviteCollaborator(BaseModel):
    """Validation schema for inviting a collaborator to a project"""
    
    userEmail: EmailStr = Field(..., description="Email address of the user to invite")
    
    role: CollaboratorRole = Field(..., description="Role of the collaborator (co-owner, annotator, or reviewer)")

    @field_validator("role", mode="before")
    @classmethod
    def validate_role(cls, v):
        if isinstance(v, CollaboratorRole):
            return v
        
        asValidRoles = [sRole.value for sRole in CollaboratorRole]
        if v not in asValidRoles:
            raise ValueError(f"Role must be one of {asValidRoles}, got '{v}'")

        return CollaboratorRole(v)
    
    note: Optional[str] = Field(None, description="Optional note or message to include with the invitation")
    

