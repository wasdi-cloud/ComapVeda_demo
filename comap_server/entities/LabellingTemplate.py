import uuid

from sqlalchemy import Column, String, Boolean, Float, JSON, Integer

from database import Base


class LabellingTemplateEntity(Base):
    __tablename__ = "labelling_templates"

    # Auto-incrementing ID for the DB
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))

    # Basic Fields
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    colourAttributeName = Column(String, nullable=True)
    hasPolygons = Column(Boolean, default=False)
    hasLines = Column(Boolean, default=False)
    hasPoints = Column(Boolean, default=False)
    isFixedColorStyle = Column(Boolean, default=False)
    fixedColor = Column(String, nullable=True)
    # This stores the list of Attribute objects as a JSON blob
    attributes = Column(JSON)
    creationDate = Column(Float, nullable=True)
    creator = Column(String)
    # projectId = Column(String)

    # # Complex Fields (stored as JSON)
    # # This allows you to store ["point", "polygon"] directly
    # geometryTypes = Column(JSON)
