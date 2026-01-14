import React, {useState} from 'react';
import Map, {Marker, NavigationControl, Popup} from 'react-map-gl/mapbox'; // Note the import path
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import * as turf from '@turf/turf';

// CSS Imports
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

const MapboxMap = ({
                       aoMarkers = [],              // ao = Array of Objects
                       oInitialView,                // o = Object
                       onDrawUpdate,                // function (usually fn or on...)
                       sActiveGeoTIFF,              // s = String

                       // Booleans
                       bEnableGeocoder = false,
                       bEnableDraw = true,

                       // Strings
                       sInitialMapStyle = "mapbox://styles/mapbox/satellite-v9"
                   }) => {

    // Internal State
    const [oSelectedMarker, setSelectedMarker] = useState(null);
    const [sMeasurements, setMeasurements] = useState("");
    const [sMapStyle, setMapStyle] = useState(sInitialMapStyle);

    // Helper: Send data back to parent
    const handleDrawUpdate = (e, drawInstance) => {
        const oData = e.features[0];
        if (oData) {
            if (oData.geometry.type === 'LineString') {
                const dDistance = turf.length(oData, {units: 'kilometers'});
                setMeasurements(`Distance: ${dDistance.toFixed(3)} km`);
            } else if (oData.geometry.type === 'Polygon') {
                const dArea = turf.area(oData);
                setMeasurements(`Area: ${(dArea / 1000000).toFixed(3)} km²`);
            }
        }
        if (onDrawUpdate && drawInstance) {
            onDrawUpdate(drawInstance.getAll());
        }
    };

    const handleMapLoad = (e) => {
        const oMap = e.target;

        // --- 1. GEOCODER (Search Bar) ---
        if (bEnableGeocoder) {
            const oGeocoder = new MapboxGeocoder({
                accessToken: MAPBOX_TOKEN,
                mapboxgl: require('mapbox-gl'), // Helper to attach to map instance
                marker: false, // Do not add a default marker on search
                collapsed: true // Start collapsed to save space
            });
            oMap.addControl(oGeocoder, 'top-right');
        }

        // --- 2. MAPBOX DRAW ---
        if (bEnableDraw) {
            const oDraw = new MapboxDraw({
                displayControlsDefault: false,
                controls: {polygon: true, trash: true, line_string: true},
                defaultMode: 'simple_select'
            });

            oMap.addControl(oDraw, 'top-left');

            oMap.on('draw.create', (e) => handleDrawUpdate(e, oDraw));
            oMap.on('draw.update', (e) => handleDrawUpdate(e, oDraw));
            oMap.on('draw.delete', () => {
                setMeasurements("");
                if (onDrawUpdate) onDrawUpdate(oDraw.getAll());
            });

            // Direct Select Logic
            oMap.on('draw.selectionchange', (e) => {
                if (e.features.length > 0 && e.features[0].geometry.type !== 'Point') {
                    const sFeatureId = e.features[0].id;
                    if (oDraw.getMode() !== 'direct_select') {
                        oDraw.changeMode('direct_select', {featureId: sFeatureId});
                    }
                }
            });
        }

        // --- 3. GEOTIFF LAYER ---
        if (sActiveGeoTIFF) {
            const sTILE_URL = `http://127.0.0.1:8000/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=${sActiveGeoTIFF}`;
            if (!oMap.getSource('my-geotiff-source')) {
                oMap.addSource('my-geotiff-source', {
                    type: 'raster',
                    tiles: [sTILE_URL],
                    tileSize: 256,
                    bounds: oInitialView.bounds || undefined
                });
                oMap.addLayer({
                    id: 'geotiff-layer',
                    type: 'raster',
                    source: 'my-geotiff-source',
                });
            }
        }
    };

    return (
        <div style={{position: 'relative', width: '100%', height: '100%'}}>

            {/* --- STYLE SWITCHER (Floating Button) --- */}
            <div style={{position: 'absolute', bottom: 30, left: 10, zIndex: 10}}>
                <select
                    onChange={(e) => setMapStyle(e.target.value)}
                    value={sMapStyle}
                    style={{padding: '8px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer'}}
                >
                    <option value="mapbox://styles/mapbox/satellite-v9">🛰️ Satellite</option>
                    <option value="mapbox://styles/mapbox/streets-v11">🗺️ Streets</option>
                    <option value="mapbox://styles/mapbox/dark-v10">🌑 Dark Mode</option>
                </select>
            </div>

            {/* Measurement HUD */}
            {sMeasurements && (
                <div style={{
                    position: 'absolute', top: 10, right: 50, zIndex: 1, // Moved left slightly to avoid geocoder
                    background: 'white', padding: '10px', borderRadius: '4px',
                    boxShadow: '0 0 10px rgba(0,0,0,0.2)', fontWeight: 'bold'
                }}>
                    {sMeasurements}
                </div>
            )}

            <Map
                mapboxAccessToken={MAPBOX_TOKEN}
                initialViewState={{
                    longitude: oInitialView.longitude || 0,
                    latitude: oInitialView.latitude || 20,
                    zoom: oInitialView.zoom || 1.5
                }}
                style={{width: '100%', height: '100%'}}
                mapStyle={sMapStyle} // Uses state now, not hardcoded prop
                onLoad={handleMapLoad}
            >
                <NavigationControl position='bottom-right'/>

                {aoMarkers.map((marker, index) => (
                    <Marker
                        key={index}
                        latitude={marker.position[0]}
                        longitude={marker.position[1]}
                        onClick={e => {
                            e.originalEvent.stopPropagation();
                            setSelectedMarker(marker);
                        }}
                    />
                ))}

                {oSelectedMarker && (
                    <Popup
                        latitude={oSelectedMarker.position[0]}
                        longitude={oSelectedMarker.position[1]}
                        onClose={() => setSelectedMarker(null)}
                    >
                        <div dangerouslySetInnerHTML={{__html: oSelectedMarker.popupContent}}/>
                    </Popup>
                )}
            </Map>
        </div>
    );
};

export default MapboxMap;
