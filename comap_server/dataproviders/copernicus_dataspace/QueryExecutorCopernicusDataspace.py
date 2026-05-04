from datetime import datetime
from http.client import HTTPException
import json
import os
import re
import urllib
import logging
import aiohttp
from aiohttp import ClientTimeout
import aiofiles
from pathlib import Path
from dataproviders.copernicus_dataspace.CopernicusDataspaceAuth import CopernicusDataspaceAuth
from viewmodels.images.SearchResultItem import SearchResultItem
from viewmodels.search.SearchQueryParameters import SearchQueryParameters
from utils.WebsocketManager import oWsManager
from utils import FileSystemUtils


oLogger = logging.getLogger(__name__)

class QueryExecutorCopernicusDataspace:

    s_sAPI_BASE_URL = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products?"
    s_sEq = "eq"
    SENTINEL_BANDS = ["B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "B8A", "B09", "B11", "B12"]

    def __init__(self):
        self.oCopernicusAuth = CopernicusDataspaceAuth()


    def _buildStringAttributeFilter(self, sAttrName: str, sAttrValue: str) -> str:
        """
        Build an OData filter string for a string attribute in the Copernicus Data Space API.
        """
        return f"(Attributes/OData.CSC.StringAttribute/any(att:att/Name eq '{sAttrName}' and att/OData.CSC.StringAttribute/Value eq '{sAttrValue}'))"
    
    def _buildNumericAttributeFilter(self, sAttrName: str, sOperator: str, fAttrValue: float) -> str:
        """
        Build an OData filter string for a numeric attribute in the Copernicus Data Space API.
        """
        return f"(Attributes/OData.CSC.DoubleAttribute/any(att:att/Name eq '{sAttrName}' and att/OData.CSC.DoubleAttribute/Value {sOperator} {fAttrValue}))"

    def executeQuery(self, oQuery: SearchQueryParameters):
        """
        Execute a search query against the Copernicus Data Space API using the provided `SearchQueryParameters`.
        """
        
        if oQuery is None:
            oLogger.error("executeQuery. SearchQueryParameters object is None. Cannot execute query.")
            return None
        
        sFilter = ''

        if oQuery.productName:
            oLogger.debug(f"executeQuery: Searching for product with name: {oQuery.productName}")
            if not oQuery.productName.endswith(".SAFE"):
                oLogger.debug("executeQuery: Product name does not end with .SAFE, trying to add it")
                oQuery.productName += ".SAFE"
            sFilter = '$filter=Name eq \'' + oQuery.productName + '\''

        else:
            asFilters = []
            # collection name
            asFilters.append('(Collection/Name eq \'' +   oQuery.platform.upper() + '\')')
            # start date
            asFilters.append('(ContentDate/Start ge ' + oQuery.startDate + ')')
            # end date
            asFilters.append('(ContentDate/End le ' + oQuery.endDate + ')')
            # instrument short name
            asFilters.append(self._buildStringAttributeFilter("instrumentShortName", "MSI"))
            # cloud cover
            asFilters.append(self._buildNumericAttributeFilter("cloudCover", "le", float(oQuery.cloudCover)))
            # product level
            asFilters.append('(contains(Name, \'' + oQuery.productLevel + '\'))')
            # bounding box
            asFilters.append('(OData.CSC.Intersects(area=geography\'SRID=4326;' + oQuery.boundingBox + '\'))')

            sFilter = '&$filter=' + ' and '.join(asFilters)

        sFilter += '&$orderby=ContentDate/Start desc'
        sFilter += '&$expand=Attributes'
        sFilter += '&$count=True'
        sFilter += '&$top=100'
        sFilter += '&$expand=Assets'
        sFilter += '&$skip=0'

        sFilterQuoted = urllib.parse.quote(sFilter, safe='/,=&()$\'%;:')

        sUrl = self.s_sAPI_BASE_URL + sFilterQuoted

        oLogger.debug("QueryExecutorCopernicusDataspace.executeQuery: Executing query: " + sUrl)

        try:
            with urllib.request.urlopen(sUrl) as oResponse:
                iStatusCode = oResponse.getcode()
                if iStatusCode == 200:
                    sResponseBody = oResponse.read().decode('utf-8')
                    oJson = json.loads(sResponseBody)
                    oLogger.debug(f"executeQuery: Received response with {len(oJson.get('value', []))} items.")
                    oResultList = self._parseODataResponse(oJson)
                    return oResultList
                else:
                    oLogger.debug(f"executeQuery.Error: Received status code {iStatusCode} from API.")
            
        except Exception as oE:
            oLogger.error(f"executeQuery.Error: An error occurred: {str(oE)}")
        
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

                sTitle = oItem.get("Name", "")
                sDownloadLink = "https://download.dataspace.copernicus.eu/odata/v1/Products(" + oItem.get("Id", "") + ")/$value"
                sFootprint = self._getAttr(oItem, "coordinates")
                sFootprint = oItem.get("Footprint", "")
                if sFootprint.startswith("geography'SRID=4326;POLYGON"):
                    sFootprint = sFootprint[len("geography'SRID=4326;"):-1]  # Remove the prefix and the trailing quote
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
            
            oLogger.debug(f"parseODataResponse: Parsed {len(oSearchResultsList)} items from OData response.")
            return oSearchResultsList
        except Exception as oE:
            oLogger.error(f"parseODataResponse.Error: An error occurred while parsing OData response: {str(oE)}")
        
        return None


    def searchProductDetails(self, sProductId: str):
        """
        Search for the details of a specific product by its ID using the Copernicus Data Space API.
        """

        if sProductId is None or sProductId == "":
            oLogger.error("QueryExecutorCopernicusDataspace.searchProductDetails.Error: Product ID is missing. Cannot search for product details.")
            return None
        
        sUrl = f"https://catalogue.dataspace.copernicus.eu/odata/v1/Products({sProductId})?$expand=Attributes"

        oLogger.debug(f"searchProductDetails: Fetching product details from URL: {sUrl}")

        try:
            with urllib.request.urlopen(sUrl) as oResponse:
                iStatusCode = oResponse.getcode()
                if iStatusCode == 200:
                    sResponseBody = oResponse.read().decode('utf-8')
                    oJson = json.loads(sResponseBody)
                    oLogger.debug(f"searchProductDetails: Received product details for product ID {sProductId}.")
                    return oJson
                else:
                    oLogger.error(f"searchProductDetails.Error: Received status code {iStatusCode} from API when fetching product details for product ID {sProductId}.")
            
        except Exception as oE:
            oLogger.error(f"searchProductDetails.Error: An error occurred while fetching product details for product ID {sProductId}: {str(oE)}")
        
        return None
    
    async def downloadProduct(self, sProductName: str, sDownloadLink: str, sPlatform: str, sProjectId: str):
        """
        Download a product from the Copernicus Data Space API using the provided download link.
        :param sProductName: The name of the product to download (used for naming the file).
        :param sDownloadLink: The URL to download the product from.
        :param sPlatform: The platform of the product (e.g., "SENTINEL-2").
        :param sProjectId: The ID of the CoMap project to which this product has to be stored.
        """

        if sProjectId is None or sProjectId == "":
            oLogger.error("downloadProduct.Error: Project ID is missing. Cannot download product.")
            return None
        
        if sDownloadLink is None or sDownloadLink == "":
            oLogger.error("downloadProduct.Error: Download link is missing. Cannot download product.")
            return None
        
        if sProductName is None or sProductName == "":
            oLogger.error("downloadProduct.Error: Product name is missing. Cannot download product.")
            return None
        
        if not FileSystemUtils.projectHasStorageCapacity(sProjectId):
            oLogger.error(f"downloadProduct.Error: Project {sProjectId} has exceeded its storage capacity. Cannot download product.")
            raise HTTPException(status_code=400, detail="Project has exceeded its storage capacity")
        
        # extract the Copernicus Dataspace product id from the download url
        oMatch = re.search(r"Products\((.*?)\)", sDownloadLink)
        sProductId = None
        if oMatch:
            sProductId = oMatch.group(1)
            oLogger.debug(f"downloadProduct: Extracted product ID: {sProductId}")
        else:
            oLogger.warning("downloadProduct: Could not extract product ID from URL.")
            return None
        
        sDownloadBasePath = os.environ.get("COMAP_PROJECTS_BASE_PATH")

        if sDownloadBasePath is None:
            oLogger.error("downloadProduct.Error: Base path for CoMap projects is not set. Cannot download product. Set the COMAP_PROJECTS_BASE_PATH environment variable.")
            return None

        oDownloadFolderPath = Path(sDownloadBasePath) / sProjectId

        try:
            oDownloadFolderPath.mkdir(parents=False, exist_ok=True)
        except Exception as oE:
            oLogger.error(f"downloadProduct.Error: An error occurred while creating the download folder: {str(oE)}")
            return None
        

        oFullFilePath = oDownloadFolderPath / (sProductName + ".zip")

        if os.path.exists(oFullFilePath):
            oLogger.info(f"downloadProduct: File '{oFullFilePath}' already exists. Skipping download.")
            return str(oFullFilePath)

        try:
            oTimeout = ClientTimeout(total=1800)  # 30 minutes timeout for large downloads
            async with aiohttp.ClientSession(headers=self.oCopernicusAuth.getHeader(), timeout=oTimeout) as session:
                async with session.get(sDownloadLink) as response:
                    if response.status == 401:
                        # If we get a 401 Unauthorized, it likely means the access token has expired. In that case, we attempt to refresh the token and retry the download once.
                        oLogger.warning("downloadProduct: Received 401 Unauthorized. Attempting to refresh token and retry")
                        self.oCopernicusAuth.refreshToken()
                        session.headers.update(self.oCopernicusAuth.getHeader())
                        async with session.get(sDownloadLink) as retry_response:
                            response = retry_response
                    
                    response.raise_for_status()
                    
                    async with aiofiles.open(oFullFilePath, 'wb') as file:
                        async for chunk in response.content.iter_chunked(8192):
                            await file.write(chunk)

            oLogger.debug(f"downloadProduct: Successfully downloaded product '{sProductName}' to '{oFullFilePath}'.")

            sDownloadedFilePath = str(oFullFilePath)

            if str(sDownloadedFilePath) is None:
                raise HTTPException(status_code=500, detail=f'Failed to download image from {sDownloadLink}')
        
            oLogger.debug(f"downloadProduct: Image downloaded successfully to {sDownloadedFilePath}")

            # with the product Id, we query again Copernicus Dataspace to get the metadata of the product, in order to extract the bbox and the date
            oJsonMetadataData = self.searchProductDetails(sProductId)

            sFootprint =oJsonMetadataData.get("Footprint", "")
            if sFootprint.startswith("geography'SRID=4326;POLYGON"):
                sFootprint = sFootprint[len("geography'SRID=4326;"):-1]

            return sDownloadedFilePath, sFootprint, sProductId
        
        except Exception as oE:
            oLogger.error(f"downloadProduct.Error: An error occurred while downloading product {sProductName}: {str(oE)}")
            await oWsManager.broadcastToProject(sProjectId, {
                "type": "import_failed",
                "productId": sProductId,
                "message": f"Failed to import image {sProductId}",
                "messageType": "error"
            })

        return None