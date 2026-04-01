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
    bandpaths = Column(String, nullable=True)
    bbox = Column(String, nullable=True)
    date = Column(BigInteger, nullable=True)

    # RESTORED: This tells SQLAlchemy how to link Images and Labels
    labels = relationship("LabelEntity", backref="dataset_image", cascade="all, delete-orphan")