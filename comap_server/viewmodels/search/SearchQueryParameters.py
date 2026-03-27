class SearchQueryParameters:
    
    def __init__(self, sPlatform, sStartDate, sEndDate, sBoundingBox, sProductLevel, fCloudCover):
        self.platform: str = sPlatform
        self.startDate: str = sStartDate
        self.endDate: str = sEndDate
        self.boundingBox: str = sBoundingBox
        self.productLevel: str = sProductLevel
        self.cloudCover: float = fCloudCover

    