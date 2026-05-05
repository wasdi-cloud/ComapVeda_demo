import logging

from fastapi import APIRouter, HTTPException, Query, Depends, Header
from sqlalchemy.orm import Session as DBSession

from database import get_db
from entities.User import User
from entities.Session import Session
from utils import MailUtils
from utils.auth_utils import hash_password, verify_password, generate_otp, generate_session_token
from viewmodels.auth.ForgotPasswordRequest import ForgotPasswordRequest
from viewmodels.auth.ResendOtpRequest import ResendOtpRequest
from viewmodels.auth.LoginModel import LoginModel
from viewmodels.auth.OtpModel import OtpModel
from viewmodels.auth.Registration import Registration
from viewmodels.auth.UpdateForgotPasswordRequest import UpdateForgotPasswordRequest

oRouter = APIRouter(prefix="/auth")

logger = logging.getLogger(__name__)

@oRouter.post("/register")
async def register(oRegistration: Registration, oDatabase: DBSession = Depends(get_db)):
    """
    Register a new user with validated data.
    
    :param oRegistration: Registration validator containing all required fields
    :param db: Database session
    :return: dict confirming successful registration with OTP (for testing purposes)
    """
    try:
        # Check if user already exists
        oExistingUser = oDatabase.query(User).filter(User.email == oRegistration.email).first()
        if oExistingUser:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Generate OTP for email confirmation
        sOtp = generate_otp(6)
        
        # Hash the password
        sPasswordHash = hash_password(oRegistration.password)
        
        # Create new user
        oNewUser = User(
            email=oRegistration.email,
            name=oRegistration.name,
            surname=oRegistration.surname,
            password_hash=sPasswordHash,
            confirmed=False,
            registration_otp=sOtp
        )
        
        # Add to database
        oDatabase.add(oNewUser)
        oDatabase.commit()
        oDatabase.refresh(oNewUser)
        
        # TODO: Send OTP via email
        sTitle="OTP"
        sMessage=sOtp

        MailUtils.sendEmailMailJet("sysadmin@wasdi.cloud", oRegistration.email, sTitle, sMessage,False)

        # For now, we return it in the response for testing
        return {
            "message": "Registration successful. Please check your email for the OTP.",
            "email": oRegistration.email,
            # "otp": sOtp  # TODO: Remove this in production, send via email instead
        }
        
    except HTTPException:
        raise
    except Exception as oE:
        oDatabase.rollback()
        raise HTTPException(status_code=500, detail=f'Error registering user: {str(oE)}')


@oRouter.post("/resendOtp")
async def resendOtp(oRequest: ResendOtpRequest, oDatabase: DBSession = Depends(get_db)):
    """
    Generate and send a new OTP for an unconfirmed user.

    :param oRequest: Request containing the user's email
    :param oDatabase: Database session
    :return: dict confirming the new OTP was sent
    """
    try:
        # 1. Check if user actually exists
        oExistingUser = oDatabase.query(User).filter(User.email == oRequest.email).first()

        if not oExistingUser:
            # Standard security practice: Don't reveal if an email exists or not to prevent enumeration attacks.
            # Just return a generic success message, or if it's an internal app, a 404 is fine.
            raise HTTPException(status_code=404, detail="User with this email not found")

        # 2. Check if they are already confirmed!
        if oExistingUser.confirmed:
            raise HTTPException(status_code=400, detail="User is already confirmed. Please log in.")

        # 3. Generate a fresh OTP
        sNewOtp = generate_otp(6)

        # 4. Update the database with the new OTP
        oExistingUser.registration_otp = sNewOtp
        oDatabase.commit()

        # 5. Send the new OTP via email
        sTitle = "Your New Verification Code"
        sMessage = f"Hello {oExistingUser.name},\n\nYour new OTP code is: {sNewOtp}\n\nPlease use this to confirm your account."

        MailUtils.sendEmailMailJet("sysadmin@wasdi.cloud", oExistingUser.email, sTitle, sMessage, False)

        return {
            "message": "A new OTP has been sent to your email address.",
            "email": oExistingUser.email
        }

    except HTTPException:
        raise
    except Exception as oE:
        oDatabase.rollback()
        raise HTTPException(status_code=500, detail=f'Error resending OTP: {str(oE)}')

@oRouter.post("/confirmRegistration")
async def confirmRegistration(oOtpModel: OtpModel, oDatabase: DBSession = Depends(get_db)):
    """
    Confirm user registration using OTP and create initial session.

    :param oOtpModel: OTP model containing username (email) and OTP code
    :param oDatabase: Database session
    :return: dict containing session token for authenticated access
    """
    try:
        # Find user by email (username)
        oUser = oDatabase.query(User).filter(User.email == oOtpModel.email).first()
        
        if not oUser:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if user is already confirmed
        if oUser.confirmed:
            raise HTTPException(status_code=400, detail="User is already confirmed")
        
        # Verify OTP
        # Check Disabled until we do not implment the email sending.
        if oUser.registration_otp != oOtpModel.otp_code:
          raise HTTPException(status_code=400, detail="Invalid OTP code")
        
        # Confirm user
        oUser.confirmed = True
        oUser.registration_otp = None  # Clear the OTP after successful confirmation
        
        # Generate session token
        sSessionToken = generate_session_token(32)
        
        # Create new session
        oNewSession = Session(
            token=sSessionToken,
            user_email=oUser.email
        )
        
        oDatabase.add(oNewSession)
        oDatabase.commit()
        oDatabase.refresh(oNewSession)
        
        return {
            "message": "Registration confirmed successfully",
            "email": oUser.email,
            "name": oUser.name,
            "surname": oUser.surname,
            "role": oUser.role,
            "session_token": sSessionToken,
            "expires_at": oNewSession.expires_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as oE:
        oDatabase.rollback()
        raise HTTPException(status_code=500, detail=f'Error confirming registration: {str(oE)}')
    

@oRouter.post("/login")
async def login(oLoginModel: LoginModel, oDatabase: DBSession = Depends(get_db)):
    """
    Authenticate a user using username (email) and password.

    :param oLoginModel: LoginModel containing username and password
    :param oDatabase: Database session
    :return: dict containing authentication token upon successful login
    """
    try:
        # Find user by email (username)
        oUser = oDatabase.query(User).filter(User.email == oLoginModel.username).first()
        
        if not oUser:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Check if user is confirmed
        if not oUser.confirmed:
            raise HTTPException(status_code=403, detail="User not confirmed. Please confirm your registration first.")
        
        # Verify password
        if not verify_password(oLoginModel.password, oUser.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Generate session token
        sToken = generate_session_token(32)
        
        # Create new session
        oSession = Session(
            token=sToken,
            user_email=oUser.email
        )
        
        oDatabase.add(oSession)
        oDatabase.commit()
        oDatabase.refresh(oSession)
        
        return {
            "message": "Login successful",
            "email": oUser.email,
            "name": oUser.name,
            "surname": oUser.surname,
            "role": oUser.role,
            "session_token": sToken,
            "expires_at": oSession.expires_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as oE:
        oDatabase.rollback()
        raise HTTPException(status_code=500, detail=f'Error during login: {str(oE)}')
    

@oRouter.post("/logout")
async def logout(x_session_token: str = Header(...), oDatabase: DBSession = Depends(get_db)):
    """
    Logout user by deleting their session.

    :param x_session_token: Session token from header
    :param oDatabase: Database session
    :return: dict confirming successful logout
    """
    try:
        # Find session by token
        oSession = oDatabase.query(Session).filter(Session.token == x_session_token).first()
        
        if not oSession:
            raise HTTPException(status_code=401, detail="Invalid or expired session token")
        
        # Delete the session
        oDatabase.delete(oSession)
        oDatabase.commit()
        
        return {
            "message": "Logout successful"
        }
        
    except HTTPException:
        raise
    except Exception as oE:
        oDatabase.rollback()
        raise HTTPException(status_code=500, detail=f'Error during logout: {str(oE)}')
    

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


# ==========================================
# FORGOT PASSWORD WIZARD ENDPOINTS
# ==========================================

# --- 1. SEND OTP ---
@oRouter.post("/forgotPassword")
async def forgotPassword(oRequest: ForgotPasswordRequest, oDatabase: DBSession = Depends(get_db)):
    try:
        oUser = oDatabase.query(User).filter(User.email == oRequest.email).first()

        if not oUser:
            # Security best practice: Don't reveal if the email exists
            return {"message": "If the email is registered, an OTP has been sent."}

        # Generate a 6-digit OTP
        sOtp = generate_otp(6)

        # Save it to the database
        oUser.registration_otp = sOtp
        oDatabase.commit()

        # Send the email
        sTitle = "Password Reset Request"
        sMessage = f"Hello {oUser.name},\n\nYou requested a password reset. Your One-Time Password (OTP) is: {sOtp}\n\nIf you did not request this, please ignore this email."

        MailUtils.sendEmailMailJet("sysadmin@wasdi.cloud", oUser.email, sTitle, sMessage, False)

        return {"message": "If the email is registered, an OTP has been sent."}

    except Exception as oE:
        oDatabase.rollback()
        raise HTTPException(status_code=500, detail=f'Error in forgot password: {str(oE)}')


# --- 2. VERIFY OTP ---
@oRouter.post("/verifyForgotPasswordOtp")
async def verifyForgotPasswordOtp(oOtpModel: OtpModel, oDatabase: DBSession = Depends(get_db)):
    try:
        oUser = oDatabase.query(User).filter(User.email == oOtpModel.email).first()

        if not oUser or oUser.registration_otp != oOtpModel.otp_code:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

        return {"message": "OTP verified successfully."}

    except HTTPException:
        raise
    except Exception as oE:
        raise HTTPException(status_code=500, detail=f'Error verifying OTP: {str(oE)}')


# --- 3. SAVE NEW PASSWORD ---
@oRouter.post("/updateForgotPassword")
async def updateForgotPassword(oRequest: UpdateForgotPasswordRequest, oDatabase: DBSession = Depends(get_db)):
    try:
        oUser = oDatabase.query(User).filter(User.email == oRequest.email).first()

        # Double check the OTP one last time before saving!
        if not oUser or oUser.registration_otp != oRequest.otp_code:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

        # Hash the new password
        sNewPasswordHash = hash_password(oRequest.new_password)

        # Update user record and clear the OTP so it can't be reused
        oUser.password_hash = sNewPasswordHash
        oUser.registration_otp = None

        oDatabase.commit()

        return {"message": "Password updated successfully."}

    except HTTPException:
        raise
    except Exception as oE:
        oDatabase.rollback()
        raise HTTPException(status_code=500, detail=f'Error updating password: {str(oE)}')