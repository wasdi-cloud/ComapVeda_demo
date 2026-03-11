class SearchQueryParameters:
    
    def __init__(self, sPlatform, sStartDate, sEndDate, sBoundingBox, sProductLevel, fCloudCover):
        self.platform = sPlatform
        self.startDate = sStartDate
        self.endDate = sEndDate
        self.boundingBox = sBoundingBox
        self.productLevel = sProductLevel
        self.cloudCover = fCloudCover
        

    