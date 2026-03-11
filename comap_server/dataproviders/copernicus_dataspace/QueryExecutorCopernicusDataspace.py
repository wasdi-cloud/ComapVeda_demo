from comap_server.viewmodels.search.SearchQueryParameters import SearchQueryParameters

class QueryExecutorCopernicusDataspace:

    s_sAPI_BASE_URL = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products?"
    s_sEq = "eq"

    def executeQuery(self, oQuery: SearchQueryParameters):
        # TODO: here I probably want a QueryViewModel
        
        # TODO: add a check for the platform. 
    
        sCollectionName = '(Collection/Name ' + self.s_sEq + ' \'' + oQuery.platform + '\')'
        sStartDate = '(ContentDate/Start ge ' + oQuery.startDate + ')'
        sEndDate = '(ContentDate/End le ' + oQuery.endDate + ')'
        sInstrumentShortName = '(Attributes/OData.CSC.StringAttribute/any(att:att/Name eq \'instrumentShortName\' and att/OData.CSC.StringAttribute/Value eq \'MSI\'))'
        sCloudCover = '(Attributes/OData.CSC.DoubleAttribute/any(att:att/Name eq \'cloudCover\' and att/OData.CSC.DoubleAttribute/Value le ' + oQuery.cloudCover + '))'
        sProductLevel = '(contains(Name, \'' + oQuery.productLevel + '\'))'
        sBbox = '(OData.CSC.Intersects(area=geography\'SRID=4326;' + oQuery.boundingBox + '\'))'

        sFilter = '$filter=' + sCollectionName + ' and ' + sStartDate + ' and ' + sEndDate + ' and ' + sInstrumentShortName + ' and ' + sCloudCover + ' and ' + sProductLevel + ' and ' + sBbox

        sUrl = self.s_sAPI_BASE_URL + '&' + sFilter
        sUrl += '&$orderby=ContentDate/Start desc'
        sUrl += '&$expand=Attributes'
        sUrl += '&$count=True'
        sUrl += '&$top=10'
        sUrl += '&$expand=Assets'
        sUrl += '&$skip=0'

        print(sUrl)


if __name__ == "__main__":
    oQuery = SearchQueryParameters(
        sPlatform = "SENTINEL-2",
        sStartDate = "2026-02-11T00:00:00.000Z",
        sEndDate = "2026-03-11T23:59:59.999Z",
        sBoundingBox = "POLYGON ((12.401 45.19, 12.596 45.19, 12.596 45.542, 12.401 45.542, 12.401 45.19))",
        sProductLevel = "L1C",
        fCloudCover = "20"
    )

    oExecutor = QueryExecutorCopernicusDataspace()
    oExecutor.executeQuery(oQuery)