import enum
import uuid
from sqlalchemy import Column, String, Boolean, Integer, BigInteger, JSON, Enum, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


# --- 1. Define the Enums (from the UML) ---
class Missions(str, enum.Enum):
    S2 = "S2"
    CUSTOM = "CUSTOM"


class Tasks(str, enum.Enum):
    SEMANTING_SEGMENTATION = "SEMANTING_SEGMENTATION"
    OBJECT_DETECTION = "OBJECT_DETECTION"
    OTHER = "OTHER"


# --- 2. The Project Entity ---
class DatasetProjectEntity(Base):
    __tablename__ = 'dataset_projects'

    # ID: GUID
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))

    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    isGlobal = Column(Boolean, default=False)

    # Bounding box array (e.g., ["-74.0", "40.7", "-73.9", "40.8"])
    bbox = Column(JSON, nullable=True)
    isPublic = Column(Boolean, default=False)

    # Dates: UML specifies 'long', so we use BigInteger for Unix timestamps
    creationDate = Column(BigInteger, nullable=True)
    startDate = Column(BigInteger, nullable=True)
    endDate = Column(BigInteger, nullable=True)
    requestDate = Column(BigInteger, nullable=True)

    link = Column(String, nullable=True)

    # Flags & Counts
    annotatorsSeeAllLabels = Column(Boolean, default=False)
    reviewRequired = Column(Boolean, default=False)
    minReviewCount = Column(Integer, default=0)
    selfHosted = Column(Boolean, default=False)

    # Enums & Arrays
    mission = Column(Enum(Missions), nullable=True)
    # Tasks array (e.g. ["OBJECT_DETECTION", "SEMANTING_SEGMENTATION"])
    task = Column(JSON, nullable=True)

    # Storage & S3
    maxStorage = Column(Integer, nullable=True)
    s3Address = Column(String, nullable=True)
    s3User = Column(String, nullable=True)
    s3Password = Column(String, nullable=True)

    # Status Flags
    approved = Column(Boolean, default=False, nullable=True)
    rejected = Column(Boolean, default=False, nullable=True)
    rejectionNote = Column(String, nullable=True)

    # --- RELATIONSHIPS & FOREIGN KEYS ---

    # 1. Template (Foreign Key to LabellingTemplateEntity)
    # Notice this is a String now, because we changed Template ID to a GUID!
    template_id = Column(String, ForeignKey('labelling_templates.id'), nullable=True)
    # This allows you to say `my_project.template.name` in Python
    template = relationship("LabellingTemplateEntity")

    # 2. Image Style (One-to-One Relationship)
    # The ForeignKey is actually on the ImageStyle table, so we use `uselist=False`
    # to tell SQLAlchemy that a Project only has ONE style, not a list of them.
    style = relationship("ImageStyleEntity", backref="project", uselist=False, cascade="all, delete-orphan")

    # 3. Users & Images (Stored as JSON Arrays of Strings/IDs for now)
    # Since DatasetImage isn't a table, we just store the links/paths here.
    images = relationship("DatasetImageEntity", backref="project", cascade="all, delete-orphan")
    owners = Column(JSON, default=list)
    annotators = Column(JSON, default=list)
    reviewers = Column(JSON, default=list)