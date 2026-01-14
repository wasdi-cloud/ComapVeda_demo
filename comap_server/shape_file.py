import shapefile

def tryShapefileCreation(oGeoJSONFeature):

    oProperties = oGeoJSONFeature.get("properties", {})

    oWriter = shapefile.Writer("./shape_file_test")

    # add the properties to the shapefile
    for oKey, oValue in oProperties.items():
        if isinstance(oValue, bool):
            oWriter.field(oKey, "L") # logical boolean
        elif isinstance(oValue, int):
            oWriter.field(oKey, "N", decimal=0) # integer
        elif isinstance(oValue, float):
            oWriter.field(oKey, "N", decimal=8) # float with 8 decimal places
        elif isinstance(oValue, str):
            oWriter.field(oKey, "C", size=255) # character string

    # add the geometry to the shapefile
    oGeometry = oGeoJSONFeature.get("geometry", {})
    sGeometryType = oGeometry.get("type", "")
    aoCoordinates = oGeometry.get("coordinates", [])

    if sGeometryType == "Point":
        oWriter.point(aoCoordinates[0], aoCoordinates[1])
    elif sGeometryType == "LineString":
        oWriter.line([aoCoordinates])   
    elif sGeometryType == "Polygon":
        oWriter.poly(aoCoordinates)
    elif sGeometryType == "MultiPolygon":
        aoPolygons = []
        for aoPolygon in aoCoordinates:
            aoPolygons.append(aoPolygon)
        oWriter.poly(aoPolygons)

    # add the properties values
    oWriter.record(**oProperties)

    oWriter.close()

    print("Shapefile created")



def tryShapefileReading():
    oReader = shapefile.Reader("shape_file_test.shp")

    print(f"Total features: {len(oReader)}")

    print("\n### Fields")
    for oField in oReader.fields:
        print(oField)

    print("\n### Record")
    for oRecord in oReader.records():
        print(oRecord)

    print("\n### Geometry")
    for oShape in oReader.shapes():
        print(f"Type: {oShape.shapeType}") 
        print(f"Coords: {oShape.points}")


if __name__ == "__main__":
    oGeoJSONFeature = {
    "type": "Feature",
    "geometry": {
        "type": "Polygon",
        "coordinates": [[
            [-0.12, 51.50],
            [-0.12, 51.51],
            [-0.10, 51.51],
            [-0.10, 51.50],
            [-0.12, 51.50]
        ]]
    },
    "properties": {
        "id": 1,
        "name": "Sample Area",
        "valid": True,
        "score": 95.5
    }
}


    # tryShapefileCreation(oGeoJSONFeature)
    tryShapefileReading()