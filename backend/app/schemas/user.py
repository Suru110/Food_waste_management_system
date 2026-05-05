from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from ..models.base import UserRole

class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone_number: Optional[str] = None
    role: UserRole = UserRole.INDIVIDUAL

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    old_password: Optional[str] = None
    password: Optional[str] = None

class UserOut(UserBase):
    id: int
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    created_at: datetime
    donation_count: int = 0
    delivery_count: int = 0

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
