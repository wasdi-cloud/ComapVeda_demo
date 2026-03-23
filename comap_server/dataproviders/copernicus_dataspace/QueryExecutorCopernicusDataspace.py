import json

import os
import urllib
import logging
import requests

from pathlib import Path
from dataproviders.copernicus_dataspace.CopernicusDataspaceAuth import CopernicusDataspaceAuth
from viewmodels.images.SearchResultItem import SearchResultItem
from viewmodels.search.SearchQueryParameters import SearchQueryParameters

class QueryExecutorCopernicusDataspace:

    s_sAPI_BASE_URL = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products?"
    s_sEq = "eq"

    def __init__(self):
        self.oCopernicusAuth = CopernicusDataspaceAuth()

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
                    oResultList = self._parseODataResponse(oJson)
                    return oResultList
                else:
                    logging.debug(f"QueryExecutorCopernicusDataspace.executeQuery.Error: Received status code {iStatusCode} from API.")
            
        except Exception as oE:
            logging.error(f"QueryExecutorCopernicusDataspace.executeQuery.Error: An error occurred: {str(oE)}")
        
        return None


    def _getAttr(self, oItem, sAttrName):
        """
        From an OData item, get the value of a specific attribute by name. 
        The attributes are in `oItem["Attributes"]` and each has a "Name" and a "Value".
        """
        for oAttr in oItem.get("Attributes", []):
            if oAttr.get("Name") == sAttrName:
                return oAttr.get("Value")
        return None


    def _parseODataResponse(self, oData: str) -> list[SearchResultItem]:
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
                sFootprint = self._getAttr(oItem, "coordinates")
                if not sFootprint:
                    logging.debug(f"QueryExecutorCopernicusDataspace.parseODataResponse: No footprint found for item {sId}. Trying to recover it from another attribute")
                    sFootprint = oItem.get("Footprint", "")
                    if sFootprint.startswith("geography'SRID=4326;POLYGON"):
                        sFootprint = sFootprint[len("geography'SRID=4326;"):-1]  # Remove the prefix and the trailing quote
                        logging.debug(f"QueryExecutorCopernicusDataspace.parseODataResponse: Recovered footprint for item {sId} from 'Footprint' attribute.")
                sDate = oItem.get("ContentDate", {}).get("Start", "")
                sStartDate = oItem.get("ContentDate", {}).get("Start", "")
                sEndDate = oItem.get("ContentDate", {}).get("End", "")
                sPlatform = self._getAttr(oItem, "platformShortName")
                sProductType = self._getAttr(oItem, "productType")
                sProductLevel = self._getAttr(oItem, "processingLevel")
                sInstrument = self._getAttr(oItem, "instrumentShortName")
                sSensorOperationalMode = self._getAttr(oItem, "sensorOperationalMode")
                sCloudCover = float(self._getAttr(oItem, "cloudCover"))
                sOrbitNumber = int(self._getAttr(oItem, "orbitNumber"))
                sRelativeOrbitNumber = int(self._getAttr(oItem, "relativeOrbitNumber"))
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

    def downloadProduct(self, sProductName: str, sDownloadLink: str, sPlatform: str, sProjectId: str):
        """
        Download a product from the Copernicus Data Space API using the provided download link.
        :param sProductName: The name of the product to download (used for naming the file).
        :param sDownloadLink: The URL to download the product from.
        :param sPlatform: The platform of the product (e.g., "SENTINEL-2").
        :param sProjectId: The ID of the CoMap project to which this product has to be stored.
        """

        if sProjectId is None or sProjectId == "":
            logging.error("QueryExecutorCopernicusDataspace.downloadProduct.Error: Project ID is missing. Cannot download product.")
            return None
        
        if sDownloadLink is None or sDownloadLink == "":
            logging.error("QueryExecutorCopernicusDataspace.downloadProduct.Error: Download link is missing. Cannot download product.")
            return None
        
        if sProductName is None or sProductName == "":
            logging.error("QueryExecutorCopernicusDataspace.downloadProduct.Error: Product name is missing. Cannot download product.")
            return None
        
        sDownloadBasePath = os.environ.get("COMAP_PROJECTS_BASE_PATH")

        if sDownloadBasePath is None:
            logging.error("QueryExecutorCopernicusDataspace.downloadProduct.Error: Base path for CoMap projects is not set. Cannot download product. Set the COMAP_PROJECTS_BASE_PATH environment variable.")
            return None

        oDownloadFolderPath = Path(sDownloadBasePath) / sProjectId

        try:
            oDownloadFolderPath.mkdir(parents=False, exist_ok=True)
        except Exception as oE:
            logging.error(f"QueryExecutorCopernicusDataspace.downloadProduct.Error: An error occurred while creating the download folder: {str(oE)}")
            return None
        

        oFullFilePath = oDownloadFolderPath / (sProductName + ".zip")
        
        try:
            with requests.Session() as oSession:
                oSession.headers.update(self.oCopernicusAuth.getHeader())
                oResponse = oSession.get(sDownloadLink, stream=True)

                if (oResponse.status_code == 401):
                    # If we get a 401 Unauthorized, it likely means the access token has expired. In that case, we attempt to refresh the token and retry the download once.
                    logging.warning("QueryExecutorCopernicusDataspace.downloadProduct: Received 401 Unauthorized. Attempting to refresh token and retry")
                    oResponse.close() 
                    self.oCopernicusAuth.refreshToken()
                    oSession.headers.update(self.oCopernicusAuth.getHeader())
                    oResponse = oSession.get(sDownloadLink, stream=True)

                with oResponse:
                    oResponse.raise_for_status()

                    with open(oFullFilePath, 'wb') as oFile:
                        for oChunk in oResponse.iter_content(chunk_size=8192):
                            if oChunk:  # Filter out keep-alive chunks
                                oFile.write(oChunk)

            logging.debug(f"QueryExecutorCopernicusDataspace.downloadProduct: Successfully downloaded product '{sProductName}' to '{oFullFilePath}'.")
            return str(oDownloadFolderPath)
        
        except Exception as oE:
            logging.error(f"QueryExecutorCopernicusDataspace.downloadProduct.Error: An error occurred while downloading product {sProductName}: {str(oE)}")
        
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