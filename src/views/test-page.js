import MapboxMap from "../components/MapboxMap";
import LeafletMap from "../components/LeafletMap";
import {useEffect, useState} from "react";

function TestPage() {
    // 1. State for Markers (Points) and Map View (Center/Zoom)
    const [markers, setMarkers] = useState([]);
    const [viewState, setViewState] = useState(null); // Will hold { latitude, longitude, zoom }

    // 2. Fetch Data on Component Mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                // A. Fetch the Points
                const pointsRes = await fetch("http://127.0.0.1:8000/get_three_points");
                const pointsJson = await pointsRes.json();

                // TRANSFORM: Convert backend format {lat, lng} to frontend format [lat, lng]
                // We also add a default name/description since the endpoint doesn't provide them
                const formattedMarkers = pointsJson.points.map((p, index) => ({
                    position: [p.lat, p.lng], // Create the array [lat, lon]
                    popupContent: `<h3>Point ${index + 1}</h3><p>Lat: ${p.lat}, Lng: ${p.lng}</p>`
                }));
                setMarkers(formattedMarkers);

                // B. Fetch the Map Center (GeoTIFF Bounding Box)
                const coordsRes = await fetch("http://127.0.0.1:8000/geotiff_coordinates");
                const coordsJson = await coordsRes.json();

                if (coordsJson.bbox) {
                    const ne = coordsJson.bbox.northEast;
                    const sw = coordsJson.bbox.southWest;

                    // 1. Calculate Center (Keep this)
                    const centerLat = (ne.lat + sw.lat) / 2;
                    const centerLng = (ne.lng + sw.lng) / 2;

                    // 2. CREATE BOUNDS ARRAY: [minLng, minLat, maxLng, maxLat]
                    const boundsArray = [sw.lng, sw.lat, ne.lng, ne.lat];

                    setViewState({
                        latitude: centerLat,
                        longitude: centerLng,
                        zoom: 5,
                        bounds: boundsArray // <--- Store this new value
                    });
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="App">
            <h1>Dual Map Project</h1>

            <div style={{display: 'flex', gap: '20px'}}>
                {/* 3. Pass the data down. We check if viewState exists before rendering maps */}

                <div style={{flex: 1, height: '500px'}}>
                    <h2>Leaflet Map</h2>
                    {viewState ? (
                        <LeafletMap markers={markers} initialView={viewState}/>
                    ) : <p>Loading Map Data...</p>}
                </div>

                <div style={{flex: 1, height: '500px'}}>
                    <h2>Mapbox Map</h2>
                    {viewState ? (
                        <MapboxMap markers={markers} initialView={viewState}/>
                    ) : <p>Loading Map Data...</p>}
                </div>
            </div>
        </div>
    );
}

export default TestPage;
