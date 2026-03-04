import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Load variables from .env file (default)
# Then override with .env.local if it exists (for local development)
load_dotenv()
env_local_path = Path(__file__).parent / '.env.local'
if env_local_path.exists():
    load_dotenv(dotenv_path=env_local_path, override=True)

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