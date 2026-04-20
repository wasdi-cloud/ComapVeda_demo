import asyncio
import time
import logging
import morecantile

from fastapi import FastAPI, Request, HTTPException, Query, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from rasterio import RasterioIOError
from rio_tiler.errors import TileOutsideBounds
from rio_tiler.io import Reader
from rio_tiler.types import BBox
from sqlalchemy.orm import Session
from starlette.middleware.cors import CORSMiddleware
from titiler.core.factory import MultiBaseTilerFactory, TilerFactory
from api.AuthResource import oRouter as oAuthRouter
from api.UserResource import oRouter as oUserRouter
from api.ImageResource import oRouter as oImageRouter
from api.LabelsResource import oRouter as oLabelsRouter
from api.ProjectResource import oRouter as oProjectRouter
from api.TemplateResource import oRouter as oTemplateRouter
from api.DatasetPathParams import DatasetPathParams
from utils.CogPathResolver import CogIdParams
from dataproviders.copernicus_dataspace.Sentinel2ZipReader import Sentinel2ZipReader
from database import Base, engine, ensure_legacy_schema_compatibility
from database import get_db
from entities.DatasetImage import DatasetImageEntity
from entities.DatasetProject import DatasetProjectEntity
from utils.WebsocketManager import oWsManager

# setting the level of the logger
logging.basicConfig(level=logging.DEBUG)
# Ensure named loggers (e.g. api.ProjectResource) propagate to the root handler
# even when Uvicorn resets the root logger on startup
logging.getLogger("api").setLevel(logging.DEBUG)
logging.getLogger("utils").setLevel(logging.DEBUG)
# Suppress noisy GDAL/rasterio debug messages that flood logs under concurrent load
logging.getLogger("rasterio").setLevel(logging.WARNING)


print("Building database tables...")
Base.metadata.create_all(bind=engine)
ensure_legacy_schema_compatibility()

# Configure root_path for reverse proxy with path prefix stripping
# Traefik strips /api, but we need FastAPI to know it's behind /api for docs
oApp = FastAPI(root_path="/api")

# Hex representation of a 1x1 pixel transparent PNG
TRANSPARENT_PNG = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'


# 1. Handle Out of Bounds (Valid file, wrong zoom/pan) -> Silent
@oApp.exception_handler(TileOutsideBounds)
async def tile_out_of_bounds_handler(request: Request, exc: TileOutsideBounds):
    """
    Return a valid 1x1 transparent PNG with Status 200.
    1. Browser sees 200 OK -> No Red Console Error.
    2. Mapbox sees valid PNG -> No "Decode Error".
    3. User sees nothing -> Correct visual behavior.
    """
    return Response(content=TRANSPARENT_PNG, media_type="image/png")


# 2. Handle Missing File (Invalid file path) -> 404 Error
@oApp.exception_handler(RasterioIOError)
async def file_not_found_handler(request: Request, exc: RasterioIOError):
    """
    Handle cases where the requested GeoTIFF file does not exist on the server.
    """
    # Option A: Return 404 (Correct HTTP behavior)
    # The browser will log a 404, but the server won't crash.
    # Mapbox will just show nothing for this tile.
    return Response(content="File not found", status_code=404)


# add CORS middleware
oApp.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allows all origins - need to be more restrictive in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Limit concurrent GDAL/rasterio tile operations to prevent thread-pool exhaustion.
# A browser map view fires many parallel tile requests; without a cap all threads block
# on GDAL's internal global lock, starving every other endpoint.
_SENTINEL_TILE_SEMAPHORE = asyncio.Semaphore(4)


@oApp.middleware("http")
async def limit_sentinel_concurrency(request: Request, call_next):
    """Serialize Sentinel tile rendering so the GDAL thread pool never saturates."""
    if request.url.path.startswith("/sentinel/"):
        async with _SENTINEL_TILE_SEMAPHORE:
            return await call_next(request)
    return await call_next(request)


# Tiler factory instance
oCog = TilerFactory(path_dependency=CogIdParams)
#oSentinelRouter = MultiBaseTilerFactory(reader=Sentinel2ZipReader, path_dependency=DatasetPathParams)

# TiTiler endpoints
#oApp.include_router(oCog.router, tags=["Cloud Optimized GeoTIFF"])
#oApp.include_router(oSentinelRouter.router, prefix="/sentinel", tags=["Sentinel-2 ZIP Tiler"])
oApp.include_router(oCog.router, prefix="/sentinel", tags=["Cloud Optimized GeoTIFF"])

# Endpoints for business logic
oApp.include_router(oProjectRouter, tags=["Project Management"])
oApp.include_router(oTemplateRouter, tags=["Template Management"])
oApp.include_router(oImageRouter, tags=["Image Management"])
oApp.include_router(oLabelsRouter, tags=["Label Management"])
oApp.include_router(oAuthRouter, tags=["Authentication"])
oApp.include_router(oUserRouter, tags=["User"])

s_WEB_MERCATOR_TMS = morecantile.tms.get("WebMercatorQuad")


@oApp.get("/")
async def root():
    return {"message": "Hello, World!"}


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
    


@oApp.get("/seed-demo-images")  # Put this in main.py, or use @oRouter.get if in ImageResource.py
async def seed_demo_images(oDB: Session = Depends(get_db)):
    """
    Run this ONCE to populate the DB with your 3 hardcoded images.
    It attaches them to the first existing project it finds.
    """
    try:
        # 1. Check if we already seeded (Idempotency)
        if oDB.query(DatasetImageEntity).filter(DatasetImageEntity.id == "1").first():
            return {"message": "Images already exist in DB! No action taken."}

        # 2. Find ANY existing project to attach these images to
        oProject = oDB.query(DatasetProjectEntity).first()
        if not oProject:
            return {"status": "error",
                    "message": "No projects found! Please go to the UI and create at least one project first."}

        # 3. Create your 3 Hardcoded Images linking to the real project
        images = [
            DatasetImageEntity(
                id="1",
                projectId=oProject.id,
                fileName="s2.tif",
                date=int(time.time() * 1000)
            ),
            DatasetImageEntity(
                id="2",
                projectId=oProject.id,
                fileName="TCI.tif",
                date=int(time.time() * 1000)
            ),
            DatasetImageEntity(
                id="3",
                projectId=oProject.id,
                fileName="TCI.tif",
                date=int(time.time() * 1000)
            )
        ]

        oDB.add_all(images)
        oDB.commit()

        return {"status": "success",
                "message": f"Demo images successfully injected and linked to Project: {oProject.name}"}
    except Exception as e:
        oDB.rollback()
        return {"status": "error", "error": str(e)}
    
@oApp.websocket("/ws/{sProjectId}")
async def connectWebsocket(oWebsocket: WebSocket, sProjectId: str):
    await oWsManager.connect(sProjectId, oWebsocket)
    try:
        while True:
            # keep the connection open and listen for messages
            sData = await oWebsocket.receive_text()
    except WebSocketDisconnect:
        oWsManager.disconnect(sProjectId, oWebsocket)


if __name__ == "__main__":
    """
    To run the application from terminal, use the following command:
    uvicorn main:oApp --reload
    """

    import uvicorn

    print("Starting FastAPI server")

    uvicorn.run("main:oApp", host="127.0.0.1", port=8000, reload=True)
