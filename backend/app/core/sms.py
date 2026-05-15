import httpx
import logging
from typing import List, Optional
import os
import math
import socket
from sqlalchemy.orm import Session
from ..models import base as models

# Configure logging
logger = logging.getLogger(__name__)

# TextBee Configuration (Should be moved to environment variables)
TEXTBEE_API_KEY = os.getenv("TEXTBEE_API_KEY", "f29976c8-1bc8-49a5-9ce1-d274262a4027")
TEXTBEE_DEVICE_ID = os.getenv("TEXTBEE_DEVICE_ID", "69f03957b5cd3ce4c73d1d13")
TEXTBEE_BASE_URL = "https://api.textbee.dev/api/v1"

async def send_sms(recipients: List[str], message: str) -> bool:
    """
    Sends an SMS using TextBee API.
    """
    if TEXTBEE_API_KEY == "YOUR_TEXTBEE_API_KEY" or TEXTBEE_DEVICE_ID == "YOUR_DEVICE_ID":
        logger.warning("TextBee credentials not configured. SMS not sent.")
        return False

    url = f"{TEXTBEE_BASE_URL}/gateway/devices/{TEXTBEE_DEVICE_ID}/send-sms"
    headers = {
        "x-api-key": TEXTBEE_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "recipients": recipients,
        "message": message
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            logger.info(f"SMS sent successfully to {recipients}")
            return True
    except httpx.HTTPStatusError as e:
        logger.error(f"TextBee API error: {e.response.text}")
        return False
    except Exception as e:
        logger.error(f"Failed to send SMS: {e}")
        return False

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    Returns distance in kilometers.
    """
    logger.info(f"Calculating distance between ({lat1}, {lon1}) and ({lat2}, {lon2})")
    
    if None in [lat1, lon1, lat2, lon2]:
        logger.warning("One or more coordinates are None. Returning 0.0")
        return 0.0
        
    try:
        R = 6371  # Earth radius in kilometers
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) * math.sin(dlat / 2) +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon / 2) * math.sin(dlon / 2))
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        dist = R * c
        logger.info(f"Calculated distance: {dist:.2f} km")
        return dist
    except Exception as e:
        logger.error(f"Error calculating distance: {e}")
        return 0.0

async def notify_volunteers_of_claim(db: Session, donation: models.Donation, request: models.Request):
    """Notify all volunteers about a new claim."""
    volunteers = db.query(models.User).filter(models.User.role == models.UserRole.VOLUNTEER).all()
    if not volunteers:
        logger.info("No volunteers found to notify.")
        return

    # Calculate distance
    dist = calculate_distance(
        donation.location_lat, donation.location_lng,
        request.delivery_lat, request.delivery_lng
    )
    
    # Human-readable source and destination
    source = donation.address if donation.address else f"{donation.location_lat:.4f}, {donation.location_lng:.4f}"
    destination = request.delivery_address if request.delivery_address else (f"{request.delivery_lat:.4f}, {request.delivery_lng:.4f}" if request.delivery_lat else "Not specified")
    
    # Dashboard link (Using dynamic local IP for mobile access)
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        local_ip = "127.0.0.1"
        
    link = f"http://{local_ip}:5173/dashboard"
    
    approx_time_mins = math.ceil((dist / 40.0) * 60) if dist > 0 else 0
    time_str = f"~{approx_time_mins} mins" if approx_time_mins > 0 else "< 1 min"

    message = (
        f"🚨 New Food Delivery Available!\n"
        f"Food: {donation.food_type}\n"
        f"Distance: {dist:.1f} km\n"
        f"Approx Time: {time_str}\n"
        f"Source: {source}\n"
        f"Destination: {destination}\n"
        f"Accept here: {link}"
    )
    
    recipient_phones = [v.phone_number for v in volunteers if v.phone_number]
    if recipient_phones:
        await send_sms(recipient_phones, message)

async def notify_claim(phone: str, food_type: str, volunteer_name: str, delivery_time: str = "30-45 mins"):
    """Notify the recipient that their food has been claimed."""
    if not phone:
        return
    msg = f"Good news! Your request for {food_type} has been accepted by our volunteer {volunteer_name}. Estimated delivery time: {delivery_time}. They are on their way!"
    await send_sms([phone], msg)

async def notify_pickup(phone: str, food_type: str):
    """Notify the recipient that the food has been picked up."""
    if not phone:
        return
    msg = f"Your food ({food_type}) has been picked up by our volunteer and will reach you shortly."
    await send_sms([phone], msg)

async def notify_expiry(phone: str, food_type: str):
    """Notify the donor that their food has expired and sent to seva trusts."""
    if not phone:
        return
    msg = f"Your food donation ({food_type}) has reached its expiry time and has been sent to nearby seva trusts. Thank you for your contribution! - Team FoodShare"
    await send_sms([phone], msg)
