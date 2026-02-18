import enum
import uuid
from sqlalchemy import Column, String, Boolean, Integer, BigInteger, JSON, Enum, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


# --- NOTE: DO NOT IMPORT DatasetImageEntity HERE! ---
# Using the string "DatasetImageEntity" avoids the circular error.

class Missions(str, enum.Enum):
    S2 = "S2"
    CUSTOM = "CUSTOM"


class Tasks(str, enum.Enum):
    SEMANTING_SEGMENTATION = "SEMANTING_SEGMENTATION"
    OBJECT_DETECTION = "OBJECT_DETECTION"
    OTHER = "OTHER"


class DatasetProjectEntity(Base):
    __tablename__ = 'dataset_projects'

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    isGlobal = Column(Boolean, default=False)
    bbox = Column(JSON, nullable=True)
    isPublic = Column(Boolean, default=False)

    creationDate = Column(BigInteger, nullable=True)
    startDate = Column(BigInteger, nullable=True)
    endDate = Column(BigInteger, nullable=True)
    requestDate = Column(BigInteger, nullable=True)
    link = Column(String, nullable=True)

    annotatorsSeeAllLabels = Column(Boolean, default=False)
    reviewRequired = Column(Boolean, default=False)
    minReviewCount = Column(Integer, default=0)
    selfHosted = Column(Boolean, default=False)

    mission = Column(Enum(Missions), nullable=True)
    task = Column(JSON, nullable=True)

    maxStorage = Column(Integer, nullable=True)
    s3Address = Column(String, nullable=True)
    s3User = Column(String, nullable=True)
    s3Password = Column(String, nullable=True)

    approved = Column(Boolean, default=False, nullable=True)
    rejected = Column(Boolean, default=False, nullable=True)
    rejectionNote = Column(String, nullable=True)

    # --- RELATIONSHIPS ---

    # 1. Template
    template_id = Column(String, ForeignKey('labelling_templates.id'), nullable=True)
    template = relationship("LabellingTemplateEntity")

    # 2. Image Style
    style = relationship("ImageStyleEntity", backref="project", uselist=False, cascade="all, delete-orphan")

    # 3. Images (THE FIX IS HERE)
    # Use the STRING "DatasetImageEntity", not the class object.
    images = relationship("DatasetImageEntity", backref="project", cascade="all, delete-orphan")

    owners = Column(JSON, default=list)
    annotators = Column(JSON, default=list)
    reviewers = Column(JSON, default=list)