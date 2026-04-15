import functools
import json
import logging
import re
import zipfile
from typing import List, Type, Dict, Any
from rio_tiler.io import Reader, MultiBaseReader
from database import SessionLocal
from entities.DatasetImage import DatasetImageEntity

class Sentinel2ZipReader(MultiBaseReader):
    """
    Reader for Sentinel-2 data in .zip format.
    Automatically finds JP2 bands within the .SAFE structure.
    """
    
    reader: Type[Reader] = Reader
    BANDS: List[str] = ["B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "B8A", "B09", "B11", "B12"]
    
    # Definiamo questi come attributi di classe per evitare conflitti con il costruttore
    minzoom: int = 0
    maxzoom: int = 22

    def __init__(self, sFilePath: str, **kwargs):
        sNormalizedPath = sFilePath.replace("\\", "/")
        super().__init__(sNormalizedPath, **kwargs)

        self._assetUrls = self._loadAssetUrls(self.input)

        self.crs, self.bounds = Sentinel2ZipReader._cachedBoundsAndCrs(self.input)

    @staticmethod
    @functools.lru_cache(maxsize=32)
    def _cachedBoundsAndCrs(sFilePath: str):
        """Cache CRS and bounds per file so GDAL is opened only once, not on every tile request."""
        dAssetUrls = Sentinel2ZipReader._cachedAssetUrls(sFilePath)
        with Reader(dAssetUrls[Sentinel2ZipReader.BANDS[0]]) as src:
            return src.crs, src.bounds

    @staticmethod
    @functools.lru_cache(maxsize=32)
    def _cachedAssetUrls(sFilePath: str) -> Dict[str, str]:
        """Cache band path resolution for each Sentinel-2 ZIP file."""
        sNormalizedPath = sFilePath.replace("\\", "/")
        if not sNormalizedPath.lower().endswith(".zip"):
            return {sBand: sNormalizedPath for sBand in Sentinel2ZipReader.BANDS}

        with zipfile.ZipFile(sNormalizedPath, 'r') as oZipFile:
            dAssetUrls: Dict[str, str] = {}
            for sName in oZipFile.namelist():
                for sBand in Sentinel2ZipReader.BANDS:
                    if sBand in dAssetUrls:
                        continue
                    if re.search(rf"_{sBand}(?:_.*)?\.jp2$", sName):
                        dAssetUrls[sBand] = f"/vsizip/{sNormalizedPath}/{sName}"

        aMissingBands = [sBand for sBand in Sentinel2ZipReader.BANDS if sBand not in dAssetUrls]
        if aMissingBands:
            raise ValueError(f"Bands not found in the zip file: {aMissingBands}")

        return dAssetUrls

    def _loadAssetUrls(self, sFilePath: str) -> Dict[str, str]:
        sNormalizedPath = sFilePath.replace("\\", "/")

        dBandPaths = self._loadBandPathsFromDb(sNormalizedPath)
        if dBandPaths:
            return dBandPaths

        dAssetUrls = Sentinel2ZipReader._cachedAssetUrls(sNormalizedPath)
        self._saveBandPathsToDb(sNormalizedPath, dAssetUrls)
        return dAssetUrls

    @staticmethod
    def _loadBandPathsFromDb(sFilePath: str) -> Dict[str, str]:
        try:
            oDB = SessionLocal()
            try:
                oRecord = oDB.query(DatasetImageEntity).filter(
                    DatasetImageEntity.link.in_([sFilePath, sFilePath.replace("/", "\\")])
                ).first()
                if not oRecord or not oRecord.bandpaths:
                    return {}

                return json.loads(oRecord.bandpaths)
            finally:
                oDB.close()
        except Exception as oE:
            logging.warning(f"Sentinel2ZipReader._loadBandPathsFromDb: Error occurred while loading band paths from DB: {oE}")
            return {}

    @staticmethod
    def _saveBandPathsToDb(sFilePath: str, dBandPaths: Dict[str, str]) -> None:
        if not dBandPaths:
            return

        try:
            oDB = SessionLocal()
            try:
                aRecords = oDB.query(DatasetImageEntity).filter(
                    DatasetImageEntity.link.in_([sFilePath, sFilePath.replace("/", "\\")])
                ).all()
                if not aRecords:
                    return

                sBandPathsJson = json.dumps(dBandPaths)
                for oRecord in aRecords:
                    if not oRecord.bandpaths:
                        oRecord.bandpaths = sBandPathsJson
                oDB.commit()
            finally:
                oDB.close()
        except Exception as oE:
            logging.warning(f"Sentinel2ZipReader._saveBandPathsToDb: Error occurred while saving band paths to DB: {oE}")

    def _get_asset_url(self, sBand: str) -> str:
        if not self.input.lower().endswith(".zip"):
            return self.input

        if sBand not in self._assetUrls:
            raise ValueError(f"Band '{sBand}' not found in the zip file.")

        return self._assetUrls[sBand]

    def _get_asset_info(self, sBand: str) -> Dict[str, Any]:
        return {"url": self._get_asset_url(sBand)}

    @property
    def assets(self) -> List[str]:
        return self.BANDS