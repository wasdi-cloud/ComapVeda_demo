import os
import re
from osgeo import gdal


gdal.UseExceptions()


input_zip_path = r"C:\S2A_MSIL1C_20260316T103041_N0512_R108_T32TMR_20260316T172545.SAFE.zip"
output_geotiff_path = "S2_FullStack_12Bands_10m.tif"

# Elenco completo delle bande Sentinel-2 (Convenzione S2)
# Nota: B08 è a 10m, B8A è a 20m. B10 è spesso omessa nei prodotti L2A ma presente nei L1C.
target_band_suffixes = [
    "B01", "B02", "B03", "B04", "B05", "B06", 
    "B07", "B08", "B8A", "B09", "B11", "B12"
]

def get_vsi_band_paths(zip_file_path, suffixes):
    normalized_zip_path = os.path.abspath(zip_file_path).replace("\\", "/")
    vsi_base_path = f"/vsizip/{normalized_zip_path}"
    found_paths = {}

    def recursive_vsi_scan(current_path):
        files = gdal.ReadDir(current_path)
        if files is None: return
        
        for file_name in files:
            full_path = f"{current_path}/{file_name}"
            stat = gdal.VSIStatL(full_path)
            if stat and bool(stat.mode & 0o040000):
                recursive_vsi_scan(full_path)
            elif stat:
                if not any(x in file_name for x in ["MSK_", "TCI_", "PVI_", "预览"]):
                    for suffix in suffixes:
                        pattern = rf"_{suffix}(?:_.*)?\.jp2$"
                        if re.search(pattern, file_name):
                            found_paths[suffix] = full_path

    print(f"Scanning file")
    recursive_vsi_scan(vsi_base_path)
    return found_paths

def main():
    try:
        all_bands_dict = get_vsi_band_paths(input_zip_path, target_band_suffixes)
        
        missing = set(target_band_suffixes) - set(all_bands_dict.keys())
        if missing:
            print(f"Missing bands: {missing}.")

        ordered_vsi_paths = [all_bands_dict[s] for s in target_band_suffixes if s in all_bands_dict]

        # resampling
        ref_band_path = all_bands_dict["B02"]
        ref_ds = gdal.Open(ref_band_path)
        target_x_size = ref_ds.RasterXSize
        target_y_size = ref_ds.RasterYSize
        target_geotransform = ref_ds.GetGeoTransform()
        target_projection = ref_ds.GetProjection()

        print(f"Target resolution (10m): {target_x_size}x{target_y_size}")

        vrt_options = gdal.BuildVRTOptions(
            separate=True, 
            srcNodata=0, 
            VRTNodata=0,
            xRes=10, 
            yRes=10, 
            resampleAlg=gdal.GRA_Bilinear 
        )
        
        vrt_dataset = gdal.BuildVRT("/vsimem/full_stack.vrt", ordered_vsi_paths, options=vrt_options)

        creation_options = [
            "COMPRESS=DEFLATE",
            "PREDICTOR=2",
            "TILED=YES",
            "INTERLEAVE=BAND",
            "BLOCKXSIZE=512",
            "BLOCKYSIZE=512"
        ]

        print(f"GEOTIFF creation")
        gdal.Translate(output_geotiff_path, vrt_dataset, format="GTiff", creationOptions=creation_options)

        final_ds = gdal.Open(output_geotiff_path, gdal.GA_Update)
        for i, suffix in enumerate([s for s in target_band_suffixes if s in all_bands_dict]):
            band = final_ds.GetRasterBand(i + 1)
            band.SetDescription(f"Sentinel-2 Band {suffix}")
        
        final_ds = None
        vrt_dataset = None
        
        print(f"\nOutput file: {output_geotiff_path}")

    except Exception as e:
        print(f"\n[error] {e}")

if __name__ == "__main__":
    main()