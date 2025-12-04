import React from 'react';
import LeafletMap from './components/LeafletMap';
import MapboxMap from './components/MapboxMap';
// import 'mapbox-gl/dist/mapbox-gl.css';
import 'leaflet/dist/leaflet.css';
import mapData from './data/mapData.json'; // Import your local data

function App() {
    const markerData = mapData.map(item => ({
        // Destructure and rename 'coords' to 'position' for clarity in map libraries
        position: item.coords,
        popupContent: `<h3>${item.name}</h3><p>${item.description}</p>`
    }));

    return (
        <div className="App">
            <h1>Dual Map Project</h1>

            <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1, height: '500px' }}>
                    <h2>Leaflet Map (React-Leaflet)</h2>
                    <LeafletMap markers={markerData} />
                </div>

                <div style={{ flex: 1, height: '500px' }}>
                    <h2>Mapbox Map (React-Mapbox-GL)</h2>
                    <MapboxMap markers={markerData} />
                </div>
            </div>
        </div>
    );
}

export default App;
