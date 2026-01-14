from pydantic import BaseModel, Field

class CollaboratorListItem(BaseModel):
    """Schema for a collaborator item returned by listCollaborators"""

    userId: str = Field(..., description="Unique identifier of the user")
    userRole: str = Field(..., description="Role of the user in the project")
    dateAdded: int = Field(..., description="Epoch milliseconds when the user was added")
