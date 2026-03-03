import MapboxMap from "../components/MapboxMap";
import LeafletMap from "../components/LeafletMap";
import {useEffect, useState} from "react";

function TestPage() {
    // 1. State for Markers (Points) and Map View (Center/Zoom)
    const [markers, setMarkers] = useState([]);
    const [viewState, setViewState] = useState(null);

    // 2. Fetch Data on Component Mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                // A. Fetch the Points
                const pointsRes = await fetch("http://127.0.0.1:8000/get_three_points");
                const pointsJson = await pointsRes.json();

                const formattedMarkers = pointsJson.points.map((p, index) => ({
                    position: [p.lat, p.lng],
                    popupContent: `<h3>Point ${index + 1}</h3><p>Lat: ${p.lat}, Lng: ${p.lng}</p>`
                }));
                setMarkers(formattedMarkers);

                // B. Fetch the Map Center (GeoTIFF Bounding Box)
                // --- FIX: ADD THE QUERY PARAMETER ?url=TCI.tif ---
                // We explicitly tell the backend which file's coordinates we need.
                const coordsRes = await fetch("http://127.0.0.1:8000/geotiff_coordinates?url=TCI.tif");

                if (!coordsRes.ok) {
                    throw new Error(`Server error: ${coordsRes.status}`);
                }

                const coordsJson = await coordsRes.json();

                if (coordsJson.bbox) {
                    const ne = coordsJson.bbox.northEast;
                    const sw = coordsJson.bbox.southWest;

                    const centerLat = (ne.lat + sw.lat) / 2;
                    const centerLng = (ne.lng + sw.lng) / 2;
                    const boundsArray = [sw.lng, sw.lat, ne.lng, ne.lat];

                    setViewState({
                        latitude: centerLat,
                        longitude: centerLng,
                        zoom: 5,
                        bounds: boundsArray
                    });
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                // Optional: You could set an error state here to show "Failed to Load" on screen
            }
        };

        fetchData();
    }, []);

    return (
        <div className="App">
            <h1>Dual Map Project</h1>

            <div style={{display: 'flex', gap: '20px'}}>
                <div style={{flex: 1, height: '500px'}}>
                    <h2>Leaflet Map</h2>
                    {viewState ? (
                        // Pass activeGeoTIFF="TCI.tif" so the map loads that specific layer
                        <LeafletMap
                            markers={markers}
                            initialView={viewState}
                            activeGeoTIFF="TCI.tif"
                        />
                    ) : <p>Loading Map Data...</p>}
                </div>

                <div style={{flex: 1, height: '500px'}}>
                    <h2>Mapbox Map</h2>
                    {viewState ? (
                        <MapboxMap aoMarkers={markers} oInitialView={viewState}/>
                    ) : <p>Loading Map Data...</p>}
                </div>
            </div>
        </div>
    );
}

export default TestPage;
