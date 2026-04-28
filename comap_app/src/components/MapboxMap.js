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

const doLinesIntersect = (p1, p2, p3, p4) => {
    const a = p1[0], b = p1[1], c = p2[0], d = p2[1];
    const p = p3[0], q = p3[1], r = p4[0], s = p4[1];
    const det = (c - a) * (s - q) - (r - p) * (d - b);
    if (det === 0) return false;
    const lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
    const gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
    return (0.01 < lambda && lambda < 0.99) && (0.01 < gamma && gamma < 0.99);
};

const hasSelfIntersection = (ring) => {
    if (ring.length < 5) return false;

    const n = ring.length;
    const cursor = ring[n - 2];
    const lastFixed = ring[n - 3];
    const firstFixed = ring[0];

    for (let i = 0; i < n - 4; i++) {
        if (doLinesIntersect(lastFixed, cursor, ring[i], ring[i+1])) {
            return true;
        }
    }

    for (let i = 1; i < n - 3; i++) {
        if (doLinesIntersect(cursor, firstFixed, ring[i], ring[i+1])) {
            return true;
        }
    }

    return false;
};

const MapboxMap = ({
                       aoMarkers               = [],
                       oInitialView,
                       onDrawUpdate,
                       onDrawError,
                       sActiveGeoTIFF,
                       // --- NEW: THE STYLE PAYLOAD PROP ---
                       oActiveStyle            = null,
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
                       bPreventPolygonIntersection = false,
                       sHoveredFootprint       = null,
                   }) => {

    const [oSelectedMarker, setSelectedMarker] = useState(null);
    const [sMeasurements, setMeasurements]     = useState("");
    const [sMapStyle, setMapStyle]             = useState(sInitialMapStyle);
    const [oHoverInfo, setHoverInfo]           = useState(null);

    const oMapRef           = useRef(null);
    const oDrawRef          = useRef(null);
    const oActiveLayerIdRef = useRef(null);

    const bIsIntersectingRef = useRef(false);
    const sInvalidReasonRef  = useRef("");
    const [bMapLoaded, setMapLoaded]           = useState(false);

    const aoFeaturesRef = useRef(aoFeatures);
    useEffect(() => {
        aoFeaturesRef.current = aoFeatures;
    }, [aoFeatures]);

    useEffect(() => {
        if (oDrawRef.current && sSelectedFeatureId) {
            oDrawRef.current.setFeatureProperty(sSelectedFeatureId, 'portColor', sCurrentDrawColor);
        }
    }, [sCurrentDrawColor, sSelectedFeatureId]);

    const handleMapLoad = (e) => {
        const oMap = e.target;
        oMapRef.current = oMap;
        setMapLoaded(true);

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
            oDrawRef.current = oDraw;

            oMap.on('draw.create', (ev) => handleDrawUpdate(ev, oDraw));
            oMap.on('draw.update', (ev) => handleDrawUpdate(ev, oDraw));
            oMap.on('draw.delete', () => { setMeasurements(""); if (onDrawUpdate) onDrawUpdate(oDraw.getAll()); });
            oMap.on('draw.selectionchange', (ev) => {
                if (ev.features.length > 0) { if (onFeatureSelect) onFeatureSelect(ev.features[0].id); }
                else                         { if (onFeatureSelect) onFeatureSelect(null); }
            });

            oMap.on('mousemove', (ev) => {
                const oMode = oDraw.getMode();
                if (oMode.startsWith('draw_')) { setHoverInfo(null); return; }
                const m_aoFeatures    = oMap.queryRenderedFeatures(ev.point);
                const oDrawFeature = m_aoFeatures.find(f => f.source && f.source.includes('mapbox-gl-draw'));
                if (oDrawFeature) {
                    const oFullData = oDraw.get(oDrawFeature.properties.id);
                    if (oFullData?.properties?.annotator) {
                        setHoverInfo({ latitude: ev.lngLat.lat, longitude: ev.lngLat.lng, annotator: oFullData.properties.annotator, class: oFullData.properties.className || "Shape" });
                        oMap.getCanvas().style.cursor = 'pointer';
                        return;
                    }
                }
                setHoverInfo(null);
                oMap.getCanvas().style.cursor = '';
            });

            // INTERSECTION PREVENTION CODE (Unchanged)
            if ((bPreventSelfIntersection || bPreventPolygonIntersection) && bHasPolygons) {
                setupIntersectionLayer(oMap);
                let aoDrawnVertices = [];
                const resetState = () => {
                    bIsIntersectingRef.current = false;
                    sInvalidReasonRef.current  = "";
                    aoDrawnVertices             = [];
                    clearIntersectionPreview(oMap);
                    oMap.getCanvas().style.cursor = '';
                };

                oMap.on('draw.create',     resetState);
                oMap.on('draw.modechange', resetState);

                oMap.on('mousemove', (ev) => {
                    if (!oDrawRef.current) return;
                    if (oDrawRef.current.getMode() !== 'draw_polygon') {
                        if (bIsIntersectingRef.current) resetState();
                        return;
                    }

                    const afMouseCoord = [ev.lngLat.lng, ev.lngLat.lat];
                    let bIsInvalid = false;
                    let sErrorMessage = "";

                    if (bPreventPolygonIntersection) {
                        const aoExistingPolygons = aoFeaturesRef.current.filter(f => f.geometry.type === 'Polygon');
                        if (aoExistingPolygons.length > 0) {
                            for (const oPoly of aoExistingPolygons) {
                                try {
                                    if (aoDrawnVertices.length === 0) {
                                        if (turf.booleanPointInPolygon(turf.point(afMouseCoord), oPoly)) {
                                            bIsInvalid = true; sErrorMessage = "Cannot start drawing inside an existing polygon!"; break;
                                        }
                                    } else if (aoDrawnVertices.length === 1) {
                                        const afLastPlaced = aoDrawnVertices[0];
                                        if (afLastPlaced[0] !== afMouseCoord[0] || afLastPlaced[1] !== afMouseCoord[1]) {
                                            const oTestLine = turf.lineString([afLastPlaced, afMouseCoord]);
                                            if (turf.booleanIntersects(oTestLine, oPoly)) {
                                                bIsInvalid = true; sErrorMessage = "Line crosses an existing polygon!"; break;
                                            }
                                        }
                                    } else if (aoDrawnVertices.length >= 2) {
                                        const oTestRing = [...aoDrawnVertices, afMouseCoord, aoDrawnVertices[0]];
                                        if (oTestRing.length >= 4) {
                                            const oTestPoly = turf.polygon([oTestRing]);
                                            if (turf.booleanIntersects(oTestPoly, oPoly)) {
                                                bIsInvalid = true; sErrorMessage = "Polygons cannot overlap!"; break;
                                            }
                                        }
                                    }
                                } catch (_) {}
                            }
                        }
                    }

                    if (!bIsInvalid && bPreventSelfIntersection && aoDrawnVertices.length >= 2) {
                        const oTestRing = [...aoDrawnVertices, afMouseCoord, aoDrawnVertices[0]];
                        if (oTestRing.length >= 4) {
                            if (hasSelfIntersection(oTestRing)) {
                                bIsInvalid = true; sErrorMessage = "Polygon cannot intersect itself!";
                            }
                        }
                    }

                    bIsIntersectingRef.current = bIsInvalid;
                    sInvalidReasonRef.current  = sErrorMessage;

                    if (bIsInvalid) {
                        if (aoDrawnVertices.length > 0) {
                            const afLastPlaced = aoDrawnVertices[aoDrawnVertices.length - 1];
                            oMap.getSource(INTERSECTION_SOURCE_ID).setData({
                                type: 'FeatureCollection',
                                features: [{
                                    type: 'Feature',
                                    geometry: { type: 'LineString', coordinates: [afLastPlaced, afMouseCoord] },
                                    properties: {}
                                }]
                            });
                        } else {
                            clearIntersectionPreview(oMap);
                        }
                        oMap.getCanvas().style.cursor = 'not-allowed';
                    } else {
                        clearIntersectionPreview(oMap);
                        oMap.getCanvas().style.cursor = '';
                    }
                });

                const blockClick = (ev) => {
                    if (!oDrawRef.current) return;
                    if (oDrawRef.current.getMode() !== 'draw_polygon') return;
                    if (bIsIntersectingRef.current) {
                        ev.stopPropagation();
                        ev.preventDefault();
                        if (onDrawError && ev.type === 'mousedown') {
                            onDrawError(sInvalidReasonRef.current);
                        }
                        return;
                    }
                    if (ev.type === 'mousedown') {
                        const oRect   = oMap.getCanvas().getBoundingClientRect();
                        const afLngLat = oMap.unproject([ev.clientX - oRect.left, ev.clientY - oRect.top]);
                        aoDrawnVertices.push([afLngLat.lng, afLngLat.lat]);
                    }
                };
                const oCanvas = oMap.getCanvas();
                oCanvas.addEventListener('mousedown', blockClick, true);
                oCanvas.addEventListener('pointerdown', blockClick, true);
                oCanvas.addEventListener('touchstart', blockClick, true);
                oCanvas.addEventListener('click', blockClick, true);
            }
        }
    };

    useEffect(() => {
        const map = oMapRef.current;
        // Now it won't fire into the void; it waits for bMapLoaded to be true!
        if (map && bMapLoaded && oZoomToBBox?.length === 4) {
            map.fitBounds(oZoomToBBox, { padding: 50, duration: 1500 });
        }
    }, [oZoomToBBox, bMapLoaded]);

    useEffect(() => {
        const map     = oMapRef.current;
        const layerId = oActiveLayerIdRef.current;
        if (map && layerId && map.getLayer(layerId)) map.setPaintProperty(layerId, 'raster-opacity', iImageOpacity);
    }, [iImageOpacity]);

    useEffect(() => {
        if (oDrawRef.current && sSelectedFeatureId) {
            try { oDrawRef.current.changeMode('simple_select', { featureIds: [sSelectedFeatureId] }); } catch (_) {}
        }
    }, [sSelectedFeatureId]);

    useEffect(() => {
        if (!oDrawRef.current) return;
        const oDraw = oDrawRef.current;
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

    // ═══════════════════════════════════════════════════════════════════
    // DYNAMIC TITILER URL PARSER
    // ═══════════════════════════════════════════════════════════════════
    useEffect(() => {
        const map = oMapRef.current;
        if (!map) return;

        const refreshLayer = () => {
            if (oActiveLayerIdRef.current) {
                if (map.getLayer(oActiveLayerIdRef.current))  map.removeLayer(oActiveLayerIdRef.current);
                if (map.getSource(oActiveLayerIdRef.current)) map.removeSource(oActiveLayerIdRef.current);
                oActiveLayerIdRef.current = null;
            }

            if (sActiveGeoTIFF) {
                let sParams = `encoded_path=${encodeURIComponent(sActiveGeoTIFF)}`;

                if (oActiveStyle) {
                    // --- 1. PARSE BANDS ---
                    // Example: extracts '4' from "B04 - Red"
                    const getBandIdx = (sBandStr) => {
                        const match = sBandStr.match(/B(\d+)/);
                        return match ? parseInt(match[1], 10) : 1;
                    };

                    if (oActiveStyle.renderType === 'multi') {
                        sParams += `&bidx=${getBandIdx(oActiveStyle.bands.red)}&bidx=${getBandIdx(oActiveStyle.bands.green)}&bidx=${getBandIdx(oActiveStyle.bands.blue)}`;
                    } else {
                        // Single band grayscale
                        sParams += `&bidx=${getBandIdx(oActiveStyle.bands.gray)}`;
                    }

                    // --- 2. PARSE HISTOGRAM ---
                    if (oActiveStyle.histogram === 'linear') {
                        sParams += `&rescale=0,3000`; // Standard optical stretch
                    } else if (oActiveStyle.histogram === 'saturated') {
                        // Simulate a 2% cut by pulling the bounds tighter
                        sParams += `&rescale=100,2500`;
                    }

                    // --- 3. PARSE EFFECTS (rio-color) ---
                    const aoFormulas = [];

                    if (oActiveStyle.effects.saturation !== 0) {
                        const fSat = 1 + (oActiveStyle.effects.saturation / 100);
                        aoFormulas.push(`saturation ${fSat.toFixed(2)}`);
                    }

                    if (oActiveStyle.effects.contrast !== 0) {
                        // Contrast > 0 creates an S-curve
                        const fContrast = 1 + (Math.abs(oActiveStyle.effects.contrast) / 10);
                        if (oActiveStyle.effects.contrast > 0) {
                            aoFormulas.push(`sigmoidal RGB ${fContrast.toFixed(2)} 0.5`);
                        }
                    }

                    if (oActiveStyle.effects.brightness !== 0) {
                        // Gamma < 1 is brighter
                        const fGamma = 1 - (oActiveStyle.effects.brightness / 200);
                        aoFormulas.push(`gamma RGB ${fGamma.toFixed(2)}`);
                    }

                    // Combine all rio-color operations into one string
                    if (aoFormulas.length > 0) {
                        sParams += `&color_formula=${encodeURIComponent(aoFormulas.join(', '))}`;
                    }

                } else {
                    // DEFAULT FALLBACK (Before the user applies any styles)
                    sParams += `&bidx=3&bidx=2&bidx=1&rescale=0,3000`;
                }

                const uniqueId = `geotiff-${Date.now()}`;
                const sTileUrl = `${process.env.REACT_APP_API_URL}sentinel/tiles/WebMercatorQuad/{z}/{x}/{y}.png?${sParams}`;

                try {
                    map.addSource(uniqueId, { type: 'raster', tiles: [sTileUrl], tileSize: 256 });
                    const layers = map.getStyle().layers;
                    let beforeId;
                    for (const l of layers) { if (l.id.startsWith('gl-draw'))  { beforeId = l.id; break; } }
                    if (!beforeId) { for (const l of layers) { if (l.type === 'symbol') { beforeId = l.id; break; } } }
                    map.addLayer({ id: uniqueId, type: 'raster', source: uniqueId, paint: { 'raster-opacity': iImageOpacity ,'raster-hue-rotate': oActiveStyle ? Number(oActiveStyle.effects.hue) : 0} }, beforeId);
                    oActiveLayerIdRef.current = uniqueId;
                } catch (err) { console.error(err); }
            }
        };

        refreshLayer();

        const onStyleData = () => {
            if (oActiveLayerIdRef.current && !map.getLayer(oActiveLayerIdRef.current)) refreshLayer();
            if ((bPreventSelfIntersection || bPreventPolygonIntersection) && bHasPolygons && !map.getLayer(INTERSECTION_LAYER_ID)) {
                setupIntersectionLayer(map);
            }
        };
        map.on('styledata', onStyleData);
        return () => { map.off('styledata', onStyleData); };
    }, [sActiveGeoTIFF, sMapStyle, oActiveStyle]); // <-- Added oActiveStyle to dependencies!

    // ═══════════════════════════════════════════════════════════════════
    // HOVER FOOTPRINT RENDERER
    // ═══════════════════════════════════════════════════════════════════
    useEffect(() => {
        const map = oMapRef.current;
        if (!map) return;

        const SOURCE_ID = 'hover-footprint-source';
        const FILL_ID   = 'hover-footprint-fill';
        const LINE_ID   = 'hover-footprint-line';

        const clearHover = () => {
            if (map.getLayer(FILL_ID)) map.removeLayer(FILL_ID);
            if (map.getLayer(LINE_ID)) map.removeLayer(LINE_ID);
            if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
        };

        if (sHoveredFootprint) {
            try {
                let geojsonGeom;
                if (typeof sHoveredFootprint === 'string' && sHoveredFootprint.toUpperCase().includes('POLYGON')) {
                    const coordsText = sHoveredFootprint.replace(/POLYGON\s*\(\(/i, "").replace(/\)\)/, "");
                    const coords = coordsText.split(",").map(p => {
                        const [x, y] = p.trim().split(/\s+/).map(Number);
                        return [x, y];
                    });
                    geojsonGeom = { type: 'Polygon', coordinates: [coords] };
                } else if (typeof sHoveredFootprint === 'object') {
                    geojsonGeom = sHoveredFootprint;
                }

                if (geojsonGeom) {
                    clearHover();
                    map.addSource(SOURCE_ID, { type: 'geojson', data: { type: 'Feature', geometry: geojsonGeom, properties: {} } });
                    map.addLayer({ id: FILL_ID, type: 'fill', source: SOURCE_ID, paint: { 'fill-color': '#e1aa07', 'fill-opacity': 0.15 } });
                    map.addLayer({ id: LINE_ID, type: 'line', source: SOURCE_ID, paint: { 'line-color': '#e1aa07', 'line-width': 2, 'line-dasharray': [2, 2] } });
                }
            } catch (err) {
                console.error("Failed to render hovered footprint", err);
            }
        } else {
            clearHover();
        }

        return () => clearHover();
    }, [sHoveredFootprint]);

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
                ref={oMapRef}
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
