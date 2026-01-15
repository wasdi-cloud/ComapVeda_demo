from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from shapely import wkt, errors

class ImageItem(BaseModel):

    title: str = Field(..., description="Title of the image item")

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

    startDate: int = Field(..., description="Start date of the image acquisition as Unix timestamp in milliseconds")

    endDate: int = Field(..., description="End date of the image acquisition as Unix timestamp in milliseconds")

    platform: str = Field(..., description="Satellite platform of the image")

    productType: str = Field(..., description="Type of product for the image")

    productLevel: str = Field(..., description="Product level of the image")

    cloudCover: float = Field(..., description="Cloud cover percentage of the image")

    bands: Optional[List[str]] = Field(None, description="List of bands available in the image")