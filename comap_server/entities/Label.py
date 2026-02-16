# entities/label.py
import uuid
from sqlalchemy import Column, String, Boolean, Integer, JSON
from database import Base
from geoalchemy2 import Geometry  # The spatial magic


class LabelEntity(Base):
    __tablename__ = 'labels'

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))

    # UML says String, but GeoAlchemy's Geometry type is better for PostGIS
    geometry = Column(Geometry('GEOMETRY', srid=4326), nullable=False)

    # Shape flags
    isPoint = Column(Boolean, default=False)
    isLine = Column(Boolean, default=False)
    isPolygon = Column(Boolean, default=False)

    # Users (Since the User entity doesn't exist yet, we store IDs as strings/JSON)
    annotator = Column(String, nullable=True)  # Will be ForeignKey to User later
    reviewers = Column(JSON, default=list)  # Stores User[] as list of IDs

    # Review details
    reviewCount = Column(Integer, default=0)
    reviewNotes = Column(JSON, default=list)  # Stores String[]

    # Composition mapping: The AttributeValue[] from the UML
    # Example format: [{"name": "roof", "type": "string", "value": "metal"}]
    attributes = Column(JSON, default=list)

    # NOTE: According to the main project UML (Image 1), Labels belong to a DatasetImage.
    # When we build DatasetImage, we will add: datasetImageId = Column(String, ForeignKey(...))