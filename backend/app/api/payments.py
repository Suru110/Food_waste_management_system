from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..models import base as models
from .deps import get_current_user
from ..core.sms import send_sms
from pydantic import BaseModel
import razorpay
import os
import uuid

router = APIRouter()

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

try:
    client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
except Exception as e:
    client = None

class OrderRequest(BaseModel):
    amount: int
    currency: str = "INR"

class OrderResponse(BaseModel):
    id: str
    amount: int
    currency: str

@router.post("/create-order", response_model=OrderResponse)
async def create_order(request: OrderRequest):
    if not client:
        raise HTTPException(status_code=500, detail="Razorpay client not initialized. Check your API keys.")
        
    try:
        data = {
            "amount": request.amount,
            "currency": request.currency,
            "receipt": f"receipt_{uuid.uuid4().hex[:8]}",
            "payment_capture": 1
        }
        order = client.order.create(data=data)
        return {"id": order["id"], "amount": order["amount"], "currency": order["currency"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class VerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    amount: float # in INR

@router.post("/verify")
async def verify_payment(
    request: VerifyRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not client:
        # If client is not initialized, we might be in mock mode
        if request.razorpay_signature == "mock_signature":
            current_user.total_monetary_donated += request.amount
            db.commit()
            
            # Send confirmation SMS
            if current_user.phone_number:
                try:
                    msg = f"Thank you {current_user.name} for your donation of ₹{request.amount}! Your contribution helps us fight food waste. - Team FoodShare"
                    await send_sms([current_user.phone_number], msg)
                except Exception as e:
                    print(f"Failed to send donation SMS: {e}")
                    
            return {"status": "success", "message": "Mock payment verified and recorded"}
        raise HTTPException(status_code=500, detail="Razorpay client not initialized.")
        
    try:
        params_dict = {
            'razorpay_order_id': request.razorpay_order_id,
            'razorpay_payment_id': request.razorpay_payment_id,
            'razorpay_signature': request.razorpay_signature
        }
        client.utility.verify_payment_signature(params_dict)
        
        # Update user's total donation
        current_user.total_monetary_donated += request.amount
        db.commit()
        
        # Send confirmation SMS
        if current_user.phone_number:
            try:
                msg = f"Thank you {current_user.name} for your donation of ₹{request.amount}! Your contribution helps us fight food waste. - Team FoodShare"
                await send_sms([current_user.phone_number], msg)
            except Exception as e:
                print(f"Failed to send donation SMS: {e}")
        
        return {"status": "success", "message": "Payment verified and recorded successfully"}
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
