from typing import Optional

from pydantic import BaseModel


class ProjectRequestViewModel(BaseModel):
    id: str
    name: str
    requester: str
    creationDate: int
    approved: Optional[bool] = False
    rejected: Optional[bool] = False
    description: Optional[str] = None