from fastapi import FastAPI
from titiler.core.factory import TilerFactory
from starlette.middleware.cors import CORSMiddleware
from rio_tiler.io import Reader
import morecantile

oApp = FastAPI()

# add CORS middleware
oApp.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # allowss all origins - need to be more restrictive in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tiler factory instance
oCog = TilerFactory()

# Register all the COG endpoints automatically
oApp.include_router(oCog.router, tags=["Cloud Optimized GeoTIFF"])

s_WEB_MERCATOR_TMS = morecantile.tms.get("WebMercatorQuad")

@oApp.get("/")
async def root():
    return {"message": "Hello, World!"}

@oApp.get("/get_three_points")
async def get_three_points():
    return {
        "points": [
            {"lat": 10, "lng": 20},
            {"lat": -30, "lng": 40},
            {"lat": 20, "lng": -7}
        ]
    }

@oApp.get("/read_geotiff")
async def read_geotiff():
    """Reads a GeoTIFF file and returns its bounds."""
    with Reader("TCI.tif") as oScr:
        oBBox = oScr.get_geographic_bounds("epsg:4326")
        print(oBBox)
        iZoom = 5
        # find all the tiles that cover the bounding box
        aoTiles = list(oScr.tms.tiles(oBBox[0], oBBox[1], oBBox[2], oBBox[3], iZoom))
        for oTile in aoTiles:
            print(oTile)
    return {"bounds": oBBox, "tiles_count": len(aoTiles)}

if __name__ == "__main__":
    """
    To run the application from terminal, use the following command:
    uvicorn main:oApp --reload
    """

    import uvicorn
    uvicorn.run("main:oApp", host="127.0.0.1", port=8000, reload=True)