"""
Authentication dependencies for FastAPI endpoints.
Use these as dependencies to protect routes that require authentication.
"""
from datetime import datetime
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session as DBSession

from database import get_db
from entities.User import User
from entities.Session import Session


async def get_current_user(
    x_session_token: str = Header(..., description="Session token for authentication"),
    oDatabase: DBSession = Depends(get_db)
) -> User:
    """
    Dependency to validate session token and return the authenticated user.
    
    :param x_session_token: Session token from X-Session-Token header
    :param oDatabase: Database session
    :return: Authenticated User object
    :raises HTTPException: If session is invalid, expired, or user not found
    """
    # Find session by token
    session = oDatabase.query(Session).filter(Session.token == x_session_token).first()
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session token")
    
    # Check if session is expired
    if session.is_expired():
        # Delete expired session
        oDatabase.delete(session)
        oDatabase.commit()
        raise HTTPException(status_code=401, detail="Session expired. Please login again.")
    
    # Get user associated with session
    user = oDatabase.query(User).filter(User.email == session.user_email).first()
    
    if not user:
        # Session exists but user doesn't (shouldn't happen with FK constraint)
        oDatabase.delete(session)
        oDatabase.commit()
        raise HTTPException(status_code=401, detail="User not found")
    
    if not user.confirmed:
        raise HTTPException(status_code=403, detail="User not confirmed")
    
    # Update last activity
    session.update_activity()
    oDatabase.commit()
    
    return user


async def get_current_user_optional(
    x_session_token: str = Header(None, description="Optional session token"),
    db: DBSession = Depends(get_db)
) -> User | None:
    """
    Optional authentication dependency. Returns User if valid token provided, None otherwise.
    Use this for endpoints that work differently for authenticated vs anonymous users.
    
    :param x_session_token: Optional session token from X-Session-Token header
    :param db: Database session
    :return: User object if authenticated, None otherwise
    """
    if not x_session_token:
        return None
    
    try:
        return await get_current_user(x_session_token, db)
    except HTTPException:
        return None
