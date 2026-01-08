import json
import aiofiles
from fastapi import FastAPI, Request, HTTPException, Body, Query
from titiler.core.factory import TilerFactory
from rio_tiler.errors import TileOutsideBounds
from fastapi.responses import Response
from starlette.middleware.cors import CORSMiddleware
from rio_tiler.io import Reader
from rio_tiler.types import BBox
import morecantile
from GeoJsonRequest import GeoJsonRequest

oApp = FastAPI()


@oApp.exception_handler(TileOutsideBounds)
async def tile_out_of_bounds_handler(request: Request, exc: TileOutsideBounds):
    """
    If the map asks for a tile outside the image, return 404
    instead of crashing with a 500 error.
    """
    return Response(content=None, status_code=404)


# add CORS middleware
oApp.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # allows all origins - need to be more restrictive in production
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

@oApp.get("/geotiff_coordinates")
async def geotiff_coordinates(url: str = Query("TCI.tif", description="Filename of the GeoTIFF")):
    """Returns the geographic coordinates of the corners of a GeoTIFF file."""
    try:
        # We use the 'url' param passed from React (or default)
        with Reader(url) as oScr:
            oBBox = oScr.get_geographic_bounds("epsg:4326")
            oWasdiBBox = getWasdiBoundingBox(oBBox)

            if oWasdiBBox is None:
                return {"error": "Could not convert bounding box to WASDI format"}
            return oWasdiBBox
    except Exception as oE:
        return {"error": f"Could not read {url}: {str(oE)}"}


def getWasdiBoundingBox(oBBox: BBox) -> dict | None:
    """Convert a bounding box to WASDI format."""
    try:
        return {
            "bbox": {
                "northEast": {
                    "lat": oBBox[3],
                    "lng": oBBox[2]
                },
                "southWest": {
                    "lat": oBBox[1],
                    "lng": oBBox[0]
                }
            }
        }
    except Exception as oE:
        return None

@oApp.get("/list_tiles")
async def listTiles(zoom: int = 1, url: str = "baresoil-flood.tif"):
    """List the tiles covering the GeoTIFF at a given zoom level."""
    try:
        with Reader(url) as oScr:
            oBBox = oScr.get_geographic_bounds("epsg:4326")
            iZoom = zoom
            # find all the tiles that cover the bounding box
            aoTiles = list(oScr.tms.tiles(oBBox[0], oBBox[1], oBBox[2], oBBox[3], iZoom))
            aoRes = []
            for oTile in aoTiles:
                aoRes.append({
                    "column_x": oTile.x,
                    "row_y": oTile.y,
                    "zoom_z": oTile.z
                })
        return {
            "tiles": aoRes,
            "tiles_count": len(aoTiles),
            "bbox": getWasdiBoundingBox(oBBox)
        }
    except Exception as oE:
        return {"error": str(oE)}

@oApp.post("/store_label")
async def store_label(oPayload: GeoJsonRequest):
    """Accept a raw GeoJSON object (validated by `GeoJsonRequest`) and save it.
    The `GeoJsonRequest` model validates the raw body and stores it in `.root` or `.data`.
    """
    oFilename = "storage.json"

    try:
        async with aiofiles.open(oFilename, mode='w') as oFile:
            await oFile.write(json.dumps(oPayload.root, indent=2))

        return {"status": "success", "message": "GeoJSON validated and saved."}

    except Exception as oE:
        raise HTTPException(status_code=500, detail=str(oE))


@oApp.get("/read_label")
async def read_label():
    """Read `storage.json` and return the stored GeoJSON object.
    Returns 404 if the file doesn't exist or 500 if JSON parsing fails.
    """

    oFilename = "./storage.json"
    try:
        async with aiofiles.open(oFilename, mode='r') as oFile:
            sContent = await oFile.read()
            if not sContent:
                raise HTTPException(status_code=404, detail="storage.json is empty")
            oData = json.loads(sContent)

        return oData

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="storage.json not found")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Invalid JSON in storage.json: {e}")
    except HTTPException:
        raise
    except Exception as oE:
        raise HTTPException(status_code=500, detail=str(oE))

if __name__ == "__main__":
    """
    To run the application from terminal, use the following command:
    uvicorn main:oApp --reload
    """

    import uvicorn
    uvicorn.run("main:oApp", host="127.0.0.1", port=8000, reload=True)