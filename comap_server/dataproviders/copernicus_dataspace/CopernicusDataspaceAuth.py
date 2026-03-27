import os
import requests
import logging
from threading import Lock

class CopernicusDataspaceAuth:
    _oInstance = None
    _oLock = Lock()

    def __new__(cls):
        with cls._oLock:
            if cls._oInstance is None:
                cls._oInstance = super(CopernicusDataspaceAuth, cls).__new__(cls)
                cls._oInstance._bInitialized = False
            return cls._oInstance

    def __init__(self):
        if self._bInitialized:
            return
        
        self.sAuthUrl = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
        self.sUsername = os.environ.get("COPERNICUS_DATASPACE_USERNAME")
        self.sPassword = os.environ.get("COPERNICUS_DATASPACE_PASSWORD")
        self.sAccessToken = None
        self.sRefreshToken = None
        self._bInitialized = True

    def login(self) -> str:
        """Initial login to obtain access and refresh tokens"""
        logging.debug("CopernicusDataspaceAuth.login: Executing initial login.")
        
        oData = {
            'client_id': 'cdse-public',
            'username': self.sUsername,
            'password': self.sPassword,
            'grant_type': 'password',
        }
        return self._fetchTokens(oData)

    def refreshToken(self) -> str:
        """Recreate the access token using the refresh token"""
        if not self.sRefreshToken:
            return self.login()
        
        logging.debug("CopernicusDataspaceAuth.refreshToken: Refreshing access token...")
        
        oData = {
            'client_id': 'cdse-public',
            'refresh_token': self.sRefreshToken,
            'grant_type': 'refresh_token',
        }
        return self._fetchTokens(oData)

    def _fetchTokens(self, oData: dict) -> str:
        """Internal method to fetch tokens from the authentication server"""
        try:
            oResponse = requests.post(self.sAuthUrl, data=oData)
            oResponse.raise_for_status()
            
            oTokens = oResponse.json()
            self.sAccessToken = oTokens.get("access_token")
            self.sRefreshToken = oTokens.get("refresh_token")
            
            return self.sAccessToken
        except Exception as oE:
            logging.error(f"CopernicusDataspaceAuth._fetchTokens.Error: {str(oE)}")
            raise

    def getHeader(self) -> dict:
        """Returns the authorization header for API requests, refreshing the token if necessary"""
        if not self.sAccessToken:
            self.login()
        return {"Authorization": f"Bearer {self.sAccessToken}"}