from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
load_dotenv()

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
