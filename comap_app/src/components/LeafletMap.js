import React, {useEffect} from 'react';
import {LayersControl, MapContainer, Marker, Popup, TileLayer, useMap} from 'react-leaflet';
import L from 'leaflet';

// --- STYLES ---
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet-geosearch/dist/geosearch.css';

// --- IMPORTS FOR SEARCH ---
import {GeoSearchControl, OpenStreetMapProvider} from 'leaflet-geosearch';
import * as turf from '@turf/turf';

// --- ICON FIXES ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// --- SUB-COMPONENTS ---
const SearchControl = () => {
    const oMap = useMap();
    useEffect(() => {
        const provider = new OpenStreetMapProvider();
        const searchControl = new GeoSearchControl({
            provider: provider,
            style: 'button',
            position: 'topright',
            showMarker: true,
            showPopup: true,
            autoClose: true,
            searchLabel: 'Enter address...',
        });
        oMap.addControl(searchControl);
        return () => oMap.removeControl(searchControl);
    }, [oMap]);
    return null;
};

const GeomanControls = () => {
    const oMap = useMap();
    useEffect(() => {
        if (!oMap || !oMap.pm) return;
        oMap.pm.addControls({
            position: 'topleft',
            drawMarker: false,
            drawCircleMarker: false,
            drawPolyline: true,
            drawRectangle: true,
            drawPolygon: true,
            drawCircle: true,
            editMode: true,
            dragMode: true,
            removalMode: true,
        });
        oMap.pm.setGlobalOptions({pinning: true, snappable: true});

        oMap.on('pm:create', (e) => {
            const {layer, shape} = e;
            const oLayer = layer;
            const oShape = shape;

            if (oShape === 'Polyline') {
                const dDistance = calculateDistance(oLayer);
                oLayer.bindPopup(`Distance: ${dDistance.toFixed(2)} meters`).openPopup();
            } else {
                const sAreaLabel = calculateArea(oLayer);
                oLayer.bindPopup(`Area: ${sAreaLabel}`).openPopup();
            }

            oLayer.on('pm:edit', (editEvent) => updateMeasurement(editEvent.target, oShape));
            oLayer.on('pm:remove', () => oLayer.closePopup());
        });

        return () => {
            if (oMap.pm) oMap.pm.removeControls();
        };
    }, [oMap]);

    // Helpers
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
        if (area > 1000000) return (area / 1000000).toFixed(2) + " km²";
        return area.toFixed(2) + " m²";
    };

    const updateMeasurement = (oLayer, oShape) => {
        if (oShape === 'Polyline') {
            const d = calculateDistance(oLayer);
            oLayer.setPopupContent(`Distance: ${d.toFixed(2)} meters`);
        } else {
            const sArea = calculateArea(oLayer);
            oLayer.setPopupContent(`Area: ${sArea}`);
        }
    };
    return null;
};

// --- MAIN COMPONENT ---
const LeafletMap = ({markers, initialView, activeGeoTIFF}) => {
    const center = [initialView.latitude, initialView.longitude];

    // 1. FIX: Removed 'TCI.tif' from here. Now it is a clean Base URL.
    const TILE_API_BASE = "http://127.0.0.1:8000/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=";

    return (
        <MapContainer
            center={center}
            zoom={initialView.zoom}
            style={{height: '100%', width: '100%', outline: 'none'}}
        >
            <LayersControl position="topright">

                {/* --- BASE LAYERS --- */}
                <LayersControl.BaseLayer checked name="OpenStreetMap">
                    <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                </LayersControl.BaseLayer>

                <LayersControl.BaseLayer name="ESRI Satellite">
                    <TileLayer
                        attribution='Tiles &copy; Esri'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                </LayersControl.BaseLayer>

                <LayersControl.BaseLayer name="Dark Mode">
                    <TileLayer
                        attribution='Tiles &copy; Esri'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                    />
                </LayersControl.BaseLayer>

                {/* --- DYNAMIC LAYER (The one you click in the list) --- */}
                {activeGeoTIFF && (
                    <LayersControl.Overlay checked name="Selected Project Image">
                        <TileLayer
                            // Key forces refresh when selection changes
                            key={activeGeoTIFF}
                            // We combine the Base URL + The selected Filename
                            url={`${TILE_API_BASE}${activeGeoTIFF}`}
                            opacity={1.0}
                        />
                    </LayersControl.Overlay>
                )}

                {/*/!* --- STATIC TEST LAYER (TCI.tif) --- *!/*/}
                {/*/!* Kept separate for testing purposes as requested *!/*/}
                {/*<LayersControl.Overlay checked name="Test Layer (TCI.tif)">*/}
                {/*    <TileLayer*/}
                {/*        url={`${TILE_API_BASE}TCI.tif`}*/}
                {/*        opacity={0.8}*/}
                {/*    />*/}
                {/*</LayersControl.Overlay>*/}

            </LayersControl>

            <SearchControl/>
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
