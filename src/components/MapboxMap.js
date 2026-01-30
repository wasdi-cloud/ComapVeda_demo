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
                       sInitialMapStyle = "mapbox://styles/mapbox/satellite-v9",
                       sSelectedFeatureId, // ID coming from Table Click
                       onFeatureSelect  ,
                       aoFeatures = [],// Function to notify Table,
                       // NEW PROP: Image Opacity (0.0 to 1.0)
                       iImageOpacity = 1,
                       oZoomToBBox = null
                   }) => {

    // Internal State
    const [oSelectedMarker, setSelectedMarker] = useState(null);
    const [sMeasurements, setMeasurements] = useState("");
    const [sMapStyle, setMapStyle] = useState(sInitialMapStyle);

    // --- NEW: Hover Popup State ---
    const [oHoverInfo, setHoverInfo] = useState(null);

    const mapRef = useRef(null);
    const drawRef = useRef(null); // Need to access Draw instance globally
    const activeLayerIdRef = useRef(null);



    // --- SYNC TABLE SELECTION TO MAP ---
    useEffect(() => {
        // If sSelectedFeatureId changes (user clicked table row), tell Draw to select it
        if (drawRef.current && sSelectedFeatureId) {
            try {
                // Change mode to 'simple_select' with the specific ID
                drawRef.current.changeMode('simple_select', { featureIds: [sSelectedFeatureId] });
            } catch(e) {
                console.log("Draw not ready yet");
            }
        }
    }, [sSelectedFeatureId]);
// --- NEW: ZOOM TO BBOX LOGIC ---
    useEffect(() => {
        const map = mapRef.current;
        if (map && oZoomToBBox && oZoomToBBox.length === 4) {
            map.fitBounds(oZoomToBBox, {
                padding: 50, // Keep some padding around the image
                duration: 1500 // Smooth fly animation
            });
        }
    }, [oZoomToBBox]);

    // --- 1. DYNAMIC OPACITY UPDATE ---
    // This updates the opacity INSTANTLY when the slider moves
    useEffect(() => {
        const map = mapRef.current;
        const layerId = activeLayerIdRef.current;

        if (map && layerId && map.getLayer(layerId)) {
            map.setPaintProperty(layerId, 'raster-opacity', iImageOpacity);
        }
    }, [iImageOpacity]);

    useEffect(() => {
        if (!drawRef.current) return;

        const oDraw = drawRef.current;

        // 1. We create a "signature" of the current IDs to avoid unnecessary re-renders
        // But for filtering, we just wipe and rewrite.
        // NOTE: This ensures the visual map always matches the 'filteredLabels' from parent.

        // Get all current IDs in map to see if we really need to update
        // (Optimization to prevent flickering during active drawing)
        const currentIds = oDraw.getAll().features.map(f => f.id).sort().join(',');
        const newIds = aoFeatures.map(f => f.id).sort().join(',');

        // Only update if the LIST structure changed (Filtering/Deletion)
        // OR if we have enriched metadata that is missing from the map
        const needsUpdate = currentIds !== newIds || aoFeatures.some(f => f.properties.annotator && !oDraw.get(f.id)?.properties?.annotator);

        if (needsUpdate) {
            oDraw.deleteAll();
            if (aoFeatures.length > 0) {
                oDraw.add({
                    type: 'FeatureCollection',
                    features: aoFeatures
                });
            }
        }

    }, [aoFeatures]);

    // --- 1. ROBUST LAYER UPDATE ---
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const refreshLayer = () => {
            // A. CLEANUP (Same as before)
            if (activeLayerIdRef.current) {
                if (map.getLayer(activeLayerIdRef.current)) {
                    map.removeLayer(activeLayerIdRef.current);
                }
                if (map.getSource(activeLayerIdRef.current)) {
                    map.removeSource(activeLayerIdRef.current);
                }
                activeLayerIdRef.current = null;
            }

            // B. ADD NEW
            if (sActiveGeoTIFF) {
                const uniqueId = `geotiff-${Date.now()}`;
                const sTileUrl = `http://127.0.0.1:8000/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=${sActiveGeoTIFF}`;

                try {
                    map.addSource(uniqueId, {
                        type: 'raster',
                        tiles: [sTileUrl],
                        tileSize: 256,
                    });

                    // --- NEW LOGIC: FIND WHERE TO INSERT ---
                    // We want to put this image BELOW the drawing layers and BELOW text labels.

                    const layers = map.getStyle().layers;
                    let beforeId = undefined;

                    // 1. Look for the first Mapbox Draw layer
                    for (const layer of layers) {
                        if (layer.id.startsWith('gl-draw')) {
                            beforeId = layer.id;
                            break;
                        }
                    }

                    // 2. If no draw layer found, look for the first symbol (text) layer
                    // This ensures street names sit on top of your image
                    if (!beforeId) {
                        for (const layer of layers) {
                            if (layer.type === 'symbol') {
                                beforeId = layer.id;
                                break;
                            }
                        }
                    }

                    // Add the layer with the 'beforeId' argument
                    map.addLayer({
                        id: uniqueId,
                        type: 'raster',
                        source: uniqueId,
                        paint: { 'raster-opacity': iImageOpacity }
                    }, beforeId); // <--- THIS IS THE FIX

                    activeLayerIdRef.current = uniqueId;
                } catch (error) {
                    console.error("Mapbox layer error:", error);
                }
            }
        };

        refreshLayer();

        const onStyleData = () => {
            if (activeLayerIdRef.current && !map.getLayer(activeLayerIdRef.current)) {
                refreshLayer();
            }
        };

        map.on('styledata', onStyleData);
        return () => {
            map.off('styledata', onStyleData);
        };

    }, [sActiveGeoTIFF, sMapStyle]);

    useEffect(() => {
        if (drawRef.current && sSelectedFeatureId) {
            try {
                drawRef.current.changeMode('simple_select', { featureIds: [sSelectedFeatureId] });
            } catch(e) { console.log("Draw not ready"); }
        }
    }, [sSelectedFeatureId]);

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
            drawRef.current = oDraw;
            oMap.on('draw.create', (e) => handleDrawUpdate(e, oDraw));
            oMap.on('draw.update', (e) => handleDrawUpdate(e, oDraw));
            oMap.on('draw.delete', () => {
                setMeasurements("");
                if (onDrawUpdate) onDrawUpdate(oDraw.getAll());
            });

            // --- NEW: SELECTION CHANGE (Map -> Table) ---
            oMap.on('draw.selectionchange', (e) => {
                if (e.features.length > 0) {
                    const selectedId = e.features[0].id;
                    // Notify parent to highlight row
                    if(onFeatureSelect) onFeatureSelect(selectedId);

                    // Specific direct_select logic
                    if (e.features[0].geometry.type !== 'Point' && oDraw.getMode() !== 'direct_select') {
                        // Optional: automatically go to edit mode
                        // oDraw.changeMode('direct_select', { featureId: selectedId });
                    }
                } else {
                    // Deselected everything
                    if(onFeatureSelect) onFeatureSelect(null);
                }
            });

            // --- NEW: HOVER LOGIC ---
            // --- HOVER LOGIC FIXED ---
            oMap.on('mousemove', (e) => {
                // 1. DISABLE POPUP WHILE DRAWING
                const mode = oDraw.getMode();
                if (mode.startsWith('draw_')) {
                    setHoverInfo(null);
                    return; // Exit immediately
                }

                const features = oMap.queryRenderedFeatures(e.point);
                const drawFeature = features.find(f => f.source && f.source.includes('mapbox-gl-draw'));

                if (drawFeature) {
                    // 2. GET ENRICHED DATA
                    // Because we sync'd aoFeatures back to oDraw in UseEffect, this .get() now works!
                    const fullData = oDraw.get(drawFeature.properties.id);

                    if (fullData && fullData.properties && fullData.properties.annotator) {
                        setHoverInfo({
                            latitude: e.lngLat.lat,
                            longitude: e.lngLat.lng,
                            annotator: fullData.properties.annotator,
                            class: fullData.properties.className || "Shape"
                        });
                        oMap.getCanvas().style.cursor = 'pointer';
                        return;
                    }
                }

                setHoverInfo(null);
                oMap.getCanvas().style.cursor = '';
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
                {/* --- NEW: HOVER TOOLTIP --- */}
                {oHoverInfo && (
                    <Popup
                        latitude={oHoverInfo.latitude}
                        longitude={oHoverInfo.longitude}
                        closeButton={false}
                        closeOnClick={false}
                        anchor="bottom"
                        offset={15}
                    >
                        <div style={{fontSize:'12px'}}>
                            <strong>{oHoverInfo.class}</strong><br/>
                            <span style={{color:'#666'}}>By: {oHoverInfo.annotator}</span>
                        </div>
                    </Popup>
                )}
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
