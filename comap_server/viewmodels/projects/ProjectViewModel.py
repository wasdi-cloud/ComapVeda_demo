from datetime import datetime, timezone
from pydantic import BaseModel, Field, field_validator, model_validator
from shapely import wkt, errors
from typing import Optional

class ProjectViewModel(BaseModel):

    id: Optional[str] = Field(None, description="Unique identifier of the project")

    userRole: Optional[str] = Field(None, description="Role of the user in the project (e.g., annotator, reviewer)")


    name: str = Field(..., min_length=1, max_length=100, description="Name of the project")
    
    description: Optional[str] = Field(None, description="Description of the project")

    isGlobalAoI: bool = Field(True, description="Indicates if the area of interest is global")

    bbox: Optional[str] = Field(
        None,
        description="Area of interest in WKT format (e.g., POLYGON((...)))"
    )

    @field_validator("bbox")
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
    
    isPublic: bool = Field(False, description="Indicates if the project is public")

    link: Optional[str] = Field(None, description="Optional external link associated with the project")

    creationDate: Optional[int] = Field(None, description="Creation date as epoch milliseconds")

    datasetStartDate: int = Field(..., description="Dataset start date as epoch milliseconds") 

    datasetEndDate: Optional[int] = Field(None, description="Dataset end date as epoch milliseconds")

    @field_validator("creationDate", "datasetStartDate", "datasetEndDate", mode="before")
    @classmethod
    def validate_epoch_millis(cls, v):
        """
        Ensure the value is an integer representing epoch milliseconds and within a reasonable range.

        Accepts ints or numeric strings (will be converted to int).
        """
        if v is None:
            return v
        try:
            # allow numeric strings
            i = int(v)
        except Exception:
            raise ValueError("Date must be an integer epoch timestamp in milliseconds")

        # reasonable bounds: >= 0 (1970-01-01) and <= year 3000
        max_ts = int(datetime(3000, 1, 1, tzinfo=timezone.utc).timestamp() * 1000)
        if i < 0 or i > max_ts:
            raise ValueError(f"Epoch millis out of range (0..{max_ts}), got: {i}")

        return i

    @model_validator(mode="after")
    def check_date_order(self):
        """
        Ensure datasetStartDate <= datasetEndDate when both are provided.
        """
        if self.datasetEndDate is not None and self.datasetStartDate is not None:
            if self.datasetStartDate > self.datasetEndDate:
                raise ValueError("'datasetStartDate' must be <= 'datasetEndDate'")
        return self
    
    hasAnnotatorGlobalView: bool = Field(True, description="Indicates if annotators can see all labels (default) or only their own")
    
    doesNeedReview: bool = Field(False, description="Indicates if the project requires review of annotations")

    reviewersNumber: Optional[int] = Field(None, ge=0, description="Number of reviewers required if review is needed")

    @model_validator(mode="after")
    def checkReviewRequirements(self):
        if self.doesNeedReview and (self.reviewersNumber is None or self.reviewersNumber <= 0):
            raise ValueError("If 'doesNeedReview' is True, 'reviewersNumber' must be provided and greater than 0.")
        return self
    
    mission: str = Field(..., description="Mission associated with the project (e.g., Sentinel-2)")

    tasks: Optional[list[str]] = Field(None, description="List of tasks associated with the project");

    labellingTemplate: str = Field(..., description="Labelling template name")

    isOwnerHosting: bool = Field(False, description="Indicates if the project is hosted by the owner")

    hostingUsername: Optional[str] = Field(None, description="Username of the hosting owner if applicable")

    hostingPassword: Optional[str] = Field(None, description="Password of the hosting owner if applicable")

    hostingUrl: Optional[str] = Field(None, description="URL of the hosting owner if applicable")

    @model_validator(mode="after")
    def validateHostingInfo(self):
        if self.isOwnerHosting:
            if not all([self.hostingUsername, self.hostingPassword, self.hostingUrl]):
                raise ValueError("If 'isOwnerHosting' is True, 'hostingUsername', 'hostingPassword', and 'hostingUrl' must be provided.")
        return self

    approved: Optional[bool] = False
    rejected: Optional[bool] = False
    rejectionNote: Optional[str] = None