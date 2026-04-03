import React, { useState, useEffect, useRef } from 'react';
import Map, { NavigationControl, Marker, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import * as turf from '@turf/turf';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

const INTERSECTION_SOURCE_ID = 'self-intersection-preview';
const INTERSECTION_LAYER_ID  = 'self-intersection-line';

const setupIntersectionLayer = (map) => {
    if (!map.getSource(INTERSECTION_SOURCE_ID)) {
        map.addSource(INTERSECTION_SOURCE_ID, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });
    }
    if (!map.getLayer(INTERSECTION_LAYER_ID)) {
        map.addLayer({
            id:     INTERSECTION_LAYER_ID,
            type:   'line',
            source: INTERSECTION_SOURCE_ID,
            paint:  { 'line-color': '#ef4444', 'line-width': 3, 'line-opacity': 0.9 }
        });
    }
};

const clearIntersectionPreview = (map) => {
    try {
        if (map.getSource(INTERSECTION_SOURCE_ID)) {
            map.getSource(INTERSECTION_SOURCE_ID).setData({ type: 'FeatureCollection', features: [] });
        }
    } catch (_) {}
};

// --- CUSTOM DRAW STYLES ---
const CUSTOM_DRAW_STYLES = [
    {
        'id': 'gl-draw-line-inactive', 'type': 'line',
        'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
        'layout': { 'line-cap': 'round', 'line-join': 'round' },
        'paint':  { 'line-color': ['coalesce', ['get', 'user_portColor'], '#3b82f6'], 'line-width': 3 }
    },
    {
        'id': 'gl-draw-line-active', 'type': 'line',
        'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'LineString']],
        'layout': { 'line-cap': 'round', 'line-join': 'round' },
        'paint':  { 'line-color': ['coalesce', ['get', 'user_portColor'], '#fbb03b'], 'line-dasharray': [0.2, 2], 'line-width': 4 }
    },
    {
        'id': 'gl-draw-polygon-fill-inactive', 'type': 'fill',
        'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
        'paint':  { 'fill-color': ['coalesce', ['get', 'user_portColor'], '#3b82f6'], 'fill-outline-color': ['coalesce', ['get', 'user_portColor'], '#3b82f6'], 'fill-opacity': 0.4 }
    },
    {
        'id': 'gl-draw-polygon-fill-active', 'type': 'fill',
        'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
        'paint':  { 'fill-color': ['coalesce', ['get', 'user_portColor'], '#fbb03b'], 'fill-outline-color': '#fbb03b', 'fill-opacity': 0.4 }
    },
    {
        'id': 'gl-draw-polygon-stroke-inactive', 'type': 'line',
        'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
        'layout': { 'line-cap': 'round', 'line-join': 'round' },
        'paint':  { 'line-color': ['coalesce', ['get', 'user_portColor'], '#3b82f6'], 'line-width': 3 }
    },
    {
        'id': 'gl-draw-polygon-stroke-active', 'type': 'line',
        'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
        'layout': { 'line-cap': 'round', 'line-join': 'round' },
        'paint':  { 'line-color': '#fbb03b', 'line-dasharray': [0.2, 2], 'line-width': 3 }
    },
    {
        'id': 'gl-draw-polygon-and-line-vertex-stroke-inactive', 'type': 'circle',
        'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
        'paint':  { 'circle-radius': 6, 'circle-color': '#fff' }
    },
    {
        'id': 'gl-draw-polygon-and-line-vertex-inactive', 'type': 'circle',
        'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
        'paint':  { 'circle-radius': 4, 'circle-color': '#fbb03b' }
    },
    {
        'id': 'gl-draw-point-point-stroke-active', 'type': 'circle',
        'filter': ['all', ['==', '$type', 'Point'], ['==', 'active', 'true'], ['!=', 'meta', 'midpoint']],
        'paint':  { 'circle-radius': 8, 'circle-color': '#fff' }
    },
    {
        'id': 'gl-draw-point-active', 'type': 'circle',
        'filter': ['all', ['==', '$type', 'Point'], ['!=', 'meta', 'midpoint'], ['==', 'active', 'true']],
        'paint':  { 'circle-radius': 6, 'circle-color': '#fbb03b' }
    },
    {
        'id': 'gl-draw-polygon-midpoint', 'type': 'circle',
        'filter': ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
        'paint':  { 'circle-radius': 4, 'circle-color': '#fbb03b', 'circle-opacity': 0.8 }
    }
];

const MapboxMap = ({
                       aoMarkers               = [],
                       oInitialView,
                       onDrawUpdate,
                       onDrawError, // Make sure you pass this prop from EditProject!
                       sActiveGeoTIFF,
                       bEnableGeocoder         = false,
                       bEnableDraw             = true,
                       sInitialMapStyle        = "mapbox://styles/mapbox/satellite-v9",
                       sSelectedFeatureId,
                       onFeatureSelect,
                       aoFeatures              = [],
                       iImageOpacity           = 1,
                       oZoomToBBox             = null,
                       sCurrentDrawColor       = "#3b82f6",
                       bHasPolygons            = true,
                       bHasLines               = true,
                       bPreventSelfIntersection = false,
                       sHoveredFootprint       = null // <-- NEW PROP FOR EO HOVER
                   }) => {

    const [oSelectedMarker, setSelectedMarker] = useState(null);
    const [sMeasurements, setMeasurements]     = useState("");
    const [sMapStyle, setMapStyle]             = useState(sInitialMapStyle);
    const [oHoverInfo, setHoverInfo]           = useState(null);

    const mapRef           = useRef(null);
    const drawRef          = useRef(null);
    const activeLayerIdRef = useRef(null);

    const EO_HOVER_SOURCE_ID = 'eo-hover-source';
    const EO_HOVER_FILL_LAYER = 'eo-hover-fill';
    const EO_HOVER_LINE_LAYER = 'eo-hover-line';

    // Readable synchronously inside the capture-phase click handler — must be a ref, not state.
    const isIntersectingRef = useRef(false);

    useEffect(() => {
        if (drawRef.current && sSelectedFeatureId) {
            drawRef.current.setFeatureProperty(sSelectedFeatureId, 'portColor', sCurrentDrawColor);
        }
    }, [sCurrentDrawColor, sSelectedFeatureId]);

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
                controls: { polygon: bHasPolygons, line_string: bHasLines, trash: true },
                defaultMode: 'simple_select',
                userProperties: true,
                styles: CUSTOM_DRAW_STYLES
            });
            oMap.addControl(oDraw, 'top-left');
            drawRef.current = oDraw;

            oMap.on('draw.create', (ev) => handleDrawUpdate(ev, oDraw));
            oMap.on('draw.update', (ev) => handleDrawUpdate(ev, oDraw));
            oMap.on('draw.delete', () => { setMeasurements(""); if (onDrawUpdate) onDrawUpdate(oDraw.getAll()); });
            oMap.on('draw.selectionchange', (ev) => {
                if (ev.features.length > 0) { if (onFeatureSelect) onFeatureSelect(ev.features[0].id); }
                else                         { if (onFeatureSelect) onFeatureSelect(null); }
            });

            // Hover tooltip handler
            oMap.on('mousemove', (ev) => {
                const mode = oDraw.getMode();
                if (mode.startsWith('draw_')) { setHoverInfo(null); return; }
                const features    = oMap.queryRenderedFeatures(ev.point);
                const drawFeature = features.find(f => f.source && f.source.includes('mapbox-gl-draw'));
                if (drawFeature) {
                    const fullData = oDraw.get(drawFeature.properties.id);
                    if (fullData?.properties?.annotator) {
                        setHoverInfo({ latitude: ev.lngLat.lat, longitude: ev.lngLat.lng, annotator: fullData.properties.annotator, class: fullData.properties.className || "Shape" });
                        oMap.getCanvas().style.cursor = 'pointer';
                        return;
                    }
                }
                setHoverInfo(null);
                oMap.getCanvas().style.cursor = '';
            });

            // ═══════════════════════════════════════════════════════════════════
            // SELF-INTERSECTION PREVENTION
            // ═══════════════════════════════════════════════════════════════════
            if (bPreventSelfIntersection && bHasPolygons) {

                setupIntersectionLayer(oMap);

                let drawnVertices = [];

                const resetState = () => {
                    isIntersectingRef.current = false;
                    drawnVertices             = [];
                    clearIntersectionPreview(oMap);
                    oMap.getCanvas().style.cursor = '';
                };

                // Drawing finished (polygon created) or tool changed → full reset
                oMap.on('draw.create',     resetState);
                oMap.on('draw.modechange', resetState);

                // Per-frame intersection check while the user is actively drawing
                oMap.on('mousemove', (ev) => {
                    if (!drawRef.current) return;

                    if (drawRef.current.getMode() !== 'draw_polygon') {
                        if (isIntersectingRef.current) resetState();
                        return;
                    }

                    if (drawnVertices.length < 2) {
                        isIntersectingRef.current = false;
                        clearIntersectionPreview(oMap);
                        return;
                    }

                    const mouseCoord = [ev.lngLat.lng, ev.lngLat.lat];
                    const testRing = [...drawnVertices, mouseCoord, drawnVertices[0]];

                    if (testRing.length < 4) {
                        isIntersectingRef.current = false;
                        clearIntersectionPreview(oMap);
                        return;
                    }

                    try {
                        const kinks           = turf.kinks(turf.polygon([testRing]));
                        const hasIntersection = kinks.features.length > 0;
                        isIntersectingRef.current = hasIntersection;

                        if (hasIntersection) {
                            const lastPlaced = drawnVertices[drawnVertices.length - 1];
                            oMap.getSource(INTERSECTION_SOURCE_ID).setData({
                                type: 'FeatureCollection',
                                features: [{
                                    type: 'Feature',
                                    geometry: { type: 'LineString', coordinates: [lastPlaced, mouseCoord] },
                                    properties: {}
                                }]
                            });
                            oMap.getCanvas().style.cursor = 'not-allowed';
                        } else {
                            clearIntersectionPreview(oMap);
                            oMap.getCanvas().style.cursor = '';
                        }
                    } catch (_) {
                        isIntersectingRef.current = false;
                        clearIntersectionPreview(oMap);
                    }
                });

                // --- THIS IS THE FIX ---
                // We must catch 'mousedown', 'pointerdown', and 'touchstart' because Mapbox Draw
                // uses those to place points, NOT the 'click' event!
                const blockClick = (ev) => {
                    if (!drawRef.current) return;
                    if (drawRef.current.getMode() !== 'draw_polygon') return;

                    if (isIntersectingRef.current) {
                        ev.stopPropagation();   // ← Blocks Mapbox Draw
                        ev.preventDefault();    // ← Blocks browser defaults

                        // Send a notification if we have an error handler mapped
                        if (onDrawError && ev.type === 'mousedown') {
                            onDrawError("Polygon cannot intersect itself!");
                        }
                        return;
                    }

                    // Safe click — record where this vertex lands
                    // We only push on mousedown to avoid duplicate points from pointer/touch events
                    if (ev.type === 'mousedown') {
                        const rect   = oMap.getCanvas().getBoundingClientRect();
                        const lngLat = oMap.unproject([ev.clientX - rect.left, ev.clientY - rect.top]);
                        drawnVertices.push([lngLat.lng, lngLat.lat]);
                    }
                };

                const canvas = oMap.getCanvas();
                canvas.addEventListener('mousedown', blockClick, true);
                canvas.addEventListener('pointerdown', blockClick, true);
                canvas.addEventListener('touchstart', blockClick, true);
                canvas.addEventListener('click', blockClick, true); // Catch stray clicks too
            }
            // ═══════════════════════════════════════════════════════════════════
        }
    };

    useEffect(() => {
        const map = mapRef.current;
        if (map && oZoomToBBox?.length === 4) map.fitBounds(oZoomToBBox, { padding: 50, duration: 1500 });
    }, [oZoomToBBox]);
// ═══════════════════════════════════════════════════════════════════
    // --- NEW: EO IMAGE HOVER PREVIEW ---
    // ═══════════════════════════════════════════════════════════════════
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;

        // Make sure the source exists before we try to update it
        if (!map.getSource(EO_HOVER_SOURCE_ID)) {
            map.addSource(EO_HOVER_SOURCE_ID, {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });
            map.addLayer({
                id: EO_HOVER_FILL_LAYER,
                type: 'fill',
                source: EO_HOVER_SOURCE_ID,
                paint: { 'fill-color': '#fde047', 'fill-opacity': 0.3 }
            });
            map.addLayer({
                id: EO_HOVER_LINE_LAYER,
                type: 'line',
                source: EO_HOVER_SOURCE_ID,
                paint: { 'line-color': '#eab308', 'line-width': 2, 'line-dasharray': [2, 2] }
            });
        }

        if (!sHoveredFootprint) {
            // Clear the preview if nothing is hovered
            map.getSource(EO_HOVER_SOURCE_ID).setData({ type: 'FeatureCollection', features: [] });
            return;
        }

        try {
            // Your API returns a WKT string like "POLYGON ((...))"
            // We need to parse it into an array of coordinates for GeoJSON
            const coordsText = sHoveredFootprint.replace(/POLYGON\s*\(\(/i, "").replace(/\)\)/, "");
            const pairs = coordsText.split(",");

            const coordinates = pairs.map(pair => {
                const [lng, lat] = pair.trim().split(/\s+/).map(Number);
                return [lng, lat];
            });

            const geojsonFeature = {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [coordinates]
                    }
                }]
            };

            map.getSource(EO_HOVER_SOURCE_ID).setData(geojsonFeature);

            // Optional: You can auto-pan the map to the hovered image footprint
            // const bbox = turf.bbox(geojsonFeature);
            // map.fitBounds(bbox, { padding: 50, duration: 800 });

        } catch (e) {
            console.error("Failed to parse footprint for hover:", e);
        }
    }, [sHoveredFootprint]);
    // ═══════════════════════════════════════════════════════════════════
    useEffect(() => {
        const map     = mapRef.current;
        const layerId = activeLayerIdRef.current;
        if (map && layerId && map.getLayer(layerId)) map.setPaintProperty(layerId, 'raster-opacity', iImageOpacity);
    }, [iImageOpacity]);

    useEffect(() => {
        if (drawRef.current && sSelectedFeatureId) {
            try { drawRef.current.changeMode('simple_select', { featureIds: [sSelectedFeatureId] }); } catch (_) {}
        }
    }, [sSelectedFeatureId]);

    useEffect(() => {
        if (!drawRef.current) return;
        const oDraw = drawRef.current;
        if (oDraw.getMode().startsWith('draw_')) return;

        const currentIds = oDraw.getAll().features.map(f => f.id).sort().join(',');
        const newIds     = aoFeatures.map(f => f.id).sort().join(',');

        if (currentIds !== newIds) {
            oDraw.deleteAll();
            if (aoFeatures.length > 0) oDraw.add({ type: 'FeatureCollection', features: aoFeatures });
        } else {
            aoFeatures.forEach(feature => {
                const current = oDraw.get(feature.id);
                if (current) {
                    if (feature.properties.portColor) oDraw.setFeatureProperty(feature.id, 'portColor', feature.properties.portColor);
                    oDraw.setFeatureProperty(feature.id, 'annotator', feature.properties.annotator);
                    oDraw.setFeatureProperty(feature.id, 'className', feature.properties.className);
                }
            });
        }
    }, [aoFeatures]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const refreshLayer = () => {
            if (activeLayerIdRef.current) {
                if (map.getLayer(activeLayerIdRef.current))  map.removeLayer(activeLayerIdRef.current);
                if (map.getSource(activeLayerIdRef.current)) map.removeSource(activeLayerIdRef.current);
                activeLayerIdRef.current = null;
            }
            if (sActiveGeoTIFF) {
                const sAssets  = "assets=B04&assets=B03&assets=B02";
                const sParams  = `dataset_id=${sActiveGeoTIFF}&${sAssets}&rescale=0,3000`;
                const uniqueId = `geotiff-${Date.now()}`;
                const sTileUrl = `${process.env.REACT_APP_API_URL}sentinel/tiles/WebMercatorQuad/{z}/{x}/{y}.png?${sParams}`;
                try {
                    map.addSource(uniqueId, { type: 'raster', tiles: [sTileUrl], tileSize: 256 });
                    const layers = map.getStyle().layers;
                    let beforeId;
                    for (const l of layers) { if (l.id.startsWith('gl-draw'))  { beforeId = l.id; break; } }
                    if (!beforeId) { for (const l of layers) { if (l.type === 'symbol') { beforeId = l.id; break; } } }
                    map.addLayer({ id: uniqueId, type: 'raster', source: uniqueId, paint: { 'raster-opacity': iImageOpacity } }, beforeId);
                    activeLayerIdRef.current = uniqueId;
                } catch (err) { console.error(err); }
            }
        };

        refreshLayer();

        const onStyleData = () => {
            if (activeLayerIdRef.current && !map.getLayer(activeLayerIdRef.current)) refreshLayer();
            // Re-add intersection layer after a basemap style swap wipes all custom layers
            if (bPreventSelfIntersection && bHasPolygons && !map.getLayer(INTERSECTION_LAYER_ID)) {
                setupIntersectionLayer(map);
            }
        };
        map.on('styledata', onStyleData);
        return () => { map.off('styledata', onStyleData); };
    }, [sActiveGeoTIFF, sMapStyle]);

    const handleDrawUpdate = (e, drawInstance) => {
        if (onDrawUpdate && drawInstance) onDrawUpdate(drawInstance.getAll());
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div style={{ position: 'absolute', bottom: 30, left: 10, zIndex: 10 }}>
                <select onChange={(e) => setMapStyle(e.target.value)} value={sMapStyle}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}>
                    <option value="mapbox://styles/mapbox/satellite-v9">🛰️ Satellite</option>
                    <option value="mapbox://styles/mapbox/streets-v11">🗺️ Streets</option>
                    <option value="mapbox://styles/mapbox/dark-v10">🌑 Dark Mode</option>
                </select>
            </div>

            {sMeasurements && (
                <div style={{ position: 'absolute', top: 10, right: 50, zIndex: 1, background: 'white',
                    padding: '10px', borderRadius: '4px', boxShadow: '0 0 10px rgba(0,0,0,0.2)', fontWeight: 'bold' }}>
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
                    <Popup latitude={oHoverInfo.latitude} longitude={oHoverInfo.longitude}
                           closeButton={false} closeOnClick={false} anchor="bottom" offset={15}>
                        <div style={{ fontSize: '12px', padding: '2px' }}>
                            <strong>{oHoverInfo.class}</strong><br/>
                            <span style={{ color: '#666' }}>By: {oHoverInfo.annotator}</span>
                        </div>
                    </Popup>
                )}
                {aoMarkers.map((marker, index) => (
                    <Marker key={index} latitude={marker.position[0]} longitude={marker.position[1]}
                            onClick={ev => { ev.originalEvent.stopPropagation(); setSelectedMarker(marker); }} />
                ))}
            </Map>
        </div>
    );
};

export default MapboxMap;
