import React, { useState, useEffect, useRef } from 'react';
import Map, { NavigationControl, Marker, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import * as turf from '@turf/turf';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

// --- CUSTOM STYLES (Vertices & Colors) ---
const CUSTOM_DRAW_STYLES = [
    // 1. ACTIVE (Being drawn) LINE
    {
        'id': 'gl-draw-line-inactive',
        'type': 'line',
        'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
        'layout': { 'line-cap': 'round', 'line-join': 'round' },
        'paint': {
            'line-color': ['coalesce', ['get', 'user_portColor'], '#3b82f6'],
            'line-width': 3
        }
    },
    {
        'id': 'gl-draw-line-active',
        'type': 'line',
        'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'LineString']],
        'layout': { 'line-cap': 'round', 'line-join': 'round' },
        'paint': {
            'line-color': ['coalesce', ['get', 'user_portColor'], '#fbb03b'],
            'line-dasharray': [0.2, 2],
            'line-width': 4
        }
    },
    // 2. POLYGON FILL & STROKE
    {
        'id': 'gl-draw-polygon-fill-inactive',
        'type': 'fill',
        'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
        'paint': {
            'fill-color': ['coalesce', ['get', 'user_portColor'], '#3b82f6'],
            'fill-outline-color': ['coalesce', ['get', 'user_portColor'], '#3b82f6'],
            'fill-opacity': 0.4
        }
    },
    {
        'id': 'gl-draw-polygon-fill-active',
        'type': 'fill',
        'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
        'paint': {
            'fill-color': ['coalesce', ['get', 'user_portColor'], '#fbb03b'],
            'fill-outline-color': '#fbb03b',
            'fill-opacity': 0.4
        }
    },
    {
        'id': 'gl-draw-polygon-stroke-inactive',
        'type': 'line',
        'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
        'layout': { 'line-cap': 'round', 'line-join': 'round' },
        'paint': {
            'line-color': ['coalesce', ['get', 'user_portColor'], '#3b82f6'],
            'line-width': 3
        }
    },
    {
        'id': 'gl-draw-polygon-stroke-active',
        'type': 'line',
        'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
        'layout': { 'line-cap': 'round', 'line-join': 'round' },
        'paint': {
            'line-color': '#fbb03b',
            'line-dasharray': [0.2, 2],
            'line-width': 3
        }
    },

    // --- 3. VERTEX POINTS (The white dots for editing) ---
    {
        'id': 'gl-draw-polygon-and-line-vertex-stroke-inactive',
        'type': 'circle',
        'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
        'paint': {
            'circle-radius': 6,
            'circle-color': '#fff'
        }
    },
    {
        'id': 'gl-draw-polygon-and-line-vertex-inactive',
        'type': 'circle',
        'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
        'paint': {
            'circle-radius': 4,
            'circle-color': '#fbb03b'
        }
    },
    {
        'id': 'gl-draw-point-point-stroke-active',
        'type': 'circle',
        'filter': ['all', ['==', '$type', 'Point'], ['==', 'active', 'true'], ['!=', 'meta', 'midpoint']],
        'paint': {
            'circle-radius': 8,
            'circle-color': '#fff'
        }
    },
    {
        'id': 'gl-draw-point-active',
        'type': 'circle',
        'filter': ['all', ['==', '$type', 'Point'], ['!=', 'meta', 'midpoint'], ['==', 'active', 'true']],
        'paint': {
            'circle-radius': 6,
            'circle-color': '#fbb03b'
        }
    },
    {
        'id': 'gl-draw-polygon-midpoint',
        'type': 'circle',
        'filter': ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
        'paint': {
            'circle-radius': 4,
            'circle-color': '#fbb03b',
            'circle-opacity': 0.8
        }
    }
];

const MapboxMap = ({
                       aoMarkers = [],
                       oInitialView,
                       onDrawUpdate,
                       sActiveGeoTIFF,
                       bEnableGeocoder = false,
                       bEnableDraw = true,
                       sInitialMapStyle = "mapbox://styles/mapbox/satellite-v9",
                       sSelectedFeatureId,
                       onFeatureSelect,
                       aoFeatures = [],
                       iImageOpacity = 1,
                       oZoomToBBox = null,
                       sCurrentDrawColor = "#3b82f6",
                       bHasPolygons = true,
                       bHasLines = true,
                   }) => {

    const [oSelectedMarker, setSelectedMarker] = useState(null);
    const [sMeasurements, setMeasurements] = useState("");
    const [sMapStyle, setMapStyle] = useState(sInitialMapStyle);
    const [oHoverInfo, setHoverInfo] = useState(null);

    const mapRef = useRef(null);
    const drawRef = useRef(null);
    const activeLayerIdRef = useRef(null);

    // --- SYNC COLOR TO SELECTED FEATURE ---
    useEffect(() => {
        if (drawRef.current && sSelectedFeatureId) {
            const oDraw = drawRef.current;
            oDraw.setFeatureProperty(sSelectedFeatureId, 'portColor', sCurrentDrawColor);
        }
    }, [sCurrentDrawColor, sSelectedFeatureId]);

    // --- MAPBOX DRAW SETUP ---
    const handleMapLoad = (e) => {
        const oMap = e.target;
        mapRef.current = oMap;

        if (bEnableGeocoder) {
            const oGeocoder = new MapboxGeocoder({ accessToken: MAPBOX_TOKEN, mapboxgl: require('mapbox-gl'), marker: false, collapsed: true });
            oMap.addControl(oGeocoder, 'top-right');
        }

        if (bEnableDraw) {
            const oDraw = new MapboxDraw({
                displayControlsDefault: false,
                controls: {
                    polygon: bHasPolygons,
                    line_string: bHasLines,
                    trash: true // Always leave trash enabled so they can delete mistakes
                },
                defaultMode: 'simple_select',
                userProperties: true,
                styles: CUSTOM_DRAW_STYLES
            });

            oMap.addControl(oDraw, 'top-left');
            drawRef.current = oDraw;

            oMap.on('draw.create', (e) => handleDrawUpdate(e, oDraw));
            oMap.on('draw.update', (e) => handleDrawUpdate(e, oDraw));
            oMap.on('draw.delete', () => {
                setMeasurements("");
                if (onDrawUpdate) onDrawUpdate(oDraw.getAll());
            });

            oMap.on('draw.selectionchange', (e) => {
                if (e.features.length > 0) {
                    if (onFeatureSelect) onFeatureSelect(e.features[0].id);
                } else {
                    if (onFeatureSelect) onFeatureSelect(null);
                }
            });

            oMap.on('mousemove', (e) => {
                const mode = oDraw.getMode();
                if (mode.startsWith('draw_')) { setHoverInfo(null); return; }
                const features = oMap.queryRenderedFeatures(e.point);
                const drawFeature = features.find(f => f.source && f.source.includes('mapbox-gl-draw'));
                if (drawFeature) {
                    const fullData = oDraw.get(drawFeature.properties.id);
                    if (fullData && fullData.properties && fullData.properties.annotator) {
                        setHoverInfo({
                            latitude: e.lngLat.lat, longitude: e.lngLat.lng,
                            annotator: fullData.properties.annotator, class: fullData.properties.className || "Shape"
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

    // --- OTHER EFFECTS ---
    useEffect(() => {
        const map = mapRef.current;
        if (map && oZoomToBBox && oZoomToBBox.length === 4) {
            map.fitBounds(oZoomToBBox, { padding: 50, duration: 1500 });
        }
    }, [oZoomToBBox]);

    useEffect(() => {
        const map = mapRef.current;
        const layerId = activeLayerIdRef.current;
        if (map && layerId && map.getLayer(layerId)) {
            map.setPaintProperty(layerId, 'raster-opacity', iImageOpacity);
        }
    }, [iImageOpacity]);

    useEffect(() => {
        if (drawRef.current && sSelectedFeatureId) {
            try { drawRef.current.changeMode('simple_select', { featureIds: [sSelectedFeatureId] }); } catch(e) {}
        }
    }, [sSelectedFeatureId]);

    // SYNC FEATURES: Parent -> Map
    useEffect(() => {
        if (!drawRef.current) return;
        const oDraw = drawRef.current;
        const mode = oDraw.getMode();
        if (mode.startsWith('draw_')) return;

        const currentIds = oDraw.getAll().features.map(f => f.id).sort().join(',');
        const newIds = aoFeatures.map(f => f.id).sort().join(',');

        if (currentIds !== newIds) {
            oDraw.deleteAll();
            if (aoFeatures.length > 0) {
                oDraw.add({ type: 'FeatureCollection', features: aoFeatures });
            }
        } else {
            aoFeatures.forEach(feature => {
                const currentFeature = oDraw.get(feature.id);
                if (currentFeature) {
                    if(feature.properties.portColor) {
                        oDraw.setFeatureProperty(feature.id, 'portColor', feature.properties.portColor);
                    }
                    oDraw.setFeatureProperty(feature.id, 'annotator', feature.properties.annotator);
                    oDraw.setFeatureProperty(feature.id, 'className', feature.properties.className);
                }
            });
        }
    }, [aoFeatures]);

    // Layer Update
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        const refreshLayer = () => {
            if (activeLayerIdRef.current) {
                if (map.getLayer(activeLayerIdRef.current)) map.removeLayer(activeLayerIdRef.current);
                if (map.getSource(activeLayerIdRef.current)) map.removeSource(activeLayerIdRef.current);
                activeLayerIdRef.current = null;
            }
            if (sActiveGeoTIFF) {
                const uniqueId = `geotiff-${Date.now()}`;
                const sTileUrl = `${process.env.REACT_APP_API_URL}tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=${sActiveGeoTIFF}`;
                try {
                    map.addSource(uniqueId, { type: 'raster', tiles: [sTileUrl], tileSize: 256 });
                    const layers = map.getStyle().layers;
                    let beforeId = undefined;
                    for (const layer of layers) { if (layer.id.startsWith('gl-draw')) { beforeId = layer.id; break; } }
                    if (!beforeId) { for (const layer of layers) { if (layer.type === 'symbol') { beforeId = layer.id; break; } } }
                    map.addLayer({ id: uniqueId, type: 'raster', source: uniqueId, paint: { 'raster-opacity': iImageOpacity } }, beforeId);
                    activeLayerIdRef.current = uniqueId;
                } catch (error) { console.error(error); }
            }
        };
        refreshLayer();
        const onStyleData = () => { if (activeLayerIdRef.current && !map.getLayer(activeLayerIdRef.current)) refreshLayer(); };
        map.on('styledata', onStyleData);
        return () => { map.off('styledata', onStyleData); };
    }, [sActiveGeoTIFF, sMapStyle]);

    const handleDrawUpdate = (e, drawInstance) => {
        if (onDrawUpdate && drawInstance) onDrawUpdate(drawInstance.getAll());
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>

            {/* --- RESTORED: STYLE PICKER --- */}
            <div style={{ position: 'absolute', bottom: 30, left: 10, zIndex: 10 }}>
                <select onChange={(e) => setMapStyle(e.target.value)} value={sMapStyle} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}>
                    <option value="mapbox://styles/mapbox/satellite-v9">🛰️ Satellite</option>
                    <option value="mapbox://styles/mapbox/streets-v11">🗺️ Streets</option>
                    <option value="mapbox://styles/mapbox/dark-v10">🌑 Dark Mode</option>
                </select>
            </div>

            {sMeasurements && (
                <div style={{ position: 'absolute', top: 10, right: 50, zIndex: 1, background: 'white', padding: '10px', borderRadius: '4px', boxShadow: '0 0 10px rgba(0,0,0,0.2)', fontWeight: 'bold' }}>
                    {sMeasurements}
                </div>
            )}
            <Map
                ref={mapRef}
                mapboxAccessToken={MAPBOX_TOKEN}
                initialViewState={{...oInitialView}}
                style={{ width: '100%', height: '100%' }}
                mapStyle={sMapStyle}
                onLoad={handleMapLoad}
            >
                <NavigationControl position='bottom-right' />
                {oHoverInfo && (
                    <Popup latitude={oHoverInfo.latitude} longitude={oHoverInfo.longitude} closeButton={false} closeOnClick={false} anchor="bottom" offset={15}>
                        <div style={{fontSize:'12px', padding:'2px'}}>
                            <strong>{oHoverInfo.class}</strong><br/><span style={{color:'#666'}}>By: {oHoverInfo.annotator}</span>
                        </div>
                    </Popup>
                )}
                {aoMarkers.map((marker, index) => (<Marker key={index} latitude={marker.position[0]} longitude={marker.position[1]} onClick={e => { e.originalEvent.stopPropagation(); setSelectedMarker(marker); }} />))}
            </Map>
        </div>
    );
};

export default MapboxMap;
