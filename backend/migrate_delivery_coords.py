import sqlite3
import os

db_path = "c:\\Users\\surab\\OneDrive\\Desktop\\food-waste\\backend\\food_waste.db"

def migrate():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        print("Adding delivery_lat to requests table...")
        cursor.execute("ALTER TABLE requests ADD COLUMN delivery_lat FLOAT")
    except sqlite3.OperationalError as e:
        print(f"delivery_lat might already exist: {e}")

    try:
        print("Adding delivery_lng to requests table...")
        cursor.execute("ALTER TABLE requests ADD COLUMN delivery_lng FLOAT")
    except sqlite3.OperationalError as e:
        print(f"delivery_lng might already exist: {e}")

    conn.commit()
    conn.close()
    print("Migration completed.")

if __name__ == "__main__":
    migrate()
