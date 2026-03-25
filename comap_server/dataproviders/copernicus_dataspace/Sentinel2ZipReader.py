import re
import zipfile
from typing import List, Type, Dict, Any
from rio_tiler.io import Reader, MultiBaseReader

class Sentinel2ZipReader(MultiBaseReader):
    """
    Reader for Sentinel-2 data in .zip format.
    Automatically finds JP2 bands within the .SAFE structure.
    """
    
    reader: Type[Reader] = Reader
    
    # Definiamo questi come attributi di classe per evitare conflitti con il costruttore
    minzoom: int = 0
    maxzoom: int = 22

    def __init__(self, sFilePath: str, **kwargs):
        sNormalizedPath = sFilePath.replace("\\", "/")
        super().__init__(sNormalizedPath, **kwargs)
        
        # Dopo l'inizializzazione, popoliamo CRS e Bounds dalla prima banda disponibile
        # Questo serve per l'endpoint /tiles
        with self.reader(self._get_asset_url(self.assets[0])) as src:
            self.crs = src.crs
            self.bounds = src.bounds

    def _get_asset_url(self, sBand: str) -> str:
        if not self.input.lower().endswith(".zip"):
            return self.input

        with zipfile.ZipFile(self.input, 'r') as oZipFile:
            # Pattern per trovare la banda JP2 (es. _B04.jp2 o _B04_10m.jp2)
            oPattern = re.compile(rf"_{sBand}(?:_.*)?\.jp2$")
            for sName in oZipFile.namelist():
                if oPattern.search(sName):
                    return f"/vsizip/{self.input}/{sName}"
        
        raise ValueError(f"Band '{sBand}' not found in the zip file.")

    def _get_asset_info(self, sBand: str) -> Dict[str, Any]:
        return {"url": self._get_asset_url(sBand)}

    @property
    def assets(self) -> List[str]:
        return ["B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "B8A", "B09", "B11", "B12"]