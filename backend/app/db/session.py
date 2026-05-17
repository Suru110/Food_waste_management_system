from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./food_waste.db"
    DB_USER: str = ""
    DB_PASSWORD: str = ""
    DB_HOST: str = ""
    DB_PORT: str = "5432"
    DB_NAME: str = "postgres"
    SECRET_KEY: str = "yoursecretkey"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

if settings.DB_HOST and settings.DB_HOST.strip() and settings.DB_HOST.strip() not in ('""', "''"):
    from urllib.parse import quote_plus
    db_host = settings.DB_HOST.strip().strip("'").strip('"')
    db_user = settings.DB_USER.strip().strip("'").strip('"')
    db_password = settings.DB_PASSWORD.strip().strip("'").strip('"')
    db_port = str(settings.DB_PORT).strip().strip("'").strip('"')
    db_name = settings.DB_NAME.strip().strip("'").strip('"')
    
    encoded_password = quote_plus(db_password)
    SQLALCHEMY_DATABASE_URL = f"postgresql://{db_user}:{encoded_password}@{db_host}:{db_port}/{db_name}"
else:
    db_url = settings.DATABASE_URL
    if db_url:
        db_url = db_url.strip().strip("'").strip('"')
        if db_url.startswith("DATABASE_URL="):
            db_url = db_url.replace("DATABASE_URL=", "", 1).strip().strip("'").strip('"')
        
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
            
    SQLALCHEMY_DATABASE_URL = db_url or "sqlite:///./food_waste.db"

# Debug print to help identify URL issues in Render logs (hide password for security)
import re
safe_url_for_logs = re.sub(r':(.*?)\@', ':***@', SQLALCHEMY_DATABASE_URL)
print(f"Connecting to database with dialect prefix: {safe_url_for_logs.split('://')[0]}://")


if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
