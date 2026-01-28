import React, { useState, useEffect } from 'react';
// We need turf for area calculations in the table
import * as turf from '@turf/turf';
import AppButton from "../components/app-button";
import MapboxMap from "../components/MapboxMap";

const MOCK_COLLABS = [
    { id: 'all', name: 'All Annotators' },
    { id: 'jihed', name: 'Jihed' },
    { id: 'sarah', name: 'Sarah' },
    { id: 'mike', name: 'Mike' }
];

const EditProject = () => {
    // --- 1. DATA STATE ---
    const sCurrentUser = "Jihed"; // Simulate logged-in user

    const [aoImages] = useState([
        { id: 1, name: "Sentinel-2 - 2023-10-01", date: "2023-10-01", annotator: "Jihed", filename: "s2.tif" },
        { id: 2, name: "Landsat-8 - 2023-09-15", date: "2023-09-15", annotator: "Jihed", filename: "TCI.tif" },
        { id: 3, name: "Sentinel-2 - 2023-08-20", date: "2023-08-20", annotator: "Jihed", filename: "TCI.tif" },
    ]);

    // This state holds the "Table Data" (The drawn features)
    const [aoFeatures, setAoFeatures] = useState([]);

    // --- 2. UI STATE ---
    const [iSelectedImageId, setISelectedImageId] = useState(null);
    const [iLabelOpacity, setILabelOpacity] = useState(70);
    const [sStyleBy, setStyleBy] = useState('label');
    const [sFilterCollab, setFilterCollab] = useState('all');
    const [bShowValidatedOnly, setShowValidatedOnly] = useState(false);
    const [sSelectedFeatureId, setSelectedFeatureId] = useState(null);

    const oSelectedImage = aoImages.find(img => img.id === iSelectedImageId);

    // --- 3. HANDLERS ---

    // This function receives the raw GeoJSON FeatureCollection from MapboxMap
    const handleDrawUpdate = (featureCollection) => {
        if (!featureCollection) return;

        const enrichedFeatures = featureCollection.features.map(feature => {
            if (!feature.properties.annotator) {
                // 1. Randomize Annotator (for Demo purposes)
                // 70% chance it's Jihed, 30% chance it's someone else
                let assignedUser = sCurrentUser;
                if (Math.random() > 0.7) {
                    const randomCollab = MOCK_COLLABS[Math.floor(Math.random() * MOCK_COLLABS.length)];
                    if (randomCollab.id !== 'all') assignedUser = randomCollab.name;
                }
                // 2. Calculate Stats
                let sMeasurement = "0";
                if (feature.geometry.type === 'Polygon') {
                    sMeasurement = (turf.area(feature) / 1000000).toFixed(3) + " km²";
                } else if (feature.geometry.type === 'LineString') {
                    sMeasurement = turf.length(feature, {units: 'kilometers'}).toFixed(3) + " km";
                }

                feature.properties = {
                    ...feature.properties,
                    id: feature.id,
                    className: "Road",
                    annotator: assignedUser, // Use the randomized user
                    status: "Pending",
                    measurement: sMeasurement,
                    timestamp: new Date().toISOString()
                };
            }
            return feature;
        });

        setAoFeatures(enrichedFeatures);
    };

    const handleDeleteFeature = (id) => {
        if(window.confirm("Are you sure you want to delete this label?")) {
            // In a real app, you would pass this delete action down to the MapboxMap
            // via a ref or prop to remove it from the visual map too.
            setAoFeatures(prev => prev.filter(f => f.id !== id));
        }
    };

    // --- 4. FILTERING LOGIC ---
    const filteredLabels = aoFeatures.filter(feature => {
        const props = feature.properties || {};

        // Filter 1: By Collaborator
        if (sFilterCollab !== 'all' && props.annotator.toLowerCase() !== sFilterCollab) {
            return false;
        }

        // Filter 2: Validated Only
        if (bShowValidatedOnly && props.status !== 'Validated') {
            return false;
        }

        return true;
    });

    const renderThumbnail = (sName) => {
        return (
            <div style={{
                width: '60px', height: '60px', borderRadius: '6px',
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                color: 'white', border: '1px solid #ccc', flexShrink: 0
            }}>
                <span style={{ fontSize: '8px', textTransform: 'uppercase', fontWeight: 'bold' }}>TIFF</span>
            </div>
        );
    };

    return (
        <div style={{
            position: 'fixed', top: 0, bottom: 0, left: 0, right: 0,
            display: 'flex', overflow: 'hidden', fontFamily: 'sans-serif', background: '#fff'
        }}>

            {/* --- SIDEBAR --- */}
            <div style={{
                width: '300px', height: '100%', borderRight: '1px solid #ccc',
                display: 'flex', flexDirection: 'column', background: '#f9f9f9', flexShrink: 0
            }}>
                <div style={{ padding: '15px', borderBottom: '1px solid #ddd', background: 'white' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Images ({aoImages.length})</h3>
                    <AppButton sVariant="primary" oStyle={{ width: '100%', fontSize: '12px' }}>+ Add Image</AppButton>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                    {aoImages.map(img => {
                        const bIsSelected = iSelectedImageId === img.id;
                        return (
                            <div
                                key={img.id}
                                onClick={() => setISelectedImageId(img.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', padding: '10px', marginBottom: '8px',
                                    background: bIsSelected ? '#e6f7ff' : '#fff',
                                    border: bIsSelected ? '1px solid #1890ff' : '1px solid #ddd',
                                    borderRadius: '6px', cursor: 'pointer', transition: '0.2s',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                            >
                                {renderThumbnail(img.name)}
                                <div style={{ marginLeft: '12px', overflow: 'hidden' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.name}</div>
                                    <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{img.date}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* HEADER */}
                <div style={{
                    padding: '12px 20px', borderBottom: '1px solid #ddd', background: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', color: '#2c3e50' }}>High-Res Flood Analysis</h2>
                        <span style={{ fontSize: '12px', color: '#999' }}>Owner: Jihed_123</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <AppButton sVariant="outline" oStyle={{ fontSize: '13px', padding: '6px 12px' }}>⚙️ Properties</AppButton>
                        <AppButton sVariant="outline" oStyle={{ fontSize: '13px', padding: '6px 12px' }}>👥 Collaborators</AppButton>
                        <AppButton sVariant="primary" oStyle={{ fontSize: '13px', padding: '6px 12px' }}>📥 Export Project</AppButton>
                    </div>
                </div>

                {/* TOOLBAR */}
                {oSelectedImage ? (
                    <div style={{
                        padding: '8px 20px', background: '#f4f6f8', borderBottom: '1px solid #ccc',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            {/* Updated to show real count from state */}
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#555', background: '#e1e4e8', padding: '4px 8px', borderRadius: '4px' }}>
                                🏷️ Labels: {filteredLabels.length}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                <label style={{color: '#666'}}>Opacity:</label>
                                <input
                                    type="range" min="0" max="100"
                                    value={iLabelOpacity}
                                    onChange={(e) => setILabelOpacity(e.target.value)}
                                    style={{ width: '100px', cursor: 'pointer' }}
                                />
                                <span style={{width: '25px', fontSize: '11px'}}>{iLabelOpacity}%</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                <span style={{color: '#666', fontWeight: 'bold'}}>Style By:</span>
                                <label style={{cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
                                    <input type="radio" name="styleBy" checked={sStyleBy === 'label'} onChange={() => setStyleBy('label')} style={{marginRight: '4px'}}/>
                                    Label
                                </label>
                                <label style={{cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
                                    <input type="radio" name="styleBy" checked={sStyleBy === 'annotator'} onChange={() => setStyleBy('annotator')} style={{marginRight: '4px'}}/>
                                    Annotator
                                </label>
                            </div>
                            <div style={{height: '20px', borderLeft: '1px solid #ccc'}}></div>
                            {/*todo pick out app down input  */}
                            <select
                                value={sFilterCollab}
                                onChange={(e) => setFilterCollab(e.target.value)}
                                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                            >
                                {MOCK_COLLABS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', userSelect: 'none' }}>
                                <input
                                    type="checkbox"
                                    checked={bShowValidatedOnly}
                                    onChange={(e) => setShowValidatedOnly(e.target.checked)}
                                />
                                <span>Show Validated Only</span>
                            </label>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '8px 20px', background: '#f4f6f8', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#888', fontStyle: 'italic' }}>
                        Select an image from the sidebar to enable tools.
                    </div>
                )}

                {/* MAP */}
                <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: 0 }}>
                    <MapboxMap
                        aoMarkers={[]}
                        oInitialView={{ latitude: 48.8566, longitude: 2.3522, zoom: 12 }}
                        sActiveGeoTIFF={oSelectedImage ? oSelectedImage.filename : null}
                        bEnableGeocoder={true}

                        // Pass the draw function
                        // Note: We only enable drawing if an image is selected!
                        bEnableDraw={true}
                        onDrawUpdate={handleDrawUpdate}
                        sSelectedFeatureId={sSelectedFeatureId}
                        onFeatureSelect={(id) => setSelectedFeatureId(id)}


                        sInitialMapStyle="mapbox://styles/mapbox/satellite-v9"
                    />
                </div>

                {/* ATTRIBUTE TABLE (Dynamic) */}
                <div style={{ height: '180px', borderTop: '1px solid #ddd', background: '#fff', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '8px 15px', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 'bold', fontSize: '13px', color: '#555', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Feature Attributes</span>
                        <span style={{fontWeight: 'normal', color:'#888'}}>Showing {filteredLabels.length} features</span>
                    </div>
                    <div style={{ overflow: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                            <tr style={{ textAlign: 'left', color: '#666' }}>
                                <th style={thStyle}>Class</th>
                                <th style={thStyle}>Measurement</th>
                                <th style={thStyle}>Annotator</th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredLabels.map((feature, index) => {
                                const isSelected = feature.id === sSelectedFeatureId;
                                return (
                                    <tr
                                        key={feature.id || index}
                                        // NEW: Select Row on Click
                                        onClick={() => setSelectedFeatureId(feature.id)}
                                        style={{
                                            borderBottom: '1px solid #eee',
                                            cursor: 'pointer',
                                            // NEW: Highlight Row
                                            backgroundColor: isSelected ? '#fff8e1' : 'white',
                                            borderLeft: isSelected ? '4px solid #ffc107' : '4px solid transparent'
                                        }}
                                    >
                                        <td style={tdStyle}>{feature.properties.className}</td>
                                        <td style={tdStyle}>{feature.properties.measurement}</td>
                                        <td style={tdStyle}>{feature.properties.annotator}</td>
                                        <td style={tdStyle}>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteFeature(feature.id); }}>🗑️</button>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

// Simple styles for the table
const thStyle = { padding: '10px 15px', borderBottom: '1px solid #eee' };
const tdStyle = { padding: '10px 15px' };

export default EditProject;
