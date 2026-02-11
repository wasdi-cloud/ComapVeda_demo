from sqlalchemy import Column, Integer, String, Boolean, Float, JSON
from database import Base


class LabellingTemplateEntity(Base):
    __tablename__ = "labelling_templates"

    # Auto-incrementing ID for the DB
    id = Column(Integer, primary_key=True, index=True)

    # Basic Fields
    name = Column(String, index=True)
    creator = Column(String)
    description = Column(String, nullable=True)

    # Complex Fields (stored as JSON)
    # This allows you to store ["point", "polygon"] directly
    geometryTypes = Column(JSON)

    # This stores the list of Attribute objects as a JSON blob
    attributes = Column(JSON)

    isSingleColorStyle = Column(Boolean, default=False)
    featureColor = Column(String, nullable=True)
    creationDate = Column(Float, nullable=True)
    projectId = Column(String)