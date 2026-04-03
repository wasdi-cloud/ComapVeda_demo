import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
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


def ensure_legacy_schema_compatibility():
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    user_columns = {column["name"] for column in inspector.get_columns("users")}
    statements = []

    if "role" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR NOT NULL DEFAULT 'user'")
    if "confirmed" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN IF NOT EXISTS confirmed BOOLEAN NOT NULL DEFAULT FALSE")
    if "registration_otp" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_otp VARCHAR")
    if "created_at" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP")
    if "updated_at" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP")

    dataset_image_columns = {column["name"] for column in inspector.get_columns("dataset_images")}
    if "bandpaths" not in dataset_image_columns:
        statements.append("ALTER TABLE dataset_images ADD COLUMN IF NOT EXISTS bandpaths VARCHAR")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))

# Dependency for API
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()