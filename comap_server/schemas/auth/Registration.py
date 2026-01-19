from pydantic import BaseModel, Field, field_validator
from typing import Optional, List

class Registration(BaseModel):

    name: str = Field(..., description="name of the user")

    surname: str = Field(..., description="surname of the user")

    email: str = Field(..., description="email of the user")

    password: str = Field(..., description="password of the user")