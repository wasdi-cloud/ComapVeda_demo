from pydantic import BaseModel


class UpdateForgotPasswordRequest(BaseModel):
    email: str
    otp_code: str
    new_password: str