import uuid
from sqlalchemy import Column, String, Boolean, Integer, JSON, ForeignKey, BigInteger
from database import Base
from geoalchemy2 import Geometry


class LabelEntity(Base):
    __tablename__ = 'labels'

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))

    # --- THIS WAS MISSING ---
    # This connects the Label to the Image.
    datasetImageId = Column(String, ForeignKey('dataset_images.id'), nullable=False)
    # ------------------------

    # Geometry (The shape)
    geometry = Column(Geometry('GEOMETRY', srid=4326), nullable=False)

    # Metadata
    isPoint = Column(Boolean, default=False)
    isLine = Column(Boolean, default=False)
    isPolygon = Column(Boolean, default=False)

    creatorId = Column(String, nullable=True)
    creationDate = Column(BigInteger, nullable=True)

    # JSON Arrays
    attributes = Column(JSON, default=list)
    reviewers = Column(JSON, default=list)
    reviewCount = Column(Integer, default=0)
    reviewNotes = Column(JSON, default=list)