import { useState } from "react";
import LeafletMap from "../components/LeafletMap";

const EditProject = () => {
    // 1. DATA: We just keep the filename for the map
    const [images] = useState([
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

    const [selectedImageId, setSelectedImageId] = useState(null);
    const [labelOpacity, setLabelOpacity] = useState(70);

    // Helper to find the currently active image object for the map
    const selectedImage = images.find(img => img.id === selectedImageId);

    // 2. QUICK REACT FIX: A nice placeholder icon
    const renderThumbnail = (name) => {
        // We generate a "Fake" thumbnail using CSS
        return (
            <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', // Satellite Blue Gradient
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '10px',
                border: '1px solid #ccc'
            }}>
                {/* Simple SVG Icon for "Map/Satellite" */}
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
            position: 'fixed', top: '80px', bottom: 0, left: 0, right: 0,
            display: 'flex', overflow: 'hidden', fontFamily: 'sans-serif', background: '#fff'
        }}>

            {/* PART 1: SIDEBAR (25%) */}
            <div style={{
                width: '25%', height: '100%', borderRight: '1px solid #ccc',
                display: 'flex', flexDirection: 'column', background: '#f9f9f9', flexShrink: 0
            }}>
                <div style={{ padding: '15px', borderBottom: '1px solid #ddd' }}>
                    <h3>Images ({images.length})</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button style={{ padding: '6px 12px', cursor: 'pointer' }}>Add Image</button>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                    {images.map(img => {
                        const isSelected = selectedImageId === img.id;
                        return (
                            <div
                                key={img.id}
                                onClick={() => setSelectedImageId(img.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '10px',
                                    marginBottom: '10px',
                                    background: isSelected ? '#e6f7ff' : '#fff',
                                    border: isSelected ? '1px solid #1890ff' : '1px solid #ddd',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: '0.2s'
                                }}
                            >
                                {/* LEFT: The CSS Thumbnail */}
                                <div style={{ marginRight: '15px' }}>
                                    {renderThumbnail(img.name)}
                                </div>

                                {/* RIGHT: Info */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333', marginBottom:'3px' }}>
                                        {img.name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>
                                        {img.date} • {img.annotator}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* PART 2: MAIN CONTENT (75%) */}
            <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* HEADER */}
                <div style={{ padding: '15px', borderBottom: '1px solid #ddd', background: '#fff', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><strong>Project:</strong> High-Res | <strong>Owner:</strong> Jihed</div>
                        <div>
                            <button>Export</button>
                        </div>
                    </div>
                    {/* ... controls ... */}
                    <div style={{ display: 'flex', gap: '20px', marginTop: '15px', alignItems: 'center', fontSize: '14px' }}>
                        <div>Opacity: <input type="range" value={labelOpacity} onChange={(e) => setLabelOpacity(e.target.value)} /></div>
                    </div>
                </div>

                {/* MAP WRAPPER */}
                <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: 0 }}>
                    <div style={{ position: 'absolute', inset: 0 }}>

                        {/* THE MAP: Receives the selected filename */}
                        <LeafletMap
                            markers={[]}
                            initialView={{ latitude: 48.8566, longitude: 2.3522, zoom: 12 }}
                            activeGeoTIFF={selectedImage ? selectedImage.filename : null}
                        />

                    </div>
                </div>

                {/* TABLE */}
                <div style={{ height: '150px', borderTop: '2px solid #333', padding: '10px', background: '#fff', flexShrink: 0, overflowY: 'auto', zIndex: 20 }}>
                    <strong>Attributes</strong>
                    <table style={{ width: '100%', marginTop: '5px', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                        <tr style={{ background: '#eee', textAlign: 'left' }}>
                            <th style={{ border: '1px solid #ddd', padding: '5px' }}>Name</th>
                            <th style={{ border: '1px solid #ddd', padding: '5px' }}>Type</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr><td style={{ border: '1px solid #ddd', padding: '5px' }}>Example_Row</td><td style={{ border: '1px solid #ddd', padding: '5px' }}>String</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EditProject;
