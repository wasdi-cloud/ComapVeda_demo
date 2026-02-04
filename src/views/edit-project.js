import React, { useState, useEffect } from 'react';
import * as turf from '@turf/turf';
import { useLocation, useNavigate } from 'react-router-dom';
import AppButton from "../components/app-button";
import MapboxMap from "../components/MapboxMap";


const MOCK_COLLABS = [
    { id: 'all', name: 'All Annotators' },
    { id: 'jihed', name: 'Jihed' },
    { id: 'sarah', name: 'Sarah' },
    { id: 'mike', name: 'Mike' }
];

const EditProject = () => {
    const oNavigate = useNavigate();
    const oLocation = useLocation();
    const sProjectTitle = oLocation.state?.projectTitle || "High-Res Flood Analysis";
    const sCurrentUser = "Jihed";

    // --- DATA ---
    const [aoImages] = useState([
        { id: 1, name: "Sentinel-2 - 2023-10-01", date: "2023-10-01", annotator: "Jihed", filename: "s2.tif", bbox: [3.35, 50.75, 7.22, 53.55] },
        { id: 2, name: "Landsat-8 - 2023-09-15", date: "2023-09-15", annotator: "Jihed", filename: "TCI.tif", bbox: [21.80, 8.70, 38.50, 22.20] },
        { id: 3, name: "Sentinel-2 - 2023-08-20", date: "2023-08-20", annotator: "Jihed", filename: "TCI.tif", bbox: [21.80, 8.70, 38.50, 22.20] },
    ]);

    // --- UI STATE ---

    const [aoFeatures, setAoFeatures] = useState([]);
    const [iSelectedImageId, setISelectedImageId] = useState(null);
    const [iImageOpacity, setImageOpacity] = useState(100);
    const [sStyleBy, setStyleBy] = useState('label');
    const [sFilterCollab, setFilterCollab] = useState('all');
    const [bShowValidatedOnly, setShowValidatedOnly] = useState(false);
    const [sSelectedFeatureId, setSelectedFeatureId] = useState(null);
    const [sDrawingColor, setDrawingColor] = useState("#3b82f6");
    const oSelectedImage = aoImages.find(img => img.id === iSelectedImageId);

    // --- EFFECT: CLEAR ON SWITCH ---
    useEffect(() => {
        setAoFeatures([]);
    }, [iSelectedImageId]);


    // --- NEW: HANDLE COLOR CHANGE ---
    const handleColorChange = (newColor) => {
        setDrawingColor(newColor);
        if (sSelectedFeatureId) {
            setAoFeatures(prev => prev.map(feature => {
                if (feature.id === sSelectedFeatureId) {
                    return { ...feature, properties: { ...feature.properties, portColor: newColor } };
                }
                return feature;
            }));
        }
    };

    // --- NEW: SYNC PICKER TO SELECTION ---
    useEffect(() => {
        if (sSelectedFeatureId) {
            const selectedFeature = aoFeatures.find(f => f.id === sSelectedFeatureId);
            if (selectedFeature && selectedFeature.properties.portColor) {
                setDrawingColor(selectedFeature.properties.portColor);
            }
        }
    }, [sSelectedFeatureId]);

    // --- HANDLER: DRAW UPDATE ---
    const handleDrawUpdate = (featureCollection) => {
        if (!featureCollection) return;

        const enrichedFeatures = featureCollection.features.map(feature => {
            let sMeasurement = "0";
            if (feature.geometry.type === 'Polygon') sMeasurement = (turf.area(feature) / 1000000).toFixed(3) + " km²";
            else if (feature.geometry.type === 'LineString') sMeasurement = turf.length(feature, {units: 'kilometers'}).toFixed(3) + " km";

            const sColorToUse = feature.properties.portColor || sDrawingColor;

            if (!feature.properties.annotator) {
                let assignedUser = sCurrentUser;
                if (Math.random() > 0.5) {
                    const randomCollab = MOCK_COLLABS[Math.floor(Math.random() * MOCK_COLLABS.length)];
                    if (randomCollab.id !== 'all') assignedUser = randomCollab.name;
                }
                return {
                    ...feature,
                    properties: {
                        ...feature.properties,
                        id: feature.id,
                        className: "Road",
                        annotator: assignedUser,
                        status: "Pending",
                        timestamp: new Date().toISOString(),
                        associatedImage: oSelectedImage ? oSelectedImage.name : "Global Map",
                        measurement: sMeasurement,
                        portColor: sColorToUse
                    }
                };
            } else {
                return {
                    ...feature,
                    properties: {
                        ...feature.properties,
                        measurement: sMeasurement,
                        portColor: sColorToUse
                    }
                };
            }
        });
        setAoFeatures(enrichedFeatures);
    };

    const handleDeleteFeature = (id) => {
        if(window.confirm("Delete this label?")) {
            setAoFeatures(prev => prev.filter(f => f.id !== id));
        }
    };

    // --- FILTER LOGIC ---
    const filteredLabels = aoFeatures.filter(feature => {
        const props = feature.properties || {};
        if (sFilterCollab !== 'all' && props.annotator.toLowerCase() !== sFilterCollab.toLowerCase()) return false;
        if (bShowValidatedOnly && props.status !== 'Validated') return false;
        return true;
    });

    const renderThumbnail = (sName) => (
        <div style={{ width: '60px', height: '60px', borderRadius: '6px', background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', border: '1px solid #ccc', flexShrink: 0 }}>
            <span style={{ fontSize: '8px', textTransform: 'uppercase', fontWeight: 'bold' }}>TIFF</span>
        </div>
    );

    return (
        <div style={{ position: 'fixed', top: '64px', bottom: 0, left: 0, right: 0, display: 'flex', overflow: 'hidden', fontFamily: 'sans-serif', background: '#fff' }}>

            {/* SIDEBAR (Unchanged from prev steps) */}
            <div style={{ width: '300px', height: '100%', borderRight: '1px solid #ccc', display: 'flex', flexDirection: 'column', background: '#f9f9f9', flexShrink: 0 }}>
                <div style={{ padding: '15px', borderBottom: '1px solid #ddd', background: 'white' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Images ({aoImages.length})</h3>
                    <AppButton fnOnClick={() => oNavigate('/add-eo')} sVariant="primary" oStyle={{ width: '100%', fontSize: '12px', marginBottom: '10px' }}>+ Add Image</AppButton>
                    <AppButton fnOnClick={() => oNavigate('/image-styling')} sVariant="secondary" oStyle={{ width: '100%', fontSize: '12px' }}>Image Style</AppButton>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                    {aoImages.map(img => {
                        const bIsSelected = iSelectedImageId === img.id;
                        return (
                            <div key={img.id} onClick={() => setISelectedImageId(img.id)} style={{ padding: '10px', marginBottom: '8px', background: bIsSelected ? '#e6f7ff' : '#fff', border: bIsSelected ? '1px solid #1890ff' : '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                                <div style={{display:'flex', alignItems:'center'}}>
                                    {renderThumbnail(img.name)}
                                    <div style={{ marginLeft: '12px', overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.name}</div>
                                        <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{img.date}</div>
                                    </div>
                                </div>
                                {bIsSelected && (
                                    <div style={{marginTop: '10px', paddingTop: '10px', borderTop:'1px dashed #ccc'}} onClick={e => e.stopPropagation()}>
                                        <div style={{fontSize:'11px', fontWeight:'bold', marginBottom:'5px', color:'#555'}}>Layer Opacity</div>
                                        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                            <input type="range" min="0" max="100" value={iImageOpacity} onChange={(e) => setImageOpacity(e.target.value)} style={{ width: '100%', cursor: 'pointer' }} />
                                            <span style={{fontSize:'11px', color:'#666', width:'25px'}}>{iImageOpacity}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #ddd', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', color: '#2c3e50' }}>{sProjectTitle}</h2>
                        <span style={{ fontSize: '12px', color: '#999' }}>Owner: Jihed_123</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <AppButton
                            sVariant="outline"
                            oStyle={{ fontSize: '13px', padding: '6px 12px' }}
                            fnOnClick={() => oNavigate('/project-properties', {
                                state: {
                                    // Pass the current data so the form is pre-filled
                                    projectData: {
                                        name: sProjectTitle,
                                        description: "Analysis of flood extent...", // Or your state variable
                                        mission: "Sentinel-2",
                                        creationDate: "2023-10-01",
                                        labelTemplate: "Flood Damage Schema",
                                        isPublic: false,
                                        annotatorVisibility: "all"
                                    },
                                    // Pass this to lock the template dropdown if needed
                                    //todo this is not really the template , but a temp solution until focus on this one
                                    hasLabels: aoFeatures.length > 0
                                }
                            })}
                        >
                            ⚙️ Properties
                        </AppButton>
                        <AppButton fnOnClick={()=>oNavigate('/project-collabs')} sVariant="outline" oStyle={{ fontSize: '13px', padding: '6px 12px' }}>👥 Collaborators</AppButton>
                        <AppButton fnOnClick={()=>oNavigate('/export-project')} sVariant="primary" oStyle={{ fontSize: '13px', padding: '6px 12px' }}>📥 Export Project</AppButton>
                    </div>
                </div>

                {/* TOOLBAR: FILTERS + COLOR PICKER */}
                {oSelectedImage ? (
                    <div style={{ padding: '8px 20px', background: '#f4f6f8', borderBottom: '1px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#555', background: '#e1e4e8', padding: '4px 8px', borderRadius: '4px' }}>
                                🏷️ Labels: {filteredLabels.length}
                            </div>

                            {/* Color Picker */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                <span style={{fontWeight:'bold', color:'#555'}}>Color:</span>
                                <div style={{display:'flex', alignItems:'center', background:'white', border:'1px solid #ccc', padding:'2px 5px', borderRadius:'4px'}}>
                                    <input
                                        type="color"
                                        value={sDrawingColor}
                                        onChange={(e) => handleColorChange(e.target.value)}
                                        style={{width:'25px', height:'25px', border:'none', background:'none', cursor:'pointer'}}
                                    />
                                    <span style={{fontSize:'11px', marginLeft:'5px', fontFamily:'monospace'}}>{sDrawingColor}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            {/* --- RESTORED: Style By --- */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                <span style={{color: '#666', fontWeight: 'bold'}}>Style By:</span>
                                <label style={{cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
                                    <input type="radio" name="styleBy" checked={sStyleBy === 'label'} onChange={() => setStyleBy('label')} style={{marginRight: '4px'}}/> Label
                                </label>
                                <label style={{cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
                                    <input type="radio" name="styleBy" checked={sStyleBy === 'annotator'} onChange={() => setStyleBy('annotator')} style={{marginRight: '4px'}}/> Annotator
                                </label>
                            </div>

                            <div style={{height: '20px', borderLeft: '1px solid #ccc'}}></div>

                            {/* --- RESTORED: Filter Collaborator --- */}
                            <select value={sFilterCollab} onChange={(e) => setFilterCollab(e.target.value)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}>
                                {MOCK_COLLABS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>

                            {/* --- RESTORED: Show Validated Only --- */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', userSelect: 'none' }}>
                                <input type="checkbox" checked={bShowValidatedOnly} onChange={(e) => setShowValidatedOnly(e.target.checked)} />
                                <span>Show Validated Only</span>
                            </label>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '8px 20px', background: '#f4f6f8', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#888', fontStyle: 'italic' }}>Select an image.</div>
                )}

                {/* MAP */}
                <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: 0 }}>
                    <MapboxMap
                        aoMarkers={[]}
                        oInitialView={{ latitude: 48.8566, longitude: 2.3522, zoom: 12 }}
                        sActiveGeoTIFF={oSelectedImage ? oSelectedImage.filename : null}
                        bEnableGeocoder={true}
                        bEnableDraw={true}
                        onDrawUpdate={handleDrawUpdate}
                        sSelectedFeatureId={sSelectedFeatureId}
                        onFeatureSelect={(id) => setSelectedFeatureId(id)}
                        aoFeatures={filteredLabels}
                        iImageOpacity={iImageOpacity / 100}
                        oZoomToBBox={oSelectedImage?.bbox}
                        sCurrentDrawColor={sDrawingColor}
                        sInitialMapStyle="mapbox://styles/mapbox/satellite-v9"
                    />
                </div>

                {/* TABLE  */}
                <div style={{ height: '180px', borderTop: '1px solid #ddd', background: '#fff', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '8px 15px', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 'bold', fontSize: '13px', color: '#555', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Feature Attributes</span>
                        <span style={{fontWeight: 'normal', color:'#888'}}>Showing {filteredLabels.length} features</span>
                    </div>
                    <div style={{ overflow: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                            <tr style={{ textAlign: 'left', color: '#666' }}>
                                <th style={thStyle}>Color</th>
                                <th style={thStyle}>Class</th>
                                <th style={thStyle}>Measurement</th>
                                <th style={thStyle}>Annotator</th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredLabels.map((feature, index) => (
                                <tr
                                    key={feature.id || index}
                                    onClick={() => setSelectedFeatureId(feature.id)}
                                    style={{
                                        borderBottom: '1px solid #eee', cursor: 'pointer',
                                        backgroundColor: feature.id === sSelectedFeatureId ? '#fff8e1' : 'white',
                                        borderLeft: feature.id === sSelectedFeatureId ? '4px solid #ffc107' : '4px solid transparent'
                                    }}
                                >
                                    <td style={tdStyle}>
                                        <div style={{width:'15px', height:'15px', borderRadius:'50%', background: feature.properties.portColor || '#3b82f6'}}></div>
                                    </td>
                                    <td style={tdStyle}>{feature.properties.className}</td>
                                    <td style={tdStyle}>{feature.properties.measurement}</td>
                                    <td style={tdStyle}>{feature.properties.annotator}</td>
                                    <td style={tdStyle}>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteFeature(feature.id); }}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const thStyle = { padding: '10px 15px', borderBottom: '1px solid #eee' };
const tdStyle = { padding: '10px 15px' };

export default EditProject;
