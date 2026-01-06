import React, {useEffect} from 'react';
import {MapContainer, TileLayer, Marker, Popup, useMap} from 'react-leaflet';
// You must also include the Leaflet CSS file in your project, e.g., in App.css:
// @import '~leaflet/dist/leaflet.css';
// Import Geoman



import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
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
            const { layer, shape } = e;

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

const LeafletMap = ({ markers, initialView }) => {
    const center = [initialView.latitude, initialView.longitude];

    return (
        <MapContainer
            center={center}
            zoom={initialView.zoom}
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            <TileLayer
                url="http://127.0.0.1:8000/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=TCI.tif"
                opacity={0.7}
            />

            {/* NEW: Geoman Drawing Tools */}
            <GeomanControls />

            {markers.map((marker, index) => (
                <Marker key={index} position={marker.position}>
                    <Popup>{marker.name}</Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

export default LeafletMap;
