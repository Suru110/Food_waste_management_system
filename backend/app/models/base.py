from ..db.session import Base
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum, Boolean
from sqlalchemy.orm import relationship
import enum
import datetime

class UserRole(str, enum.Enum):
    INDIVIDUAL = "individual"
    VOLUNTEER = "volunteer"
    ADMIN = "admin"

class DonationStatus(str, enum.Enum):
    AVAILABLE = "available"
    CLAIMED = "claimed"
    COMPLETED = "completed"
    EXPIRED = "expired"

class RequestStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COMPLETED = "completed"

class DeliveryStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    PICKED_UP = "picked_up"
    DELIVERED = "delivered"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    phone_number = Column(String, nullable=True)
    hashed_password = Column(String)
    role = Column(SQLEnum(UserRole), default=UserRole.INDIVIDUAL)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    total_monetary_donated = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    donations = relationship("Donation", back_populates="donor")
    requests = relationship("Request", back_populates="receiver")
    deliveries = relationship("Delivery", back_populates="rider")

    @property
    def donation_count(self):
        return len(self.donations)

    @property
    def delivery_count(self):
        return sum(1 for d in self.deliveries if d.status == DeliveryStatus.DELIVERED)

class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    donor_id = Column(Integer, ForeignKey("users.id"))
    food_type = Column(String)
    quantity = Column(String)
    description = Column(String)
    location_lat = Column(Float)
    location_lng = Column(Float)
    address = Column(String, nullable=True)
    expiry_time = Column(DateTime)
    image_url = Column(String, nullable=True)
    status = Column(SQLEnum(DonationStatus), default=DonationStatus.AVAILABLE)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    donor = relationship("User", back_populates="donations")
    requests = relationship("Request", back_populates="donation")

class Request(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True)
    donation_id = Column(Integer, ForeignKey("donations.id"))
    receiver_id = Column(Integer, ForeignKey("users.id"))
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.PENDING)
    message = Column(String, nullable=True)
    delivery_support = Column(Boolean, default=False)
    delivery_lat = Column(Float, nullable=True)
    delivery_lng = Column(Float, nullable=True)
    delivery_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    donation = relationship("Donation", back_populates="requests")
    receiver = relationship("User", back_populates="requests")
    delivery = relationship("Delivery", back_populates="request", uselist=False)

class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"))
    rider_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(SQLEnum(DeliveryStatus), default=DeliveryStatus.PENDING)
    pickup_otp = Column(String, nullable=True)
    delivery_otp = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    request = relationship("Request", back_populates="delivery")
    rider = relationship("User", back_populates="deliveries")
