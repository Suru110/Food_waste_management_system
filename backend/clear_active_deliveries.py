import sqlite3
import os
import datetime

db_path = os.path.join(os.path.dirname(__file__), "food_waste.db")

def clear_active():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Find all deliveries that are not DELIVERED
    cursor.execute("SELECT id, request_id FROM deliveries WHERE status != 'delivered'")
    active_deliveries = cursor.fetchall()
    
    now = datetime.datetime.utcnow().isoformat()

    print(f"Found {len(active_deliveries)} active deliveries to mark as delivered.")

    for del_id, req_id in active_deliveries:
        # Mark delivery as DELIVERED
        cursor.execute("UPDATE deliveries SET status = 'delivered', updated_at = ? WHERE id = ?", (now, del_id))
        
        # Mark request as COMPLETED
        cursor.execute("UPDATE requests SET status = 'completed' WHERE id = ?", (req_id,))
        
        # Mark donation as COMPLETED
        # Need to find donation_id from request
        cursor.execute("SELECT donation_id FROM requests WHERE id = ?", (req_id,))
        res = cursor.fetchone()
        if res:
            don_id = res[0]
            cursor.execute("UPDATE donations SET status = 'completed' WHERE id = ?", (don_id,))
            
    conn.commit()
    conn.close()
    print("Cleanup completed.")

if __name__ == "__main__":
    clear_active()
