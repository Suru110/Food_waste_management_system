import sqlite3
import os

db_path = "c:\\Users\\surab\\OneDrive\\Desktop\\food-waste\\backend\\food_waste.db"

def migrate():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Add address to donations
    try:
        print("Adding address to donations table...")
        cursor.execute("ALTER TABLE donations ADD COLUMN address TEXT")
    except sqlite3.OperationalError:
        print("address already exists in donations")

    # Add delivery_address to requests
    try:
        print("Adding delivery_address to requests table...")
        cursor.execute("ALTER TABLE requests ADD COLUMN delivery_address TEXT")
    except sqlite3.OperationalError:
        print("delivery_address already exists in requests")

    # Add current_lat to users
    try:
        print("Adding current_lat to users table...")
        cursor.execute("ALTER TABLE users ADD COLUMN current_lat FLOAT")
    except sqlite3.OperationalError:
        print("current_lat already exists in users")

    # Add current_lng to users
    try:
        print("Adding current_lng to users table...")
        cursor.execute("ALTER TABLE users ADD COLUMN current_lng FLOAT")
    except sqlite3.OperationalError:
        print("current_lng already exists in users")

    conn.commit()
    conn.close()
    print("Migration completed.")

if __name__ == "__main__":
    migrate()
