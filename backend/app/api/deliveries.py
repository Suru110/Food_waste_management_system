from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..db.session import get_db
from ..models import base as models
from ..schemas import delivery as schemas
from .deps import get_current_user
import datetime
from ..core.sms import notify_claim, notify_pickup, calculate_distance

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
        donation = db.query(models.Donation).join(models.Request).filter(models.Request.id == delivery.request_id).first()
        if not donation or (donation.donor_id != current_user.id and current_user.role != models.UserRole.ADMIN):
            raise HTTPException(status_code=403, detail="Only the donor can mark this delivery as picked up")
            
    elif delivery_update.status == models.DeliveryStatus.DELIVERED:
        request = db.query(models.Request).filter(models.Request.id == delivery.request_id).first()
        if not request or (request.receiver_id != current_user.id and current_user.role != models.UserRole.ADMIN):
            raise HTTPException(status_code=403, detail="Only the receiver can mark this delivery as delivered")
    
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
