from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from shapely import wkt, errors

class SearchResultItem(BaseModel):

    title: str = Field(..., description="Title of the image item")

    id: str = Field(..., description="Unique identifier for the image item - can be either a UUID or the image title")

    link: str = Field(..., description="URL link to access the image item")

    footprint: str = Field(..., description="Footprint of the image in WKT format")

    @field_validator("footprint")
    @classmethod
    def validateWKT(cls, v):
        if v is not None:
            try:
                geom = wkt.loads(v)
                if geom.is_empty:
                    raise ValueError("WKT geometry cannot be empty.")
            except errors.WKTReadingError as oE:
                raise ValueError(f"Invalid WKT format: {oE}")
        return v
    
    date: str = Field(..., description="Date of the imaege")

    startDate: str = Field(..., description="Start date of the image acquisition as Unix timestamp in milliseconds")

    endDate: str = Field(..., description="End date of the image acquisition as Unix timestamp in milliseconds")

    platform: str = Field(..., description="Satellite platform of the image")

    productType: str = Field(..., description="Type of product for the image")

    productLevel: str = Field(..., description="Product level of the image")

    instrument: Optional[str] = Field(None, description="Instrument used for the image acquisition")

    sensorOperationalMode: Optional[str] = Field(None, description="Operational mode of the sensor during image acquisition")

    cloudCover: float = Field(..., description="Cloud cover percentage of the image")

    orbitNumber: Optional[int] = Field(None, description="Orbit number of the satellite pass")  

    relativeOrbitNumber: Optional[int] = Field(None, description="Relative orbit number of the satellite pass")

    size: Optional[str] = Field(None, description="Human readable size of the image file, e.g., '150 MB'")

    bands: Optional[List[str]] = Field(None, description="List of bands available in the image")