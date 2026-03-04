from fastapi import APIRouter, HTTPException, Query, Depends, Header
from sqlalchemy.orm import Session as DBSession

from database import get_db
from entities.User import User
from entities.Session import Session
from utils.auth_utils import hash_password, verify_password, generate_otp, generate_session_token
from viewmodels.auth.LoginModel import LoginModel
from viewmodels.auth.OtpModel import OtpModel
from viewmodels.auth.Registration import Registration


oRouter = APIRouter(prefix="/auth")

@oRouter.post("/register")
async def register(oRegistration: Registration, db: DBSession = Depends(get_db)):
    """
    Register a new user with validated data.
    
    :param oRegistration: Registration validator containing all required fields
    :param db: Database session
    :return: dict confirming successful registration with OTP (for testing purposes)
    """
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == oRegistration.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Generate OTP for email confirmation
        otp = generate_otp(6)
        
        # Hash the password
        password_hash = hash_password(oRegistration.password)
        
        # Create new user
        new_user = User(
            email=oRegistration.email,
            name=oRegistration.name,
            surname=oRegistration.surname,
            password_hash=password_hash,
            confirmed=False,
            registration_otp=otp
        )
        
        # Add to database
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # TODO: Send OTP via email
        # For now, we return it in the response for testing
        return {
            "message": "Registration successful. Please check your email for the OTP.",
            "email": oRegistration.email,
            "otp": otp  # TODO: Remove this in production, send via email instead
        }
        
    except HTTPException:
        raise
    except Exception as oE:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Error registering user: {str(oE)}')
    


@oRouter.post("/confirmRegistration")
async def confirmRegistration(oOtpModel: OtpModel, db: DBSession = Depends(get_db)):
    """
    Confirm user registration using OTP and create initial session.

    :param oOtpModel: OTP model containing username (email) and OTP code
    :param db: Database session
    :return: dict containing session token for authenticated access
    """
    try:
        # Find user by email (username)
        user = db.query(User).filter(User.email == oOtpModel.username).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if user is already confirmed
        if user.confirmed:
            raise HTTPException(status_code=400, detail="User is already confirmed")
        
        # Verify OTP
        if user.registration_otp != oOtpModel.otp_code:
            raise HTTPException(status_code=400, detail="Invalid OTP code")
        
        # Confirm user
        user.confirmed = True
        user.registration_otp = None  # Clear the OTP after successful confirmation
        
        # Generate session token
        session_token = generate_session_token(32)
        
        # Create new session
        new_session = Session(
            token=session_token,
            user_email=user.email
        )
        
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        
        return {
            "message": "Registration confirmed successfully",
            "email": user.email,
            "session_token": session_token,
            "expires_at": new_session.expires_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as oE:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Error confirming registration: {str(oE)}')
    

@oRouter.post("/login")
async def login(oLoginModel: LoginModel, db: DBSession = Depends(get_db)):
    """
    Authenticate a user using username (email) and password.

    :param oLoginModel: LoginModel containing username and password
    :param db: Database session
    :return: dict containing authentication token upon successful login
    """
    try:
        # Find user by email (username)
        user = db.query(User).filter(User.email == oLoginModel.username).first()
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Check if user is confirmed
        if not user.confirmed:
            raise HTTPException(status_code=403, detail="User not confirmed. Please confirm your registration first.")
        
        # Verify password
        if not verify_password(oLoginModel.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Generate session token
        session_token = generate_session_token(32)
        
        # Create new session
        new_session = Session(
            token=session_token,
            user_email=user.email
        )
        
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        
        return {
            "message": "Login successful",
            "email": user.email,
            "name": user.name,
            "surname": user.surname,
            "session_token": session_token,
            "expires_at": new_session.expires_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as oE:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Error during login: {str(oE)}')
    

@oRouter.post("/logout")
async def logout(x_session_token: str = Header(...), db: DBSession = Depends(get_db)):
    """
    Logout user by deleting their session.

    :param x_session_token: Session token from header
    :param db: Database session
    :return: dict confirming successful logout
    """
    try:
        # Find session by token
        session = db.query(Session).filter(Session.token == x_session_token).first()
        
        if not session:
            raise HTTPException(status_code=401, detail="Invalid or expired session token")
        
        # Delete the session
        db.delete(session)
        db.commit()
        
        return {
            "message": "Logout successful"
        }
        
    except HTTPException:
        raise
    except Exception as oE:
        db.rollback()
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