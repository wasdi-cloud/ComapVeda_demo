from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from shapely import wkt, errors



class MultiBandStyle(BaseModel):
    redBand: str = Field(..., description="Band to be used for the red channel")
    
    greenBand: str = Field(..., description="Band to be used for the green channel")
    
    blueBand: str = Field(..., description="Band to be used for the blue channel")



class ImageStyle(BaseModel):

    imageStyleId: Optional[str] = Field(None, description="Unique identifier for the image style")

    projectId: str = Field(..., description="Unique identifier for the project associated with the image style")

    imageName: str = Field(..., description="Name of the image associated with the style")

    renderType: str = Field(..., description="Type of rendering to be applied to the image")

    singleBand: Optional[str] = Field(None, description="Single band to be used for rendering, if applicable")

    multiBand: Optional[MultiBandStyle] = Field(None, description="Multi-band style configuration, if applicable")

    brightness: float = Field(..., description="Brightness adjustment factor")

    contrast: float = Field(..., description="Contrast adjustment factor")

    hue: float = Field(..., description="Hue adjustment factor")

    saturation: float = Field(..., description="Saturation adjustment factor")

    lightness: float = Field(..., description="Lightness adjustment factor")

    autoLevel: str = Field(..., description="Auto-leveling option for the image style")

    saturationPerc: Optional[int] = Field(None, description="Saturation percentage for auto-leveling, if applicable")