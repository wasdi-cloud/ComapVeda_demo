from pydantic import BaseModel, EmailStr


class ResendOtpRequest(BaseModel):
    email: EmailStr