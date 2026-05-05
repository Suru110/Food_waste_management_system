from app.db.session import SessionLocal
from app.models.base import User

def check_roles():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        roles = {}
        for u in users:
            roles[u.role] = roles.get(u.role, 0) + 1
        print(f"Current roles in DB: {roles}")
    finally:
        db.close()

if __name__ == "__main__":
    check_roles()
