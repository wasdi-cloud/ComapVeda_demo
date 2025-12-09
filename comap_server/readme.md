Before installing the required libraries using the requirements.txt file, it is necessary to install GDAL. 
For installing GDAL on Windows, we can follow the wasdi docs: https://wasdi.readthedocs.io/en/latest/PythonCookbook/InstallGDAL.html


The demo works with a GeoTiff file (called TCI.tif) that needs to be added manually in the folder 'comap_server'.

From the terminal, the FastAPI server can be run with the following command:
`uvicorn main:oApp --reload`

The server will listen at the following address:
http://127.0.0.1:8000/

To see the available endpoints, you can check the docs at:
http://127.0.0.1:8000/docs

For a preview of a file, the addres to check is:
http://127.0.0.1:8000/preview?url=TCI.tif

An example of a call with:
* zoom level: 5
* colum of the tile (x): 14
* row of the tile (y): 18

http://127.0.0.1:8000/tiles/WebMercatorQuad/5/18/14.png?url=TCI.tif


