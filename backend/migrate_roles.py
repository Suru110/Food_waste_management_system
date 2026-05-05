from app.db.session import SessionLocal
from app.models.base import User, UserRole

def migrate_roles():
    db = SessionLocal()
    try:
        # Update 'donor' and 'receiver' to 'individual'
        # Note: We need to handle cases where roles might be strings not in the current Enum
        users = db.query(User).all()
        for user in users:
            if user.role in ["donor", "receiver"]:
                user.role = UserRole.INDIVIDUAL
            elif user.role == "rider":
                user.role = UserRole.VOLUNTEER
        db.commit()
        print("Role migration completed successfully.")
    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_roles()
