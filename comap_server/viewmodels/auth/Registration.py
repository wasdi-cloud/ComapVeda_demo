from pydantic import BaseModel, Field, field_validator, EmailStr
from typing import Optional, List

class Registration(BaseModel):

    name: str = Field(..., min_length=1, description="name of the user")

    surname: str = Field(..., min_length=1, description="surname of the user")

    email: EmailStr = Field(..., description="email of the user")

    password: str = Field(..., min_length=8, description="password of the user (minimum 8 characters)")

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v
    
    @field_validator('name', 'surname')
    @classmethod
    def validate_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Field cannot be empty')
        return v.strip()