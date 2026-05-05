from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from ..models.base import DonationStatus

class DonationBase(BaseModel):
    food_type: str
    quantity: str
    description: str
    location_lat: float
    location_lng: float
    address: Optional[str] = None
    expiry_time: datetime
    image_url: Optional[str] = None

class DonationCreate(DonationBase):
    pass

class DonationUpdate(BaseModel):
    food_type: Optional[str] = None
    quantity: Optional[str] = None
    description: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    expiry_time: Optional[datetime] = None
    status: Optional[DonationStatus] = None

class DonationOut(DonationBase):
    id: int
    donor_id: int
    status: DonationStatus
    created_at: datetime
    donor: Optional['UserOut'] = None

    class Config:
        from_attributes = True

from .user import UserOut
DonationOut.model_rebuild()
