class SearchQueryParameters:
    
    def __init__(self, sProductName: str, sPlatform: str, sStartDate: str, sEndDate: str, sBoundingBox: str, sProductLevel: str, fCloudCover: float):
        self.productName: str = sProductName
        self.platform: str = sPlatform
        self.startDate: str = sStartDate
        self.endDate: str = sEndDate
        self.boundingBox: str = sBoundingBox
        self.productLevel: str = sProductLevel
        self.cloudCover: float = fCloudCover

    