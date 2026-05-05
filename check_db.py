
import sqlite3

def check_db():
    conn = sqlite3.connect('backend/food_waste.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, role FROM users;")
    rows = cursor.fetchall()
    for row in rows:
        print(row)
    conn.close()

if __name__ == "__main__":
    check_db()
