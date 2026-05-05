from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from ..models.base import DeliveryStatus

class DeliveryBase(BaseModel):
    pass

class DeliveryCreate(DeliveryBase):
    request_id: int

class DeliveryUpdate(BaseModel):
    status: DeliveryStatus

from .user import UserOut

class DeliveryOutBasic(DeliveryBase):
    id: int
    request_id: int
    rider_id: Optional[int] = None
    status: DeliveryStatus
    created_at: datetime
    updated_at: datetime
    rider: Optional[UserOut] = None

    class Config:
        from_attributes = True

from .request import RequestOut

class DeliveryOut(DeliveryOutBasic):
    request: Optional[RequestOut] = None

