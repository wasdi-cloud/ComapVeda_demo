import React, {useState} from 'react';
import Map ,{ Marker, Popup }from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';


// Replace 'YOUR_MAPBOX_ACCESS_TOKEN' with your actual token
    const MAPBOX_TOKEN = 'pk.eyJ1IjoidGhlb25seWppaGVkIiwiYSI6ImNtaXE1YnAwbjAxb2Y0d3M5bmh3c2ttankifQ.Cknxaxa3HQaI-_8pfqFz6w';
const MapboxMap = ({ markers }) => {
    // We only need state for the currently selected marker for the Popup
    const [selectedMarker, setSelectedMarker] = useState(null);

    return (
        // The Map component needs width and height to fill its parent
        <Map
            mapboxAccessToken={MAPBOX_TOKEN}
            initialViewState={{
                longitude: -74.0060, // Centering on New York (from initial view)
                latitude: 40.7128,
                zoom: 3,
                pitch: 0,
                bearing: 0
            }}
            // Fix: Use 100% width and height to match the parent <div> in App.jsx
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/basic-v9" // Using a common style
            // mapStyle="mapbox://styles/mapbox/outdoors-v12" // Using a common style
            // mapStyle="mapbox://styles/mapbox/light-v10" // Using a common style
            maxPitch={0}
            dragRotate={false}
            touchZoomRotate={{ rotation: false, pitch: false }}
        >
            {/* -------------------- 1. MARKERS -------------------- */}
            {markers.map((marker, index) => (
                <Marker
                    key={index}
                    latitude={marker.position[0]} // Mapbox uses [lat, lon]
                    longitude={marker.position[1]}
                    // Event handler to show the popup on click
                    onClick={e => {
                        // Stop propagation to prevent map events (like zooming)
                        e.originalEvent.stopPropagation();
                        setSelectedMarker(marker);
                    }}
                    // Optional: You can customize the marker pin color/style here
                    // color="red"
                />
            ))}

            {/* -------------------- 2. POPUP -------------------- */}
            {selectedMarker && (
                <Popup
                    latitude={selectedMarker.position[0]}
                    longitude={selectedMarker.position[1]}
                    closeButton={true}
                    closeOnClick={false}
                    onClose={() => setSelectedMarker(null)} // Hide popup on close
                    anchor="bottom"
                >
                    {/* Display the HTML content from your markerData */}
                    <div dangerouslySetInnerHTML={{ __html: selectedMarker.popupContent }} />
                </Popup>
            )}
        </Map>
    );
};

export default MapboxMap;
