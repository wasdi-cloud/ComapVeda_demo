import logging

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from entities.User import User
from utils.auth_utils import get_current_user

oRouter = APIRouter(prefix="/users")

logger = logging.getLogger(__name__)

# todo verify this and then create seprate files , also add change password and change email
# --- PYDANTIC VIEWMODELS ---
class UserProfileResponse(BaseModel):
    email: str
    name: str
    surname: str
    role: str


class UserProfileUpdate(BaseModel):
    name: str
    surname: str


# --- 1. GET MY PROFILE ---
@oRouter.get("/me", response_model=UserProfileResponse)
async def get_my_profile(oCurrentUser: User = Depends(get_current_user)):
    """
    Returns the profile information of the currently logged-in user.
    """
    # current_user is already fetched from the DB by the dependency!
    return oCurrentUser


# --- 2. UPDATE MY PROFILE ---
@oRouter.put("/me", response_model=UserProfileResponse)
async def update_my_profile(
        update_data: UserProfileUpdate,
        oDatabase: Session = Depends(get_db),
        oCurrentUser: User = Depends(get_current_user)
):
    """
    Updates the name and surname of the currently logged-in user.
    """
    try:
        # Update the entity
        oCurrentUser.name = update_data.name
        oCurrentUser.surname = update_data.surname

        oDatabase.commit()
        oDatabase.refresh(oCurrentUser)

        return oCurrentUser
    except Exception as e:
        oDatabase.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating profile: {str(e)}")