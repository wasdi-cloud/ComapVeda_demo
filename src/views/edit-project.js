import React, { useState } from "react";
import MapboxMap from "../components/MapboxMap";
import AppButton from "../components/app-button"; // Reusable Button

const EditProject = () => {
    // 1. DATA: Array of Objects (ao)
    const [aoImages] = useState([
        {
            id: 1,
            name: "Sentinel-2 - 2023-10-01",
            date: "2023-10-01",
            annotator: "Jihed",
            filename: "baresoil-flood.tif"
        },
        {
            id: 2,
            name: "Landsat-8 - 2023-09-15",
            date: "2023-09-15",
            annotator: "Jihed",
            filename: "TCI.tif"
        },
        {
            id: 3,
            name: "Sentinel-2 - 2023-08-20",
            date: "2023-08-20",
            annotator: "Jihed",
            filename: "TCI.tif"
        },
    ]);

    const [iSelectedImageId, setISelectedImageId] = useState(null);
    const [iLabelOpacity, setILabelOpacity] = useState(70);

    // Helper to find the currently active image object
    const oSelectedImage = aoImages.find(img => img.id === iSelectedImageId);

    // 2. THUMBNAIL RENDERER
    const renderThumbnail = (sName) => {
        return (
            <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                border: '1px solid #ccc',
                flexShrink: 0
            }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                    <line x1="8" y1="2" x2="8" y2="18"></line>
                    <line x1="16" y1="6" x2="16" y2="22"></line>
                </svg>
                <span style={{ marginTop: '4px', fontSize: '8px', textTransform: 'uppercase' }}>TIFF</span>
            </div>
        );
    };

    return (
        <div style={{
            position: 'fixed', top: '0', // Adjusted to account for main navbar if you have one
            bottom: 0, left: 0, right: 0,
            display: 'flex', overflow: 'hidden', fontFamily: 'sans-serif', background: '#fff'
        }}>

            {/* --- SIDEBAR (25%) --- */}
            <div style={{
                width: '300px', height: '100%', borderRight: '1px solid #ccc',
                display: 'flex', flexDirection: 'column', background: '#f9f9f9', flexShrink: 0
            }}>
                <div style={{ padding: '15px', borderBottom: '1px solid #ddd', background: 'white' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Images ({aoImages.length})</h3>
                    <AppButton sVariant="primary" oStyle={{ width: '100%', fontSize: '12px' }}>
                        + Add Image
                    </AppButton>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                    {aoImages.map(img => {
                        const bIsSelected = iSelectedImageId === img.id;
                        return (
                            <div
                                key={img.id}
                                onClick={() => setISelectedImageId(img.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '10px',
                                    marginBottom: '8px',
                                    background: bIsSelected ? '#e6f7ff' : '#fff',
                                    border: bIsSelected ? '1px solid #1890ff' : '1px solid #ddd',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: '0.2s',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                            >
                                {renderThumbnail(img.name)}
                                <div style={{ marginLeft: '12px', overflow: 'hidden' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {img.name}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>
                                        {img.date}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#999' }}>
                                        By {img.annotator}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- MAIN CONTENT (75%) --- */}
            <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* HEADER CONTROLS */}
                <div style={{ padding: '10px 20px', borderBottom: '1px solid #ddd', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                    {/* Info */}
                    <div style={{ fontSize: '14px' }}>
                        <span style={{ fontWeight: 'bold', color: '#333' }}>Project:</span> High-Res Flood Analysis
                        <span style={{ margin: '0 10px', color: '#ccc' }}>|</span>
                        <span style={{ fontWeight: 'bold', color: '#333' }}>Owner:</span> Jihed
                    </div>

                    {/* Tools */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                            <label>Opacity:</label>
                            <input
                                type="range"
                                min="0" max="100"
                                value={iLabelOpacity}
                                onChange={(e) => setILabelOpacity(e.target.value)}
                                style={{ cursor: 'pointer' }}
                            />
                        </div>
                        <AppButton sVariant="outline" oStyle={{ padding: '6px 15px', fontSize: '13px' }}>
                            Export Data
                        </AppButton>
                    </div>
                </div>

                {/* MAP WRAPPER */}
                <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: 0 }}>

                    {/* Mapbox Implementation using your New Props */}
                    <MapboxMap
                        aoMarkers={[]}
                        oInitialView={{ latitude: 48.8566, longitude: 2.3522, zoom: 12 }}
                        sActiveGeoTIFF={oSelectedImage ? oSelectedImage.filename : null}

                        // Enabling the advanced features for the editor
                        bEnableGeocoder={true}
                        bEnableDraw={true}
                        sInitialMapStyle="mapbox://styles/mapbox/satellite-v9"
                    />

                </div>

                {/* ATTRIBUTE TABLE */}
                <div style={{ height: '180px', borderTop: '1px solid #ddd', background: '#fff', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '8px 15px', background: '#f4f6f8', borderBottom: '1px solid #ddd', fontWeight: 'bold', fontSize: '13px', color: '#555' }}>
                        Feature Attributes
                    </div>
                    <div style={{ overflow: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead style={{ position: 'sticky', top: 0, background: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                            <tr style={{ textAlign: 'left', color: '#666' }}>
                                <th style={{ padding: '10px 15px', borderBottom: '1px solid #eee' }}>ID</th>
                                <th style={{ padding: '10px 15px', borderBottom: '1px solid #eee' }}>Class Name</th>
                                <th style={{ padding: '10px 15px', borderBottom: '1px solid #eee' }}>Area (km²)</th>
                                <th style={{ padding: '10px 15px', borderBottom: '1px solid #eee' }}>Confidence</th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr>
                                <td style={{ padding: '10px 15px', borderBottom: '1px solid #eee' }}>1</td>
                                <td style={{ padding: '10px 15px', borderBottom: '1px solid #eee' }}>Water Body</td>
                                <td style={{ padding: '10px 15px', borderBottom: '1px solid #eee' }}>0.45</td>
                                <td style={{ padding: '10px 15px', borderBottom: '1px solid #eee' }}>98%</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '10px 15px', borderBottom: '1px solid #eee' }}>2</td>
                                <td style={{ padding: '10px 15px', borderBottom: '1px solid #eee' }}>Urban</td>
                                <td style={{ padding: '10px 15px', borderBottom: '1px solid #eee' }}>1.20</td>
                                <td style={{ padding: '10px 15px', borderBottom: '1px solid #eee' }}>85%</td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditProject;
