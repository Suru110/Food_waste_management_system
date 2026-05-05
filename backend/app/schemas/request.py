from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from ..models.base import RequestStatus
from .donation import DonationOut

class RequestBase(BaseModel):
    donation_id: int
    message: Optional[str] = None
    delivery_support: Optional[bool] = False
    delivery_lat: Optional[float] = None
    delivery_lng: Optional[float] = None
    delivery_address: Optional[str] = None

class RequestCreate(RequestBase):
    pass

class RequestUpdate(BaseModel):
    status: RequestStatus

class RequestOut(RequestBase):
    id: int
    receiver_id: int
    status: RequestStatus
    created_at: datetime
    donation: Optional[DonationOut] = None
    delivery: Optional['DeliveryOutBasic'] = None

    class Config:
        from_attributes = True

from .delivery import DeliveryOutBasic
RequestOut.model_rebuild()
