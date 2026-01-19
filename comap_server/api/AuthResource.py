from fastapi import APIRouter, HTTPException, Query

from schemas.auth import LoginModel, OtpModel, Registration


oRouter = APIRouter(prefix="/auth")

@oRouter.post("/register")
async def register(oRegistration: Registration):
    """
    Register a new user with validated data.
    
    :param oRegistration: Registration validator containing all required fields
    :return: dict confirming successful registration
    """
    try:
        # The Registration validator has already validated the input
        # Convert to dict for storage/processing
        dRegistrationDict = oRegistration.model_dump()

    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error registering user: {str(oE)}')
    


@oRouter.post("/confirmRegistration")
async def confirmRegistration(oOtpModel: OtpModel):
    """
    Confirm user registration using a token.

    :param oOtpModel: OTP model containing username and OTP code
    :return: dict confirming successful registration confirmation
    """
    try:
        # The OtpModel validator has already validated the input
        # Convert to dict for storage/processing
        dOtpDict = oOtpModel.model_dump()   
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error confirming registration: {str(oE)}')
    

@oRouter.post("/login")
async def login(oLoginModel: LoginModel):
    """
    Authenticate a user using username and password.

    :param oLoginModel: LoginModel containing username and password
    :return: dict containing authentication token upon successful login
    """
    try:
        # The LoginModel validator has already validated the input
        # Convert to dict for storage/processing
        dLoginDict = oLoginModel.model_dump()   
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error during login: {str(oE)}')
    

@oRouter.post("/recoverPassword")
async def recoverPassword(oOtpModel: OtpModel):
    """
    Recover user password using OTP.

    :param oOtpModel: OtpModel containing username and OTP code
    :return: dict confirming successful password recovery
    """
    try:
        # The OtpModel validator has already validated the input
        # Convert to dict for storage/processing
        dOtpDict = oOtpModel.model_dump()   
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error during password recovery: {str(oE)}')
    
@oRouter.post("/changePassword")
async def changePassword(oLoginModel: LoginModel, password_recovery: bool = Query(default=False)):
    """
    Change user password.

    :param oLoginModel: LoginModel containing username and new password
    :return: dict confirming successful password change
    """
    try:
        # The LoginModel validator has already validated the input
        # Convert to dict for storage/processing
        dLoginDict = oLoginModel.model_dump()   
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error changing password: {str(oE)}')
    

@oRouter.delete("/delete")
async def delete_user(username: str):
    """
    Delete a user by username.

    :param username: Username of the user to delete
    :return: dict confirming successful user deletion
    """
    try:
        # Delete user logic here
        return {
            "username": username
        }
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error deleting user: {str(oE)}')