from pydantic import BaseModel, Field, field_validator
from typing import Optional, List

class LoginModel(BaseModel):

    username: str = Field(..., description="Username of the user requesting OTP")

    password: str = Field(..., description="Password of the user")