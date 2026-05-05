from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..db.session import get_db
from ..models import base as models
from ..schemas import donation as schemas
from .deps import get_current_user

router = APIRouter()

@router.post("/", response_model=schemas.DonationOut)
def create_donation(
    donation: schemas.DonationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.UserRole.INDIVIDUAL and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only individuals can post food")
    
    db_donation = models.Donation(
        **donation.dict(),
        donor_id=current_user.id
    )
    db.add(db_donation)
    db.commit()
    db.refresh(db_donation)
    return db_donation

@router.get("/my", response_model=List[schemas.DonationOut])
def get_my_donations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all donations created by the current user."""
    return db.query(models.Donation).filter(models.Donation.donor_id == current_user.id).all()

@router.get("/", response_model=List[schemas.DonationOut])
def get_donations(
    food_type: Optional[str] = None,
    status: Optional[models.DonationStatus] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Donation)
    if food_type:
        query = query.filter(models.Donation.food_type.icontains(food_type))
    if status:
        query = query.filter(models.Donation.status == status)
    return query.all()

@router.get("/{donation_id}", response_model=schemas.DonationOut)
def get_donation(donation_id: int, db: Session = Depends(get_db)):
    donation = db.query(models.Donation).filter(models.Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    return donation

@router.put("/{donation_id}", response_model=schemas.DonationOut)
def update_donation(
    donation_id: int,
    donation_update: schemas.DonationUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_donation = db.query(models.Donation).filter(models.Donation.id == donation_id).first()
    if not db_donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    
    if db_donation.donor_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to update this donation")
    
    update_data = donation_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_donation, key, value)
    
    db.commit()
    db.refresh(db_donation)
    return db_donation
