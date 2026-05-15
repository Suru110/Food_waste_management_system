from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import asyncio
import datetime
from dotenv import load_dotenv
load_dotenv()

from .api import auth, donations, requests, users, deliveries, translation, payments
from .db.session import engine, SessionLocal
from .models import base as models
from .core.sms import notify_expiry

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Food Waste Management System", version="1.0.0")

# Background task for expired donations
async def check_expired_donations():
    while True:
        try:
            db = SessionLocal()
            now = datetime.datetime.now()
            
            # Find AVAILABLE donations that have expired
            expired_donations = db.query(models.Donation).filter(
                models.Donation.status == models.DonationStatus.AVAILABLE,
                models.Donation.expiry_time <= now
            ).all()
            
            for donation in expired_donations:
                print(f"Processing expired donation: {donation.id} - {donation.food_type}")
                donation.status = models.DonationStatus.EXPIRED
                db.commit()
                
                # Notify the donor
                if donation.donor and donation.donor.phone_number:
                    # Run notification in background to not block the loop
                    asyncio.create_task(notify_expiry(donation.donor.phone_number, donation.food_type))
            
            db.close()
        except Exception as e:
            print(f"Error in background task: {e}")
        
        # Wait for 60 seconds before next check
        await asyncio.sleep(60)

@app.on_event("startup")
async def startup_event():
    # Start the background task
    asyncio.create_task(check_expired_donations())

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

# Serve static files for frontend
frontend_path = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")

    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc):
        # Check if the request is for an API route
        if request.url.path.startswith("/api"):
            return {"detail": "Not Found"}
        # For all other routes, serve index.html to support React Router
        index_path = os.path.join(frontend_path, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"detail": "Not Found"}
else:
    print(f"Frontend static path not found at {frontend_path}. Please build the frontend first.")
