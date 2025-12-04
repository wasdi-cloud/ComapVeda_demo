import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
// You must also include the Leaflet CSS file in your project, e.g., in App.css:
// @import '~leaflet/dist/leaflet.css';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const INITIAL_VIEW = [40.7128, -74.0060]; // Example: New York City

const LeafletMap = ({ markers }) => {
    return (
        //
        <MapContainer
            center={INITIAL_VIEW}
            zoom={3}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {markers.map((marker, index) => (
                <Marker key={index} position={marker.position}>
                    <Popup>
                        {/* Note: In React-Leaflet, you can safely use dangerouslySetInnerHTML
            for simple HTML strings coming from your controlled data */}
                        <div dangerouslySetInnerHTML={{ __html: marker.popupContent }} />
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

export default LeafletMap;
