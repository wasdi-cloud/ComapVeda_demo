"""
Database initialization script.
Run this to create all tables in the database.
"""
from database import engine, Base
from entities.User import User
from entities.Session import Session
# Import other entities as they are created
# from entities.DatasetProject import DatasetProject
# from entities.DatasetImage import DatasetImage
# etc.


def init_db():
    """Create all tables in the database."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")


if __name__ == "__main__":
    init_db()
