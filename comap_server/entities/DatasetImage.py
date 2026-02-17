import uuid
from sqlalchemy import Column, String, Integer, BigInteger, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class DatasetImageEntity(Base):
    __tablename__ = 'dataset_images'

    # ID: GUID
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))

    # Foreign Key: Link back to the Project
    projectId = Column(String, ForeignKey('dataset_projects.id'), nullable=False, index=True)

    # Basic Fields (from UML)
    fileName = Column(String, nullable=True)
    link = Column(String, nullable=True)
    bbox = Column(String, nullable=True)  # Storing WKT string (e.g. "POLYGON(...)") as per UML
    date = Column(BigInteger, nullable=True)  # UML says Integer, but BigInteger is safer for timestamps

    # Relationship: One Image has Many Labels
    # todo verify this
    # cascade="all, delete-orphan" means if you delete the Image, all its Labels are deleted too.
    labels = relationship("LabelEntity", backref="dataset_image", cascade="all, delete-orphan")

