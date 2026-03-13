import json

import urllib
import logging

from viewmodels.images.SearchResultItem import SearchResultItem
from viewmodels.search.SearchQueryParameters import SearchQueryParameters

class QueryExecutorCopernicusDataspace:

    s_sAPI_BASE_URL = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products?"
    s_sEq = "eq"

    def executeQuery(self, oQuery: SearchQueryParameters):
        """
        Execute a search query against the Copernicus Data Space API using the provided `SearchQueryParameters`.
        """
        
        # TODO: add a check for the platform. 
    
        sCollectionName = '(Collection/Name eq \'' +   oQuery.platform.upper() + '\')'
        sStartDate = '(ContentDate/Start ge ' + oQuery.startDate + ')'
        sEndDate = '(ContentDate/End le ' + oQuery.endDate + ')'
        sInstrumentShortName = '(Attributes/OData.CSC.StringAttribute/any(att:att/Name eq \'instrumentShortName\' and att/OData.CSC.StringAttribute/Value eq \'MSI\'))'
        sCloudCover = '(Attributes/OData.CSC.DoubleAttribute/any(att:att/Name eq \'cloudCover\' and att/OData.CSC.DoubleAttribute/Value le ' + oQuery.cloudCover + '))'
        sProductLevel = '(contains(Name, \'' + oQuery.productLevel + '\'))'
        sBbox = '(OData.CSC.Intersects(area=geography\'SRID=4326;' + oQuery.boundingBox + '\'))'

        sFilter = '&$filter=' + sCollectionName + ' and ' + sStartDate + ' and ' + sEndDate + ' and ' + sInstrumentShortName + ' and ' + sCloudCover + ' and ' + sProductLevel + ' and ' + sBbox

        sFilter += '&$orderby=ContentDate/Start desc'
        sFilter += '&$expand=Attributes'
        sFilter += '&$count=True'
        sFilter += '&$top=10'
        sFilter += '&$expand=Assets'
        sFilter += '&$skip=0'

        sFilterQuoted = urllib.parse.quote(sFilter, safe='/,=&()$\'%;:')

        sUrl = self.s_sAPI_BASE_URL + sFilterQuoted

        logging.debug("QueryExecutorCopernicusDataspace.executeQuery: Executing query: " + sUrl)

        try:
            with urllib.request.urlopen(sUrl) as oResponse:
                iStatusCode = oResponse.getcode()
                if iStatusCode == 200:
                    sResponseBody = oResponse.read().decode('utf-8')
                    oJson = json.loads(sResponseBody)
                    logging.debug(f"QueryExecutorCopernicusDataspace.executeQuery: Received response with {len(oJson.get('value', []))} items.")
                    oResultList = self.parseODataResponse(oJson)
                    return oResultList
                else:
                    logging.debug(f"QueryExecutorCopernicusDataspace.executeQuery.Error: Received status code {iStatusCode} from API.")
            
        except Exception as oE:
            logging.error(f"QueryExecutorCopernicusDataspace.executeQuery.Error: An error occurred: {str(oE)}")
        
        return None


    def getAttr(self, oItem, sAttrName):
        """
        From an OData item, get the value of a specific attribute by name. 
        The attributes are in `oItem["Attributes"]` and each has a "Name" and a "Value".
        """
        for oAttr in oItem.get("Attributes", []):
            if oAttr.get("Name") == sAttrName:
                return oAttr.get("Value")
        return None


    def parseODataResponse(self, oData: str) -> list[SearchResultItem]:
        """
        Parse the OData response from the Copernicus Data Space API and convert it into a list of `SearchResultItem` objects.
        """
        oSearchResultsList = []

        try:

            for oItem in oData.get("value", []):

                sId = oItem.get("Id", "")
                logging.debug('** ' + sId + ' **')

                sTitle = oItem.get("Name", "")
                sDownloadLink = "https://download.dataspace.copernicus.eu/odata/v1/Products(" + oItem.get("Id", "") + ")/$value"
                sFootprint = self.getAttr(oItem, "coordinates")
                sDate = oItem.get("ContentDate", {}).get("Start", "")
                sStartDate = oItem.get("ContentDate", {}).get("Start", "")
                sEndDate = oItem.get("ContentDate", {}).get("End", "")
                sPlatform = self.getAttr(oItem, "platformShortName")
                sProductType = self.getAttr(oItem, "productType")
                sProductLevel = self.getAttr(oItem, "processingLevel")
                sInstrument = self.getAttr(oItem, "instrumentShortName")
                sSensorOperationalMode = self.getAttr(oItem, "sensorOperationalMode")
                sCloudCover = float(self.getAttr(oItem, "cloudCover"))
                sOrbitNumber = int(self.getAttr(oItem, "orbitNumber"))
                sRelativeOrbitNumber = int(self.getAttr(oItem, "relativeOrbitNumber"))
                sSize = str(oItem.get("ContentLength", ""))

                oSearchResultItem = SearchResultItem(
                    id = sId,
                    title = sTitle,
                    link = sDownloadLink,
                    footprint = sFootprint,
                    date = sDate,
                    startDate = sStartDate,
                    endDate = sEndDate,
                    platform = sPlatform,
                    productType = sProductType,
                    productLevel = sProductLevel,
                    instrument = sInstrument,
                    sensorOperationalMode = sSensorOperationalMode,
                    cloudCover = sCloudCover,
                    orbitNumber = sOrbitNumber,
                    relativeOrbitNumber = sRelativeOrbitNumber,
                    size = sSize,
                )

                oSearchResultsList.append(oSearchResultItem)
            
            logging.debug(f"QueryExecutorCopernicusDataspace.parseODataResponse: Parsed {len(oSearchResultsList)} items from OData response.")
            return oSearchResultsList
        except Exception as oE:
            logging.error(f"QueryExecutorCopernicusDataspace.parseODataResponse.Error: An error occurred while parsing OData response: {str(oE)}")
        
        return None


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