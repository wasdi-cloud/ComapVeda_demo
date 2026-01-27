import React, {useEffect, useRef, useState} from 'react';
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
                       aoMarkers = [],
                       oInitialView,
                       onDrawUpdate,
                       sActiveGeoTIFF,
                       bEnableGeocoder = false,
                       bEnableDraw = true,
                       sInitialMapStyle = "mapbox://styles/mapbox/satellite-v9"
                   }) => {

    // Internal State
    const [oSelectedMarker, setSelectedMarker] = useState(null);
    const [sMeasurements, setMeasurements] = useState("");
    const [sMapStyle, setMapStyle] = useState(sInitialMapStyle);

    const mapRef = useRef(null);

    // --- NEW: Track the current source/layer ID to ensure clean removal ---
    const activeLayerIdRef = useRef(null);

    // --- 1. ROBUST LAYER UPDATE ---
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const refreshLayer = () => {
            // A. CLEANUP: Remove the SPECIFIC previous layer we added
            if (activeLayerIdRef.current) {
                if (map.getLayer(activeLayerIdRef.current)) {
                    map.removeLayer(activeLayerIdRef.current);
                }
                if (map.getSource(activeLayerIdRef.current)) {
                    map.removeSource(activeLayerIdRef.current);
                }
                activeLayerIdRef.current = null;
            }

            // B. ADD NEW: If we have a file selected
            if (sActiveGeoTIFF) {
                // Generate a unique ID to prevent cache/internal conflicts
                const uniqueId = `geotiff-${Date.now()}`;
                const sTileUrl = `http://127.0.0.1:8000/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=${sActiveGeoTIFF}`;

                try {
                    // Add Source
                    map.addSource(uniqueId, {
                        type: 'raster',
                        tiles: [sTileUrl],
                        tileSize: 256,
                    });

                    // Add Layer
                    map.addLayer({
                        id: uniqueId,
                        type: 'raster',
                        source: uniqueId,
                        paint: {'raster-opacity': 1}
                    });

                    // Save this ID so we can remove it next time
                    activeLayerIdRef.current = uniqueId;
                } catch (error) {
                    console.error("Mapbox layer error:", error);
                }
            }
        };

        // Execute immediately.
        // We removed 'isStyleLoaded' check because addSource/addLayer usually queues if busy.
        refreshLayer();

        // Optional: Re-run if style changes (e.g. satellite -> street)
        const onStyleData = () => {
            // Only re-add if we lost our layer due to style switch
            if (activeLayerIdRef.current && !map.getLayer(activeLayerIdRef.current)) {
                refreshLayer();
            }
        };

        map.on('styledata', onStyleData);
        return () => {
            map.off('styledata', onStyleData);
        };

    }, [sActiveGeoTIFF, sMapStyle]); // Dependencies

    // --- 2. MAP LOAD HANDLER (Controls Only) ---
    const handleMapLoad = (e) => {
        const oMap = e.target;
        mapRef.current = oMap;

        if (bEnableGeocoder) {
            const oGeocoder = new MapboxGeocoder({
                accessToken: MAPBOX_TOKEN,
                mapboxgl: require('mapbox-gl'),
                marker: false,
                collapsed: true
            });
            oMap.addControl(oGeocoder, 'top-right');
        }

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

            oMap.on('draw.selectionchange', (e) => {
                if (e.features.length > 0 && e.features[0].geometry.type !== 'Point') {
                    const sFeatureId = e.features[0].id;
                    if (oDraw.getMode() !== 'direct_select') {
                        oDraw.changeMode('direct_select', {featureId: sFeatureId});
                    }
                }
            });
        }
    };

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

    return (
        <div style={{position: 'relative', width: '100%', height: '100%'}}>

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

            {sMeasurements && (
                <div style={{
                    position: 'absolute', top: 10, right: 50, zIndex: 1,
                    background: 'white', padding: '10px', borderRadius: '4px',
                    boxShadow: '0 0 10px rgba(0,0,0,0.2)', fontWeight: 'bold'
                }}>
                    {sMeasurements}
                </div>
            )}

            <Map
                ref={mapRef}
                mapboxAccessToken={MAPBOX_TOKEN}
                initialViewState={{
                    longitude: oInitialView.longitude || 0,
                    latitude: oInitialView.latitude || 20,
                    zoom: oInitialView.zoom || 1.5
                }}
                style={{width: '100%', height: '100%'}}
                mapStyle={sMapStyle}
                onLoad={handleMapLoad}
            >
                <NavigationControl position='bottom-right'/>

                {aoMarkers && aoMarkers.length > 0 && aoMarkers.map((marker, index) => (
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
