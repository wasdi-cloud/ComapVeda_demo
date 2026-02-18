import uuid
from sqlalchemy import Column, String, BigInteger, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class DatasetImageEntity(Base):
    __tablename__ = 'dataset_images'

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))

    # ForeignKey uses the TABLE NAME string 'dataset_projects.id', so no import needed.
    projectId = Column(String, ForeignKey('dataset_projects.id'), nullable=False, index=True)

    fileName = Column(String, nullable=True)
    link = Column(String, nullable=True)
    bbox = Column(String, nullable=True)
    date = Column(BigInteger, nullable=True)

    # Use String "LabelEntity" here too
    labels = relationship("LabelEntity", backref="dataset_image", cascade="all, delete-orphan")