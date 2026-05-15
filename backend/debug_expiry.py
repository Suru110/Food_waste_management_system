import datetime
import os
import sys

# Add the current directory to sys.path to import app
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models import base as models

def debug_donations():
    db = SessionLocal()
    now_utc = datetime.datetime.utcnow()
    now_local = datetime.datetime.now()
    
    print(f"Current UTC: {now_utc}")
    print(f"Current Local: {now_local}")
    print("-" * 50)
    
    donations = db.query(models.Donation).all()
    for d in donations:
        print(f"ID: {d.id}, Type: {d.food_type}, Status: {d.status}")
        print(f"Expiry: {d.expiry_time}")
        if d.expiry_time:
            print(f"Expired (UTC check): {d.expiry_time <= now_utc}")
            print(f"Expired (Local check): {d.expiry_time <= now_local}")
        print("-" * 20)
    db.close()

if __name__ == "__main__":
    debug_donations()
