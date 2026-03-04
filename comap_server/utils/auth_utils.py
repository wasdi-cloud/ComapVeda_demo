"""
Authentication utility functions for password hashing, verification, and OTP generation.
"""
import secrets
import string
from passlib.context import CryptContext

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
