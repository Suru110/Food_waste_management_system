import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "food_waste.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Fix deliveries
cursor.execute("UPDATE deliveries SET status = 'DELIVERED' WHERE status = 'delivered'")
cursor.execute("UPDATE deliveries SET status = 'PICKED_UP' WHERE status = 'picked_up'")
cursor.execute("UPDATE deliveries SET status = 'ACCEPTED' WHERE status = 'accepted'")
cursor.execute("UPDATE deliveries SET status = 'PENDING' WHERE status = 'pending'")

# Fix requests
cursor.execute("UPDATE requests SET status = 'COMPLETED' WHERE status = 'completed'")
cursor.execute("UPDATE requests SET status = 'ACCEPTED' WHERE status = 'accepted'")
cursor.execute("UPDATE requests SET status = 'PENDING' WHERE status = 'pending'")
cursor.execute("UPDATE requests SET status = 'REJECTED' WHERE status = 'rejected'")

# Fix donations
cursor.execute("UPDATE donations SET status = 'COMPLETED' WHERE status = 'completed'")
cursor.execute("UPDATE donations SET status = 'CLAIMED' WHERE status = 'claimed'")
cursor.execute("UPDATE donations SET status = 'AVAILABLE' WHERE status = 'available'")
cursor.execute("UPDATE donations SET status = 'EXPIRED' WHERE status = 'expired'")

conn.commit()
conn.close()
print("Fixed statuses.")
