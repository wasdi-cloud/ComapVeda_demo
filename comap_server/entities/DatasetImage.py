import uuid
from sqlalchemy import Column, String, BigInteger, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class DatasetImageEntity(Base):
    __tablename__ = 'dataset_images'

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    projectId = Column(String, ForeignKey('dataset_projects.id'), nullable=False, index=True)

    fileName = Column(String, nullable=True)
    link = Column(String, nullable=True)
    bbox = Column(String, nullable=True)
    date = Column(BigInteger, nullable=True)

    # --- FIX: COMMENT THIS OUT FOR THE DEMO HACK ---
    # labels = relationship("LabelEntity", backref="dataset_image", cascade="all, delete-orphan")
    # -----------------------------------------------