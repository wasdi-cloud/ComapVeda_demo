import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';

// --- STYLES ---
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
// NEW: Import Geosearch CSS
import 'leaflet-geosearch/dist/geosearch.css';

// --- IMPORTS FOR SEARCH ---
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';

import * as turf from '@turf/turf';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});// Example: New York City

// Fix icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const BASE_LAYERS = {
    osm: {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: '&copy; OpenStreetMap contributors'
    },
    esri: {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    },
    dark: {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
    }
};
const SearchControl = () => {
    const oMap = useMap();

    useEffect(() => {
        const provider = new OpenStreetMapProvider();

        const searchControl = new GeoSearchControl({
            provider: provider,
            style: 'button',
            position:'topright',
            showMarker: true, // Show a marker at the result
            showPopup: true, // Show a popup at the result
            autoClose: true, // Close list after selection
            retainZoomLevel: false, // Zoom to the result
            animateZoom: true,
            keepResult: true, // Keep the marker on the oMap
            searchLabel: 'Enter address...',
        });

        oMap.addControl(searchControl);

        return () => oMap.removeControl(searchControl);
    }, [oMap]);

    return null;
};

// A sub-component to initialize Geoman controls
const GeomanControls = () => {
    const oMap = useMap();

    useEffect(() => {
        // 1. Check if oMap exists AND if Geoman (pm) is attached to it
        if (!oMap || !oMap.pm) {
            console.log("Geoman not ready yet...");
            return;
        }

        // 1. Add Geoman controls to the oMap
        oMap.pm.addControls({
            position: 'topleft',
            drawMarker: false, // We already have markers
            drawCircleMarker: false,
            drawPolyline: true,
            drawRectangle: true,
            drawPolygon: true,
            drawCircle: true,
            editMode: true,
            dragMode: true,
            removalMode: true,
        });
        // 3. Optional: Set global options (like path styling)
        oMap.pm.setGlobalOptions({
            pinning: true,
            snappable: true
        });
        // 2. Listen for when a shape is created
        oMap.on('pm:create', (e) => {
            // FIX: Geoman uses 'layer' and 'shape', not 'oLayer' and 'oShape'
            const {layer, shape} = e;

            // You can rename them here to match your naming convention if you prefer:
            const oLayer = layer;
            const oShape = shape;

            console.log(`Created a ${oShape}`);

            // Logic for measurement
            if (oShape === 'Polyline') {
                const dDistance = calculateDistance(oLayer);
                oLayer.bindPopup(`Distance: ${dDistance.toFixed(2)} meters`).openPopup();
            } else {
                const sAreaLabel = calculateArea(oLayer);
                // We don't use .toFixed here because it's already a formatted string
                oLayer.bindPopup(`Area: ${sAreaLabel}`).openPopup();
            }

            // Listen for edits (moving edges)
            oLayer.on('pm:edit', (editEvent) => {
                updateMeasurement(editEvent.target, oShape);
            });

            // Add this to handle the "Delete" properly as we discussed
            oLayer.on('pm:remove', () => {
                oLayer.closePopup();
            });
        });

        // Cleanup function to prevent duplicate toolbars on hot-reload
        return () => {
            if (oMap.pm) {
                oMap.pm.removeControls();
            }
        };
    }, [oMap]);

    // Helper to calculate distance for lines
    const calculateDistance = (oLayer) => {
        const aiLatlngs = oLayer.getLatLngs();
        let iTotal = 0;
        for (let i = 0; i < aiLatlngs.length - 1; i++) {
            iTotal += aiLatlngs[i].distanceTo(aiLatlngs[i + 1]);
        }
        return iTotal;
    };

    const calculateArea = (oLayer) => {
        let area;
        if (oLayer instanceof L.Circle) {
            area = Math.PI * Math.pow(oLayer.getRadius(), 2);
        } else {
            const oGeojson = oLayer.toGeoJSON();
            area = turf.area(oGeojson);
        }

        // Return a formatted STRING directly
        if (area > 1000000) {
            return (area / 1000000).toFixed(2) + " km²";
        }
        return area.toFixed(2) + " m²";
    };

    const updateMeasurement = (oLayer, oShape) => {
        if (oShape === 'Polyline') {
            const d = calculateDistance(oLayer);
            oLayer.setPopupContent(`Distance: ${d.toFixed(2)} meters`);
        } else {
            // sArea is already a string like "10.50 m²"
            const sArea = calculateArea(oLayer);
            oLayer.setPopupContent(`Area: ${sArea}`);
        }
    };

    return null;
};

const LeafletMap = ({markers, initialView}) => {
    const center = [initialView.latitude, initialView.longitude];

    return (
        <MapContainer
            center={center}
            zoom={initialView.zoom}
            style={{height: '100%', width: '100%', outline: 'none'}}
        >
            {/* 1. THE LAYERS CONTROL (The "Button") */}
            <LayersControl position="topright">

                {/* Base Layer 1: OpenStreetMap (Default) */}
                <LayersControl.BaseLayer checked name="OpenStreetMap">
                    <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                </LayersControl.BaseLayer>

                {/* Base Layer 2: ESRI Satellite */}
                <LayersControl.BaseLayer name="ESRI Satellite">
                    <TileLayer
                        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                </LayersControl.BaseLayer>

                {/* Base Layer 3: Dark Mode */}
                <LayersControl.BaseLayer name="Dark Mode">
                    <TileLayer
                        attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                    />
                </LayersControl.BaseLayer>

                {/*/!* Optional: You can also make your GeoTIFF toggle-able!*/}
                {/*    Use LayersControl.Overlay for layers that sit ON TOP.*/}
                {/**!/*/}
                {/*<LayersControl.Overlay checked name="My GeoTIFF Overlay">*/}
                {/*    <TileLayer*/}
                {/*        url="http://127.0.0.1:8000/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=TCI.tif"*/}
                {/*        opacity={0.7}*/}
                {/*    />*/}
                {/*</LayersControl.Overlay>*/}

            </LayersControl>

            {/* If you want the GeoTIFF to NEVER be hidden, remove the
                LayersControl.Overlay wrapper above and just place the TileLayer here directly. */}

            <SearchControl />

            <GeomanControls/>

            {markers.map((marker, index) => (
                <Marker key={index} position={marker.position}>
                    <Popup>{marker.name}</Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

export default LeafletMap;
