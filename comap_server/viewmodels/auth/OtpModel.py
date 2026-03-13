from pydantic import BaseModel, Field, field_validator
from typing import Optional, List

class OtpModel(BaseModel):

    email: str = Field(..., description="Username of the user requesting OTP")

    otp_code: str = Field(..., description="One-Time Password code sent to the user")