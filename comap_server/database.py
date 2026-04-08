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

from sqlalchemy import inspect, text


def ensure_legacy_schema_compatibility():
    inspector = inspect(engine)
    statements = []

    # 1. USERS TABLE
    if "users" in inspector.get_table_names():
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "role" not in user_columns:
            statements.append("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR NOT NULL DEFAULT 'user'")
        if "confirmed" not in user_columns:
            statements.append("ALTER TABLE users ADD COLUMN IF NOT EXISTS confirmed BOOLEAN NOT NULL DEFAULT FALSE")
        if "registration_otp" not in user_columns:
            statements.append("ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_otp VARCHAR")
        if "created_at" not in user_columns:
            statements.append(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP")
        if "updated_at" not in user_columns:
            statements.append(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP")

    # 2. DATASET IMAGES TABLE
    if "dataset_images" in inspector.get_table_names():
        dataset_image_columns = {column["name"] for column in inspector.get_columns("dataset_images")}
        if "bandpaths" not in dataset_image_columns:
            statements.append("ALTER TABLE dataset_images ADD COLUMN IF NOT EXISTS bandpaths VARCHAR")

    # ═══════════════════════════════════════════════════════════════════
    # 3. LABELLING TEMPLATES TABLE (Your New Feature!)
    # ═══════════════════════════════════════════════════════════════════
    if "labelling_templates" in inspector.get_table_names():
        template_columns = {column["name"] for column in inspector.get_columns("labelling_templates")}

        if "isSelfIntersectAllowed" not in template_columns:
            statements.append(
                "ALTER TABLE labelling_templates ADD COLUMN IF NOT EXISTS \"isSelfIntersectAllowed\" BOOLEAN DEFAULT FALSE")

        if "isPolygonsIntersectAllowed" not in template_columns:
            statements.append(
                "ALTER TABLE labelling_templates ADD COLUMN IF NOT EXISTS \"isPolygonsIntersectAllowed\" BOOLEAN DEFAULT FALSE")
        if "hasMultiPolygons" not in template_columns:
            statements.append(
                "ALTER TABLE labelling_templates ADD COLUMN IF NOT EXISTS \"hasMultiPolygons\" BOOLEAN DEFAULT FALSE")
    # ═══════════════════════════════════════════════════════════════════

    if not statements:
        return

    # Execute all missing column injections at once
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