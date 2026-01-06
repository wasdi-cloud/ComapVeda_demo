import React, {useCallback, useState} from 'react';
import Map, {Marker, Popup} from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

// Update these imports in MapboxMap.jsx
import MapboxDraw from '@mapbox/mapbox-gl-draw'; // Or the maplibre version

import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import * as turf from '@turf/turf';


// Replace 'YOUR_MAPBOX_ACCESS_TOKEN' with your actual token
const MAPBOX_TOKEN = 'pk.eyJ1IjoidGhlb25seWppaGVkIiwiYSI6ImNtaXE1YnAwbjAxb2Y0d3M5bmh3c2ttankifQ.Cknxaxa3HQaI-_8pfqFz6w';
const MapboxMap = ({ markers, initialView }) => {
    const [selectedMarker, setselectedMarker] = useState(null);
    const [measurements, setMeasurements] = useState(""); // To show area/distance

    const sTILE_URL = "http://127.0.0.1:8000/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=TCI.tif";

    const updateMeasurements = useCallback((event) => {
        const oData = event.features[0];
        if (!oData) return;

        if (oData.geometry.type === 'LineString') {
            const dDistance = turf.length(oData, { units: 'kilometers' });
            setMeasurements(`Distance: ${dDistance.toFixed(3)} km`);
        } else if (oData.geometry.type === 'Polygon') {
            const dArea = turf.area(oData);
            setMeasurements(`Area: ${(dArea / 1000000).toFixed(3)} km²`);
        }
    }, []);

    const handleMapLoad = (e) => {
        const oMap = e.target;

        // --- 1. GEOTIFF LAYER (Your existing code) ---
        if (!oMap.getSource('my-geotiff-source')) {
            oMap.addSource('my-geotiff-source', {
                type: 'raster',
                tiles: [sTILE_URL],
                tileSize: 256,
                ...(initialView.bounds ? { bounds: initialView.bounds } : {})
            });
            oMap.addLayer({
                id: 'geotiff-layer',
                type: 'raster',
                source: 'my-geotiff-source',
            });
        }

        // --- 2. MAPBOX DRAW SETUP ---
        const oDraw = new MapboxDraw({
            displayControlsDefault: false,
            controls: {
                polygon: true,
                line_string: true,
                trash: true
            },
            defaultMode: 'simple_select'
        });

        oMap.addControl(oDraw, 'top-left');

        // To ensure the measurement updates while dragging a corner:
        oMap.on('oDraw.update', (e) => {
            // This fires when a vertex is moved
            updateMeasurements(e);
        });

        // Helpful Trick: Click a shape to enter direct_select (vertex editing)
        oMap.on('oDraw.selectionchange', (e) => {
            if (e.features.length > 0 && e.features[0].geometry.type !== 'Point') {
                const sFeatureId = e.features[0].id;
                // Force the mode to direct_select so corners appear immediately
                if (oDraw.getMode() !== 'direct_select') {
                    oDraw.changeMode('direct_select', { sFeatureId });
                }
            }
        });

        // // --- 3. DRAW EVENTS ---
        // // Triggered when finished drawing
        // oMap.on('oDraw.create', (e) => updateMeasurements(e));
        // // Triggered when edges are moved/edited
        // oMap.on('oDraw.update', (e) => updateMeasurements(e));
        // // Clear measurements when deleted
        oMap.on('oDraw.delete', () => setMeasurements(""));
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Measurement HUD */}
            {measurements && (
                <div style={{
                    position: 'absolute', top: 10, right: 10, zIndex: 1,
                    background: 'white', padding: '10px', borderRadius: '4px',
                    boxShadow: '0 0 10px rgba(0,0,0,0.2)', fontWeight: 'bold'
                }}>
                    {measurements}
                </div>
            )}

            <Map
                mapboxAccessToken={MAPBOX_TOKEN}
                initialViewState={{
                    longitude: initialView.longitude,
                    latitude: initialView.latitude,
                    zoom: initialView.zoom
                }}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/basic-v9"
                onLoad={handleMapLoad}
            >
                {markers.map((marker, index) => (
                    <Marker
                        key={index}
                        latitude={marker.position[0]}
                        longitude={marker.position[1]}
                        onClick={e => {
                            e.originalEvent.stopPropagation();
                            setselectedMarker(marker);
                        }}
                    />
                ))}

                {selectedMarker && (
                    <Popup
                        latitude={selectedMarker.position[0]}
                        longitude={selectedMarker.position[1]}
                        onClose={() => setselectedMarker(null)}
                    >
                        <div dangerouslySetInnerHTML={{ __html: selectedMarker.popupContent }} />
                    </Popup>
                )}
            </Map>
        </div>
    );
};

export default MapboxMap;
