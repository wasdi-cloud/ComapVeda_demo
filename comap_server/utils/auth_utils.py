"""
Authentication utility functions for password hashing, verification, and OTP generation.
"""
import secrets
import string
from passlib.context import CryptContext
from fastapi import Header, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from database import get_db

# Import your DB entities (adjust paths if needed based on your folder structure)
from entities.Session import Session as SessionEntity
from entities.User import User

# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    :param password: Plain text password
    :return: Hashed password
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    :param plain_password: Plain text password to verify
    :param hashed_password: Hashed password to compare against
    :return: True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def generate_otp(length: int = 6) -> str:
    """
    Generate a random OTP (numeric code).
    
    :param length: Length of the OTP (default: 6)
    :return: Random numeric OTP as string
    """
    return ''.join(secrets.choice(string.digits) for _ in range(length))


def generate_session_token(length: int = 32) -> str:
    """
    Generate a cryptographically secure random session token.
    
    :param length: Length of the token in bytes (default: 32)
    :return: Hexadecimal session token
    """
    return secrets.token_hex(length)


def get_current_user(
    x_session_token: str = Header(default=None),
    authorization: str = Header(default=None),
    db: DBSession = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from the session token.
    Checks both X-Session-Token and standard Bearer token.
    """
    # 1. Extract the token from headers
    sToken = x_session_token
    if not sToken and authorization and authorization.startswith("Bearer "):
        sToken = authorization.split(" ")[1]

    if not sToken:
        raise HTTPException(status_code=401, detail="Authentication credentials missing")

    # 2. Find the active session in the database
    oSession = db.query(SessionEntity).filter(SessionEntity.token == sToken).first()
    if not oSession:
        raise HTTPException(status_code=401, detail="Invalid or expired session token. Please log in again.")

    # 3. Find the associated user
    oUser = db.query(User).filter(User.email == oSession.user_email).first()
    if not oUser:
        raise HTTPException(status_code=401, detail="User associated with this session no longer exists.")

    return oUser