"""
Authentication utility functions for password hashing, verification, and OTP generation.
"""
import secrets
import string
from passlib.context import CryptContext
from fastapi import Header, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from entities.LabellingTemplate import LabellingTemplateEntity
from database import get_db

# Import your DB entities (adjust paths if needed based on your folder structure)
from entities.Session import Session as SessionEntity
from entities.User import User
from entities.DatasetProject import DatasetProjectEntity

# Password hashing context using argon2
s_oPasswordContext = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(sPassword: str) -> str:
    """
    Hash a password using argon2.
    
    :param sPassword: Plain text password
    :return: Hashed password
    """
    return s_oPasswordContext.hash(sPassword)


def verify_password(sPlainPassword: str, sHashedPassword: str) -> bool:
    """
    Verify a password against its hash.
    
    :param plain_password: Plain text password to verify
    :param hashed_password: Hashed password to compare against
    :return: True if password matches, False otherwise
    """
    return s_oPasswordContext.verify(sPlainPassword, sHashedPassword)


def generate_otp(iLength: int = 6) -> str:
    """
    Generate a random OTP (numeric code).
    
    :param length: Length of the OTP (default: 6)
    :return: Random numeric OTP as string
    """
    return ''.join(secrets.choice(string.digits) for _ in range(iLength))


def generate_session_token(iLength: int = 32) -> str:
    """
    Generate a cryptographically secure random session token.
    
    :param iLength: Length of the token in bytes (default: 32)
    :return: Hexadecimal session token
    """
    return secrets.token_hex(iLength)


def get_current_user(
    x_session_token: str = Header(default=None),
    authorization: str = Header(default=None),
    oDatabase: DBSession = Depends(get_db)
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
    oSession = oDatabase.query(SessionEntity).filter(SessionEntity.token == sToken).first()
    if not oSession:
        raise HTTPException(status_code=401, detail="Invalid or expired session token. Please log in again.")

    # 3. Find the associated user
    oUser = oDatabase.query(User).filter(User.email == oSession.user_email).first()
    if not oUser:
        raise HTTPException(status_code=401, detail="User associated with this session no longer exists.")

    return oUser


def canWriteProject(
    oUser: User,
    sProjectId: str,
    oDatabase: DBSession
) -> bool:
    """
    Check whether a user has write access to a project.
    Write access is granted to project collaborators (owners, annotators, reviewers).
    """
    if not oUser or not sProjectId:
        return False

    oProject = oDatabase.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == sProjectId).first()
    if not oProject:
        return False

    sUserEmail = oUser.email
    aoOwners = set(oProject.owners or [])
    aoAnnotators = set(oProject.annotators or [])
    aoReviewers = set(oProject.reviewers or [])

    return sUserEmail in aoOwners or sUserEmail in aoAnnotators or sUserEmail in aoReviewers


def canReadProject(
    oUser: User,
    sProjectId: str,
    oDatabase: DBSession
) -> bool:
    """
    Check whether a user has read access to a project.
    Read access is granted to collaborators or to anyone for approved public projects.
    """
    if not sProjectId:
        return False

    oProject = oDatabase.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == sProjectId).first()
    if not oProject:
        return False

    # Public approved projects are readable without explicit collaboration.
    if oProject.isPublic and oProject.approved:
        return True

    if not oUser:
        return False

    sUserEmail = oUser.email
    aoOwners = set(oProject.owners or [])
    aoAnnotators = set(oProject.annotators or [])
    aoReviewers = set(oProject.reviewers or [])

    return sUserEmail in aoOwners or sUserEmail in aoAnnotators or sUserEmail in aoReviewers


def isProjectOwner(
    oUser: User,
    sProjectId: str,
    oDatabase: DBSession
) -> bool:
    """
    Check whether a user is the owner of a project.
    Only owners have permissions to manage collaborators and delete the project.
    """
    if not sProjectId:
        return False

    oProject = oDatabase.query(DatasetProjectEntity).filter(DatasetProjectEntity.id == sProjectId).first()
    if not oProject:
        return False

    # Public approved projects are readable without explicit collaboration.
    if oProject.isPublic and oProject.approved:
        return True

    if not oUser:
        return False

    sUserEmail = oUser.email
    aoOwners = set(oProject.owners or [])

    return sUserEmail in aoOwners



def canWriteTemplate(
    oUser: User,
    sTemplateId: str,
    oDatabase: DBSession
) -> bool:
    """
    Check whether a user has write access to a labelling template.
    """
    if not oUser or not sTemplateId:
        return False

    oTemplate = oDatabase.query(LabellingTemplateEntity).filter(LabellingTemplateEntity.id == sTemplateId).first()
    if not oTemplate:
        return False
    
    return oTemplate.creator == oUser.email