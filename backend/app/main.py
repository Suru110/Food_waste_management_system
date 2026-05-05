from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import auth, donations, requests, users, deliveries, translation, payments
from .db.session import engine
from .models import base

# Create database tables
base.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Food Waste Management System", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(donations.router, prefix="/api/donations", tags=["Donations"])
app.include_router(requests.router, prefix="/api/requests", tags=["Requests"])
app.include_router(deliveries.router, prefix="/api/deliveries", tags=["Deliveries"])
app.include_router(translation.router, prefix="/api/translate", tags=["Translation"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Food Waste Management System API"}
