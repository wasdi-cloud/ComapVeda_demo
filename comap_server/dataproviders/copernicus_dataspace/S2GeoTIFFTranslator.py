import os
import re
import logging
# from osgeo import gdal

class S2GeoTIFFTranslator:

    def __init__(self):
        # gdal.UseExceptions()
        pass

    def _recursiveVSIScan(self, sCurrentPath, asSuffixes, oFoundPaths):
        from osgeo import gdal 
        asFiles = gdal.ReadDir(sCurrentPath)
        if asFiles is None: 
            return
        
        for sFileName in asFiles:
            sFullPath = f"{sCurrentPath}/{sFileName}"
            oStat = gdal.VSIStatL(sFullPath)
            
            # Check if it's a directory (using bitwise AND on the mode)
            if oStat and bool(oStat.mode & 0o040000):
                self._recursiveVSIScan(sFullPath, asSuffixes, oFoundPaths)
            
            elif oStat:
                # Filter out metadata/preview files
                if not any(x in sFileName for x in ["MSK_", "TCI_", "PVI_", "预览"]):
                    for sSuffix in asSuffixes:
                        oPattern = rf"_{sSuffix}(?:_.*)?\.jp2$"
                        if re.search(oPattern, sFileName):
                            oFoundPaths[sSuffix] = sFullPath

    def _getBandPaths(self, sZipFilePath, asSuffixes):
        if not os.path.exists(sZipFilePath):
            logging.warning("S2GeoTIFFTranslator._getBandPaths: ZIP file not found.")
            return None
        
        sVSIBasePath = f"/vsizip/{sZipFilePath}"
        oFoundPaths = {}

        logging.debug(f"S2GeoTIFFTranslator: Scanning {sZipFilePath} for bands {asSuffixes}")
        self._recursiveVSIScan(sVSIBasePath, asSuffixes, oFoundPaths)
        
        return oFoundPaths
    

    def getGeoTiff(self, sZipPath, sGeoTIFFOutputPath, asTargetBandSuffixes):
        from osgeo import gdal 
        gdal.UseExceptions()

        if not sZipPath or not sGeoTIFFOutputPath:
            logging.error("S2GeoTIFFTranslator: Missing file paths.")
            return None
        
        try:
            oBandsDictionary = self._getBandPaths(sZipPath, asTargetBandSuffixes)
            
            if not oBandsDictionary or "B02" not in oBandsDictionary:
                logging.error("S2GeoTIFFTranslator: Required reference band B02 missing.")
                return None

            # Filter and order paths based on the requested suffixes
            ordered_vsi_paths = [
                oBandsDictionary[sBand] for sBand in asTargetBandSuffixes 
                if sBand in oBandsDictionary
            ]

            # Use VRT to stack bands and resample to 10m (Resolution of B02)
            oVRTOptions = gdal.BuildVRTOptions(
                separate=True, 
                srcNodata=0, 
                VRTNodata=0,
                xRes=10, 
                yRes=10, 
                resampleAlg=gdal.GRA_Bilinear 
            )
            
            oVRTDataset = gdal.BuildVRT("/vsimem/stack.vrt", ordered_vsi_paths, options=oVRTOptions)

            # Define Cloud Optimized GeoTIFF (COG) friendly creation options
            asCreationOptions = [
                "COMPRESS=DEFLATE", "PREDICTOR=2", "TILED=YES",
                "INTERLEAVE=BAND", "BLOCKXSIZE=512", "BLOCKYSIZE=512"
            ]

            gdal.Translate(sGeoTIFFOutputPath, oVRTDataset, format="GTiff", creationOptions=asCreationOptions)

            # Set Band Descriptions for metadata clarity
            oFinalDs = gdal.Open(sGeoTIFFOutputPath, gdal.GA_Update)
            valid_bands = [s for s in asTargetBandSuffixes if s in oBandsDictionary]
            for i, suffix in enumerate(valid_bands):
                oBand = oFinalDs.GetRasterBand(i + 1)
                oBand.SetDescription(f"Sentinel-2 Band {suffix}")
            
            oFinalDs = None # Explicitly close to flush to disk
            return sGeoTIFFOutputPath

        except Exception as e:
            logging.error(f"S2GeoTIFFTranslator: Error during translation: {e}")
            return None
