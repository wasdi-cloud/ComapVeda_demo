# entities/image_style.py
import uuid
from sqlalchemy import Column, String, Boolean, Integer
from database import Base


class ImageStyleEntity(Base):
    __tablename__ = 'image_styles'

    # Its own GUID
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Link to the Project (We will make this a Foreign Key later when Project is ready)
    projectId = Column(String, nullable=False, index=True)

    # Band Configurations
    singleBand = Column(Boolean, default=False)
    band1 = Column(String, nullable=True)
    band2 = Column(String, nullable=True)
    band3 = Column(String, nullable=True)

    # Adjustments
    brightness = Column(Integer, nullable=True)
    contrast = Column(Integer, nullable=True)
    hue = Column(Integer, nullable=True)
    saturation = Column(Integer, nullable=True)
    lightness = Column(Integer, nullable=True)

    # Levels
    autoLevel = Column(Boolean, default=False)
    saturateLevel = Column(Boolean, default=False)
    saturationValue = Column(Integer, nullable=True)