from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..db.session import get_db
from ..models import base as models
from ..schemas import user as schemas
from .deps import get_current_user, get_current_active_admin

router = APIRouter()

@router.get("/me", response_model=schemas.UserOut)
def read_user_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=schemas.UserOut)
def update_user_me(
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if user_update.name is not None:
        current_user.name = user_update.name
    if user_update.email is not None:
        # Check if email already exists
        if user_update.email != current_user.email:
            existing_user = db.query(models.User).filter(models.User.email == user_update.email).first()
            if existing_user:
                raise HTTPException(status_code=400, detail="Email already registered")
            current_user.email = user_update.email
    if user_update.phone_number is not None:
        current_user.phone_number = user_update.phone_number
    if user_update.password is not None:
        from ..core.security import get_password_hash, verify_password
        if not user_update.old_password or not verify_password(user_update.old_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect old password")
        current_user.hashed_password = get_password_hash(user_update.password)
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/", response_model=List[schemas.UserOut])
def read_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_active_admin)
):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@router.put("/location", response_model=schemas.UserOut)
def update_user_location(
    lat: float,
    lng: float,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    current_user.current_lat = lat
    current_user.current_lng = lng
    db.commit()
    db.refresh(current_user)
    return current_user

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_active_admin)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"detail": "User deleted successfully"}
