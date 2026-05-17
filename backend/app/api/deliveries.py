from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..db.session import get_db
from ..models import base as models
from ..schemas import delivery as schemas
from .deps import get_current_user
import datetime
from ..core.sms import notify_claim, notify_pickup, calculate_distance, notify_donor_pickup_otp, notify_receiver_delivery_otp
import random

router = APIRouter()

@router.get("/available", response_model=List[schemas.DeliveryOut])
def get_available_deliveries(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.UserRole.VOLUNTEER and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only volunteers can view available deliveries")
    
    return db.query(models.Delivery).filter(
        models.Delivery.status == models.DeliveryStatus.PENDING
    ).all()

@router.get("/my", response_model=List[schemas.DeliveryOut])
def get_my_deliveries(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.UserRole.VOLUNTEER:
        raise HTTPException(status_code=403, detail="Only volunteers can view their deliveries")
    
    return db.query(models.Delivery).filter(
        models.Delivery.rider_id == current_user.id
    ).all()

@router.get("/donor", response_model=List[schemas.DeliveryOut])
def get_donor_deliveries(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Delivery).join(models.Request).join(models.Donation).filter(
        models.Donation.donor_id == current_user.id,
        models.Delivery.status.in_([models.DeliveryStatus.ACCEPTED, models.DeliveryStatus.PICKED_UP])
    ).all()

@router.put("/{delivery_id}/accept", response_model=schemas.DeliveryOut)
async def accept_delivery(
    delivery_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.UserRole.VOLUNTEER:
        raise HTTPException(status_code=403, detail="Only volunteers can accept deliveries")

    delivery = db.query(models.Delivery).filter(models.Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    if delivery.status != models.DeliveryStatus.PENDING:
        raise HTTPException(status_code=400, detail="Delivery is no longer available")
    
    delivery.rider_id = current_user.id
    delivery.status = models.DeliveryStatus.ACCEPTED
    db.commit()
    db.refresh(delivery)

    # SMS Notification to recipient
    try:
        request = delivery.request
        recipient = request.receiver
        donation = request.donation
        
        # Calculate estimated time
        dist = calculate_distance(
            donation.location_lat, donation.location_lng,
            request.delivery_lat, request.delivery_lng
        )
        # Rough estimation: 5 min per km + 10 min overhead
        duration_min = round(dist * 5 + 10)
        est_time = f"{duration_min} minutes" if dist > 0 else "20-30 minutes"

        if recipient and recipient.phone_number:
            await notify_claim(recipient.phone_number, donation.food_type, current_user.name, est_time)
    except Exception as e:
        print(f"Failed to send claim notification: {e}")

    return delivery

@router.post("/{delivery_id}/generate-pickup-otp")
async def generate_pickup_otp(
    delivery_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    delivery = db.query(models.Delivery).filter(models.Delivery.id == delivery_id).first()
    if not delivery or delivery.rider_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    otp = str(random.randint(100000, 999999))
    delivery.pickup_otp = otp
    db.commit()
    
    request = delivery.request
    donation = request.donation
    if donation.donor and donation.donor.phone_number:
        await notify_donor_pickup_otp(donation.donor.phone_number, donation.food_type, current_user.name, otp)
    
    return {"message": "Pickup OTP sent"}

@router.post("/{delivery_id}/generate-delivery-otp")
async def generate_delivery_otp(
    delivery_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    delivery = db.query(models.Delivery).filter(models.Delivery.id == delivery_id).first()
    if not delivery or delivery.rider_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    otp = str(random.randint(100000, 999999))
    delivery.delivery_otp = otp
    db.commit()
    
    request = delivery.request
    if request.receiver and request.receiver.phone_number:
        await notify_receiver_delivery_otp(request.receiver.phone_number, request.donation.food_type, current_user.name, otp)
    
    return {"message": "Delivery OTP sent"}

@router.put("/{delivery_id}/status", response_model=schemas.DeliveryOut)
async def update_delivery_status(
    delivery_id: int,
    delivery_update: schemas.DeliveryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    delivery = db.query(models.Delivery).filter(models.Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
        
    if delivery_update.status == models.DeliveryStatus.PICKED_UP:
        if delivery.pickup_otp is not None:
            if not delivery_update.otp or delivery_update.otp.strip() != delivery.pickup_otp:
                raise HTTPException(status_code=400, detail="Invalid Pickup OTP")
        # Removed role check, OTP acts as authorization
            
    elif delivery_update.status == models.DeliveryStatus.DELIVERED:
        if delivery.delivery_otp is not None:
            if not delivery_update.otp or delivery_update.otp.strip() != delivery.delivery_otp:
                raise HTTPException(status_code=400, detail="Invalid Delivery OTP")
        # Removed role check, OTP acts as authorization
    
    # Simple state machine validation
    valid_transitions = {
        models.DeliveryStatus.ACCEPTED: [models.DeliveryStatus.PICKED_UP],
        models.DeliveryStatus.PICKED_UP: [models.DeliveryStatus.DELIVERED],
    }

    if delivery.status in valid_transitions and delivery_update.status not in valid_transitions[delivery.status]:
         raise HTTPException(status_code=400, detail=f"Cannot transition from {delivery.status} to {delivery_update.status}")

    delivery.status = delivery_update.status
    delivery.updated_at = datetime.datetime.utcnow()

    # If delivered, also mark request as COMPLETED
    if delivery_update.status == models.DeliveryStatus.DELIVERED:
        request = db.query(models.Request).filter(models.Request.id == delivery.request_id).first()
        if request:
            request.status = models.RequestStatus.COMPLETED
            # Also mark donation as completed
            donation = db.query(models.Donation).filter(models.Donation.id == request.donation_id).first()
            if donation:
                donation.status = models.DonationStatus.COMPLETED

    db.commit()
    db.refresh(delivery)

    # SMS Notification on Pickup
    if delivery_update.status == models.DeliveryStatus.PICKED_UP:
        try:
            request = delivery.request
            recipient = request.receiver
            donation = request.donation
            if recipient and recipient.phone_number:
                await notify_pickup(recipient.phone_number, donation.food_type)
        except Exception as e:
            print(f"Failed to send pickup notification: {e}")

    return delivery
