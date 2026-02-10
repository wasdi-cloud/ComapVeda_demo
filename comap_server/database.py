import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Load variables from .env file
load_dotenv()

# Get the URL (returns None if not found, so handle that if needed)
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency for API
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()