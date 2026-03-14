from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from entities.User import User
from utils.auth_utils import get_current_user

oRouter = APIRouter(prefix="/users")

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
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """
    Returns the profile information of the currently logged-in user.
    """
    # current_user is already fetched from the DB by the dependency!
    return current_user


# --- 2. UPDATE MY PROFILE ---
@oRouter.put("/me", response_model=UserProfileResponse)
async def update_my_profile(
        update_data: UserProfileUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """
    Updates the name and surname of the currently logged-in user.
    """
    try:
        # Update the entity
        current_user.name = update_data.name
        current_user.surname = update_data.surname

        db.commit()
        db.refresh(current_user)

        return current_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating profile: {str(e)}")