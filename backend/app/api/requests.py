from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from ..db.session import get_db
from ..models import base as models
from ..schemas import request as schemas
from .deps import get_current_user
from ..core.sms import notify_volunteers_of_claim

router = APIRouter()

@router.post("/", response_model=schemas.RequestOut)
async def create_request(
    request: schemas.RequestCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.UserRole.INDIVIDUAL and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only individuals can claim food")
    
    # Check if donation exists and is available
    donation = db.query(models.Donation).filter(models.Donation.id == request.donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    if donation.status != models.DonationStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail="Food is no longer available")
    
    if donation.donor_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot claim your own donation")

    # Instant Claim Logic
    db_request = models.Request(
        **request.dict(),
        receiver_id=current_user.id,
        status=models.RequestStatus.ACCEPTED
    )
    db.add(db_request)
    
    # Mark donation as claimed
    donation.status = models.DonationStatus.CLAIMED

    db.commit()
    db.refresh(db_request)

    # Auto-create Delivery
    delivery = models.Delivery(
        request_id=db_request.id,
        status=models.DeliveryStatus.PENDING
    )
    db.add(delivery)
    db.commit()

    # Notify Volunteers (In Background)
    background_tasks.add_task(notify_volunteers_of_claim, db, donation, db_request)

    return db_request

@router.get("/my", response_model=List[schemas.RequestOut])
def get_my_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == models.UserRole.ADMIN:
        # Admins see all requests
        return db.query(models.Request).all()
    else:
        # Individuals see their own claims
        return db.query(models.Request).filter(models.Request.receiver_id == current_user.id).all()

@router.put("/{request_id}", response_model=schemas.RequestOut)
def update_request_status(
    request_id: int,
    request_update: schemas.RequestUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_request = db.query(models.Request).filter(models.Request.id == request_id).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    donation = db.query(models.Donation).filter(models.Donation.id == db_request.donation_id).first()
    
    # Only donor of the food OR the receiver can accept/reject/complete
    is_donor = donation.donor_id == current_user.id
    is_receiver = db_request.receiver_id == current_user.id
    is_admin = current_user.role == models.UserRole.ADMIN

    if not (is_donor or is_receiver or is_admin):
        raise HTTPException(status_code=403, detail="Not authorized to update this request")
    
    db_request.status = request_update.status
    
    # If accepted, mark donation as Claimed
    if request_update.status == models.RequestStatus.ACCEPTED:
        donation.status = models.DonationStatus.CLAIMED
        
        # Auto-create Delivery if requested
        if db_request.delivery_support:
            delivery = models.Delivery(
                request_id=db_request.id,
                status=models.DeliveryStatus.PENDING
            )
            db.add(delivery)

        # Reject other pending requests for the same donation
        other_requests = db.query(models.Request).filter(
            models.Request.donation_id == donation.id,
            models.Request.id != request_id,
            models.Request.status == models.RequestStatus.PENDING
        ).all()
        for r in other_requests:
            r.status = models.RequestStatus.REJECTED
    
    # If completed, mark donation as Completed
    if request_update.status == models.RequestStatus.COMPLETED:
        donation.status = models.DonationStatus.COMPLETED
        # Automatically mark associated delivery as delivered
        if db_request.delivery:
            db_request.delivery.status = models.DeliveryStatus.DELIVERED
            
    db.commit()
    db.refresh(db_request)
    return db_request
