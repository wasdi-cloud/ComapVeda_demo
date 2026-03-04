from sqlalchemy import Column, String, DateTime, ForeignKey
from datetime import datetime, timedelta
from database import Base


class Session(Base):
    __tablename__ = "sessions"

    token = Column(String, primary_key=True, index=True, nullable=False)
    user_email = Column(String, ForeignKey("users.email", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    last_activity = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Set expiration to 24 hours from creation if not provided
        if not self.expires_at:
            self.expires_at = datetime.utcnow() + timedelta(hours=24)

    def is_expired(self) -> bool:
        """Check if the session has expired."""
        return datetime.utcnow() > self.expires_at

    def update_activity(self):
        """Update last activity timestamp."""
        self.last_activity = datetime.utcnow()

    def __repr__(self):
        return f"<Session(token='{self.token[:8]}...', user_email='{self.user_email}', expires_at='{self.expires_at}')>"
