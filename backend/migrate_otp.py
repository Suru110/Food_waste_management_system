import sqlite3
import os
import sys

db_path = os.path.join(os.path.dirname(__file__), "food_waste.db")

def migrate():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Add pickup_otp to deliveries
    try:
        print("Adding pickup_otp to deliveries table...")
        cursor.execute("ALTER TABLE deliveries ADD COLUMN pickup_otp TEXT")
    except sqlite3.OperationalError:
        print("pickup_otp already exists in deliveries")

    # Add delivery_otp to deliveries
    try:
        print("Adding delivery_otp to deliveries table...")
        cursor.execute("ALTER TABLE deliveries ADD COLUMN delivery_otp TEXT")
    except sqlite3.OperationalError:
        print("delivery_otp already exists in deliveries")

    conn.commit()
    conn.close()
    print("OTP Migration completed.")

if __name__ == "__main__":
    migrate()
