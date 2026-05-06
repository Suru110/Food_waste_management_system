from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import razorpay
import os
import uuid

router = APIRouter()

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_Sm7Z67uUnJKXDE")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "lEIIDHfvyvlVuJ7ZWpJzAPcc")

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
    if not client or RAZORPAY_KEY_ID == "rzp_test_some_key_here":
        # Fallback for dev environment
        return {"id": f"order_{uuid.uuid4().hex[:14]}", "amount": request.amount, "currency": request.currency}
        
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

@router.post("/verify")
async def verify_payment(request: VerifyRequest):
    if not client or RAZORPAY_KEY_ID == "rzp_test_some_key_here":
        return {"status": "success", "message": "Payment verified (Mocked)"}
        
    try:
        params_dict = {
            'razorpay_order_id': request.razorpay_order_id,
            'razorpay_payment_id': request.razorpay_payment_id,
            'razorpay_signature': request.razorpay_signature
        }
        client.utility.verify_payment_signature(params_dict)
        return {"status": "success", "message": "Payment verified successfully"}
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
