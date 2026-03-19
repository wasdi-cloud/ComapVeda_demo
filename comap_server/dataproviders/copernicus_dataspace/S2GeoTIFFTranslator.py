import os
import re
import logging
from osgeo import gdal


class S2GeoTIFFTranslator:

    gdal.UseExceptions()

    def _getBandPaths(self, sZipFilePath, asSuffixes):
        if not os.path.exists(sZipFilePath):
            logging.warning("S2GeoTIFFTranslator._getBandPaths: Input ZIP file does not exist.")
            return None
        
        sVSIBasePath = f"/vsizip/{sZipFilePath}"
        oFoundPaths = {}

        def recursiveVSIScan(self, sCurrentPath):
            asFile = gdal.ReadDir(sCurrentPath)
            if asFile is None: 
                return None
            
            for sFileName in asFile:
                sFullPath = f"{sCurrentPath}/{sFileName}"
                oStat = gdal.VSIStatL(sFullPath)
                if oStat and bool(oStat.mode & 0o040000):
                    self.recursiveVSIScan(sFullPath)
                elif oStat:
                    if not any(x in sFileName for x in ["MSK_", "TCI_", "PVI_", "预览"]):
                        for sSuffix in asSuffixes:
                            oPattern = rf"_{sSuffix}(?:_.*)?\.jp2$"
                            if re.search(oPattern, sFileName):
                                oFoundPaths[sSuffix] = sFullPath

        logging.debug(f"S2GeoTIFFTranslator.getBandPaths: Scanning ZIP file for target bands: {asSuffixes}")
        self.recursiveVSIScan(sVSIBasePath)
        return oFoundPaths


    def getGeoTiff(self, sZipPath, sGeoTIFFOutputPath, asTargetBandSuffixes):
        if sZipPath is None or sGeoTIFFOutputPath is None:
            logging.error("S2GeoTIFFTranslator.getGeoTiff: Missing input ZIP path or output path.")
            return None
        
        if not os.path.exists(sZipPath):
            logging.error(f"S2GeoTIFFTranslator.getGeoTiff: Input ZIP file does not exist: {sZipPath}")
            return None

        try:
            oBandsDictionary = self._getBandPaths(sZipPath, asTargetBandSuffixes)
            
            oMissing = set(asTargetBandSuffixes) - set(oBandsDictionary.keys())
            if oMissing:
                logging.warning(f"S2GeoTIFFTranslator.getGeoTiff: Missing bands: {oMissing}.")

            ordered_vsi_paths = [oBandsDictionary[sBand] for sBand in asTargetBandSuffixes if sBand in oBandsDictionary]

            # resampling
            sRefBandPath = oBandsDictionary["B02"]
            oRefDs = gdal.Open(sRefBandPath)
            oTargetXSize = oRefDs.RasterXSize
            oTargetYSize = oRefDs.RasterYSize
            oTargetGeoTransform = oRefDs.GetGeoTransform()
            oTargetProjection = oRefDs.GetProjection()

            logging.debug(f"S2GeoTIFFTranslator.getGeoTiff: Target resolution (10m): {oTargetXSize}x{oTargetYSize}")

            oVRTOptions = gdal.BuildVRTOptions(
                separate=True, 
                srcNodata=0, 
                VRTNodata=0,
                xRes=10, 
                yRes=10, 
                resampleAlg=gdal.GRA_Bilinear 
            )
            
            oVRTDataset = gdal.BuildVRT("/vsimem/full_stack.vrt", ordered_vsi_paths, options=oVRTOptions)

            asCreationOptions = [
                "COMPRESS=DEFLATE",
                "PREDICTOR=2",
                "TILED=YES",
                "INTERLEAVE=BAND",
                "BLOCKXSIZE=512",
                "BLOCKYSIZE=512"
            ]

            logging.debug(f"S2GeoTIFFTranslator.getGeoTiff: GEOTIFF creation")
            gdal.Translate(sGeoTIFFOutputPath, oVRTDataset, format="GTiff", creationOptions=asCreationOptions)

            oFinalDs = gdal.Open(sGeoTIFFOutputPath, gdal.GA_Update)
            for i, suffix in enumerate([s for s in asTargetBandSuffixes if s in oBandsDictionary]):
                oBand = oFinalDs.GetRasterBand(i + 1)
                oBand.SetDescription(f"Sentinel-2 Band {suffix}")
            
            oFinalDs = None
            oVRTDataset = None
            
            logging.debug(f"S2GeoTIFFTranslator.getGeoTiff: Output file: {sGeoTIFFOutputPath}")

            return sGeoTIFFOutputPath

        except Exception as oE:
            logging.error(f"S2GeoTIFFTranslator.getGeoTiff: Error occurred while processing the ZIP file: {oE}")
            return None