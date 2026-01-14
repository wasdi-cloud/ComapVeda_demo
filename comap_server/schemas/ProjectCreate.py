from pydantic import BaseModel, Field, field_validator, model_validator
from shapely import wkt, errors
from typing import Optional

class ProjectCreate(BaseModel):

    name: str = Field(..., min_length=1, max_length=100, description="Name of the project")
    
    description: Optional[str] = Field(None, description="Description of the project")

    isGlobalAoI: bool = Field(True, description="Indicates if the area of interest is global")

    bbox: Optional[str] = Field(
        None,
        description="Area of interest in WKT format (e.g., POLYGON((...)))"
    )

    @field_validator("bbox")
    def validateWKT(oCls, oBBox):
        if oBBox is not None:
            try:
                geom = wkt.loads(oBBox)
                if geom.is_empty:
                    raise ValueError("WKT geometry cannot be empty.")
            except errors.WKTReadingError as oE:
                raise ValueError(f"Invalid WKT format: {oE}")
        return oBBox
    
    isPublic: bool = Field(False, description="Indicates if the project is public")

    link: Optional[str] = Field(None, description="Optional external link associated with the project")

    creationDate: Optional[str] = Field(None, description="Creation date in the format YYYY-MM-DD")

    datasetStartDate: str = Field(..., description="Dataset start date in the format YYYY-MM-DD") 

    datasetEndDate: Optional[str] = Field(None, description="Dataset end date in the format YYYY-MM-DD")

    @field_validator("creationDate", "datasetStartDate", "datasetEndDate")
    def validateDateFormat(oCls, sDate):
        if sDate is not None:
            import re
            oPattern = r"^\d{4}-\d{2}-\d{2}$"
            if not re.match(oPattern, sDate):
                raise ValueError("creationDate must be in the format YYYY-MM-DD")
        return sDate
    
    hasAnnotatorGlobalView: bool = Field(True, description="Indicates if annotators can see all labels (default) or only their own")
    
    doesNeedReview: bool = Field(False, description="Indicates if the project requires review of annotations")

    reviewersNumber: Optional[int] = Field(None, ge=0, description="Number of reviewers required if review is needed")

    @model_validator(mode="after")
    def checkReviewRequirements(oCls, oValues):
        doesNeedReview = oValues.get("doesNeedReview")
        reviewersNumber = oValues.get("reviewersNumber")
        if doesNeedReview and (reviewersNumber is None or reviewersNumber <= 0):
            raise ValueError("If 'doesNeedReview' is True, 'reviewersNumber' must be provided and greater than 0.")
        return oValues
    
    mission: str = Field(..., description="Mission associated with the project (e.g., Sentinel-2)")

    tasks: Optional[list[str]] = Field(None, description="List of tasks associated with the project");

    labellingTemplate: str = Field(..., description="Labelling template name")

    isOwnerHosting: bool = Field(False, description="Indicates if the project is hosted by the owner")

    hostingUsername: Optional[str] = Field(None, description="Username of the hosting owner if applicable")

    hostingPassword: Optional[str] = Field(None, description="Password of the hosting owner if applicable")

    hostingUrl: Optional[str] = Field(None, description="URL of the hosting owner if applicable")

    @model_validator(mode="after")
    def validateHostingInfo(oCls, oValues):
        isOwnerHosting = oValues.get("isOwnerHosting")
        hostingUsername = oValues.get("hostingUsername")
        hostingPassword = oValues.get("hostingPassword")
        hostingUrl = oValues.get("hostingUrl")
        if isOwnerHosting:
            if not all([hostingUsername, hostingPassword, hostingUrl]):
                raise ValueError("If 'isOwnerHosting' is True, 'hostingUsername', 'hostingPassword', and 'hostingUrl' must be provided.")
        return oValues
    