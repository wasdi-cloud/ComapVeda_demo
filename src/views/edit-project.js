import React, {useEffect, useState} from 'react';
import * as turf from '@turf/turf';
import {useLocation, useNavigate} from 'react-router-dom';
import AppButton from "../components/app-button";
import MapboxMap from "../components/MapboxMap";
import {getProject} from "../services/project-service";
import {getLabelTemplateByProject} from "../services/labelling-template-service";


const MOCK_COLLABS = [
    {id: 'all', name: 'All Annotators'},
    {id: 'jihed', name: 'Jihed'},
    {id: 'sarah', name: 'Sarah'},
    {id: 'mike', name: 'Mike'}
];


const EditProject = () => {
    const oNavigate = useNavigate();
    const oLocation = useLocation();
    const sProjectTitle = oLocation.state?.projectTitle || "High-Res Flood Analysis";
    const sProjectId = oLocation.state?.projectId || null;
    const sCurrentUser = "Jihed";

    // --- DATA ---
    const [aoImages] = useState([
        {
            id: 1,
            name: "Sentinel-2 - 2023-10-01",
            date: "2023-10-01",
            annotator: "Jihed",
            filename: "s2.tif",
            bbox: [3.35, 50.75, 7.22, 53.55]
        },
        {
            id: 2,
            name: "Landsat-8 - 2023-09-15",
            date: "2023-09-15",
            annotator: "Jihed",
            filename: "TCI.tif",
            bbox: [21.80, 8.70, 38.50, 22.20]
        },
        {
            id: 3,
            name: "Sentinel-2 - 2023-08-20",
            date: "2023-08-20",
            annotator: "Jihed",
            filename: "TCI.tif",
            bbox: [21.80, 8.70, 38.50, 22.20]
        },
    ]);

    // --- UI STATE ---
    const [aoFeatures, setAoFeatures] = useState([]);
    const [iSelectedImageId, setISelectedImageId] = useState(null);

    // Project Data States
    const [oProject, setProject] = useState(null);
    const [oProjectBBox, setProjectBBox] = useState(null); // <--- NEW: Stores Project Area
    const [oLabelTemplate, setLabelTemplate] = useState(null);
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

    // Helper to convert "POLYGON((30 10...))" to [minX, minY, maxX, maxY]
    const parseWKTBbox = (wkt) => {
        if (!wkt) return null;
        try {
            // FIX: Use Regex to safely strip "POLYGON" and all brackets/parentheses regardless of spacing
            const coordsText = wkt.replace(/POLYGON\s*\(\(/i, "").replace(/\)\)/, "");
            const pairs = coordsText.split(",").map(p => p.trim());

            let xValues = [];
            let yValues = [];

            pairs.forEach(pair => {
                // Safely split the coordinate pair by any whitespace
                const [x, y] = pair.split(/\s+/).map(Number);

                // Only push valid numbers
                if (!isNaN(x) && !isNaN(y)) {
                    xValues.push(x);
                    yValues.push(y);
                }
            });

            const bbox = [
                Math.min(...xValues),
                Math.min(...yValues),
                Math.max(...xValues),
                Math.max(...yValues)
            ];

            console.log("Parsed BBOX for Mapbox:", bbox); // <-- Added to help you verify
            return bbox;

        } catch (e) {
            console.error("Failed to parse BBOX:", e);
            return null;
        }
    };

    // --- LOAD PROJECT DATA ---
    // --- LOAD PROJECT DATA ---
    useEffect(() => {
        const loadProject = async () => {
            // 1. Safety check: If there is no ID, send them back to home
            if (!sProjectId) {
                console.error("No project ID found! Redirecting to home...");
                oNavigate('/');
                return;
            }

            try {
                // 2. Use the real ID!
                const oData = await getProject(sProjectId);

                if (oData) {
                    console.log("Project Loaded:", oData);
                    setProject(oData);

                    // 3. Load Template associated with this project using the real ID
                    // (Ensure your backend endpoint accepts this ID)
                    // const templateData = await getLabelTemplateByProject(sProjectId);
                    // if (templateData) {
                    //     console.log("Template Loaded:", templateData);
                    //     setLabelTemplate(templateData);
                    // }

                    // 4. Parse and Set Project BBox (for initial zoom)
                    if (oData.bbox) {
                        console.log("here")
                        console.log(oData.bbox);

                        const parsedBox = parseWKTBbox(oData.bbox);
                        console.log(parsedBox);
                        setProjectBBox(parsedBox);
                    }
                }
            } catch (error) {
                console.log("Error loading project data:", error);
            }
        }

        loadProject();
    }, [sProjectId, oNavigate]); // Add dependencies here

    // --- NEW: HANDLE COLOR CHANGE ---
    const handleColorChange = (newColor) => {
        setDrawingColor(newColor);
        if (sSelectedFeatureId) {
            setAoFeatures(prev => prev.map(feature => {
                if (feature.id === sSelectedFeatureId) {
                    return {...feature, properties: {...feature.properties, portColor: newColor}};
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
    // --- DRAW UPDATE: DYNAMIC ATTRIBUTES ---
    const handleDrawUpdate = (featureCollection) => {
        if (!featureCollection) return;

        const enrichedFeatures = featureCollection.features.map(feature => {
            // 1. Calculate Measurement
            let sMeasurement = "0";
            if (feature.geometry.type === 'Polygon') sMeasurement = (turf.area(feature) / 1000000).toFixed(3) + " km²";
            else if (feature.geometry.type === 'LineString') sMeasurement = turf.length(feature, {units: 'kilometers'}).toFixed(3) + " km";

            // 2. Setup Properties
            // If it's a NEW feature (no annotator yet), we initialize values
            if (!feature.properties.annotator) {

                // A. Initialize Dynamic Attributes based on Template
                const dynamicProps = {};
                if (oLabelTemplate && oLabelTemplate.attributes) {
                    oLabelTemplate.attributes.forEach(attr => {
                        if (attr.type === 'integer' || attr.type === 'float') {
                            dynamicProps[attr.name] = 0;
                        } else {
                            dynamicProps[attr.name] = "N/A"; // string or category default
                        }
                    });
                }

                // B. determine color (Single style or default)
                // If template is single color, use that. Else use picker.
                const initialColor = (oLabelTemplate?.isSingleColorStyle && oLabelTemplate?.featureColor)
                    ? oLabelTemplate.featureColor
                    : sDrawingColor;

                return {
                    ...feature,
                    properties: {
                        ...feature.properties,
                        id: feature.id,
                        annotator: sCurrentUser,
                        status: "Pending",
                        timestamp: new Date().toISOString(),
                        measurement: sMeasurement,
                        portColor: initialColor,
                        // SPREAD DYNAMIC PROPS
                        ...dynamicProps
                    }
                };
            } else {
                return {
                    ...feature,
                    properties: {
                        ...feature.properties,
                        measurement: sMeasurement,
                        portColor: feature.properties.portColor || sDrawingColor
                    }
                };
            }
        });
        setAoFeatures(enrichedFeatures);
    };

    const handleDeleteFeature = (id) => {
        if (window.confirm("Delete this label?")) {
            setAoFeatures(prev => prev.filter(f => f.id !== id));
        }
    };
// --- HELPER: EDIT ATTRIBUTE VALUE (Simple Prompt for Demo) ---
    const handleEditAttribute = (featureId, attrName, currentValue) => {
        const newValue = prompt(`Edit ${attrName}:`, currentValue);
        if (newValue !== null) {
            setAoFeatures(prev => prev.map(f => {
                if (f.id === featureId) {
                    return {
                        ...f,
                        properties: { ...f.properties, [attrName]: newValue }
                    };
                }
                return f;
            }));
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
            <span style={{fontSize: '8px', textTransform: 'uppercase', fontWeight: 'bold'}}>TIFF</span>
        </div>
    );

    return (
        <div style={{
            position: 'fixed',
            top: '64px',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            overflow: 'hidden',
            fontFamily: 'sans-serif',
            background: '#fff'
        }}>

            {/* SIDEBAR */}
            <div style={{
                width: '300px',
                height: '100%',
                borderRight: '1px solid #ccc',
                display: 'flex',
                flexDirection: 'column',
                background: '#f9f9f9',
                flexShrink: 0
            }}>
                <div style={{padding: '15px', borderBottom: '1px solid #ddd', background: 'white'}}>
                    <h3 style={{margin: '0 0 10px 0', fontSize: '16px'}}>Images ({aoImages.length})</h3>
                    <AppButton fnOnClick={() => oNavigate('/add-eo')} sVariant="primary"
                               oStyle={{width: '100%', fontSize: '12px', marginBottom: '10px'}}>+ Add Image</AppButton>
                    <AppButton fnOnClick={() => oNavigate('/image-styling')} sVariant="secondary"
                               oStyle={{width: '100%', fontSize: '12px'}}>Image Style</AppButton>
                </div>
                <div style={{flex: 1, overflowY: 'auto', padding: '10px'}}>
                    {aoImages.map(img => {
                        const bIsSelected = iSelectedImageId === img.id;
                        return (
                            <div key={img.id} onClick={() => setISelectedImageId(img.id)} style={{
                                padding: '10px',
                                marginBottom: '8px',
                                background: bIsSelected ? '#e6f7ff' : '#fff',
                                border: bIsSelected ? '1px solid #1890ff' : '1px solid #ddd',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{display: 'flex', alignItems: 'center'}}>
                                    {renderThumbnail(img.name)}
                                    <div style={{marginLeft: '12px', overflow: 'hidden'}}>
                                        <div style={{
                                            fontWeight: 'bold',
                                            fontSize: '13px',
                                            color: '#333',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>{img.name}</div>
                                        <div
                                            style={{fontSize: '11px', color: '#666', marginTop: '3px'}}>{img.date}</div>
                                    </div>
                                </div>
                                {bIsSelected && (
                                    <div style={{marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #ccc'}}
                                         onClick={e => e.stopPropagation()}>
                                        <div style={{
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            marginBottom: '5px',
                                            color: '#555'
                                        }}>Layer Opacity
                                        </div>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                            <input type="range" min="0" max="100" value={iImageOpacity}
                                                   onChange={(e) => setImageOpacity(e.target.value)}
                                                   style={{width: '100%', cursor: 'pointer'}}/>
                                            <span style={{
                                                fontSize: '11px',
                                                color: '#666',
                                                width: '25px'
                                            }}>{iImageOpacity}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div style={{flex: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
                <div style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid #ddd',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <h2 style={{margin: 0, fontSize: '18px', color: '#2c3e50'}}>{sProjectTitle}</h2>
                        <span style={{
                            fontSize: '12px',
                            color: '#999'
                        }}>Owner: Jihed_123 | Template: {oLabelTemplate?.name}</span>
                    </div>
                    <div style={{display: 'flex', gap: '10px'}}>
                        <AppButton
                            sVariant="outline"
                            oStyle={{fontSize: '13px', padding: '6px 12px'}}
                            fnOnClick={() => oNavigate('/project-properties', {
                                state: {
                                    projectData: {
                                        name: sProjectTitle,
                                        description: oProject?.description || "",
                                        mission: oProject?.mission || "Sentinel-2",
                                        creationDate: oProject?.creationDate || "",
                                        labelTemplate: oLabelTemplate, // Pass the extracted template
                                        isPublic: oProject?.isPublic || false,
                                        annotatorVisibility: oProject?.hasAnnotatorGlobalView ? 'all' : 'own'
                                    },
                                    hasLabels: aoFeatures.length > 0
                                }
                            })}
                        >
                            ⚙️ Properties
                        </AppButton>
                        <AppButton fnOnClick={() => oNavigate('/project-collabs')} sVariant="outline"
                                   oStyle={{fontSize: '13px', padding: '6px 12px'}}>👥 Collaborators</AppButton>
                        <AppButton fnOnClick={() => oNavigate('/export-project')} sVariant="primary"
                                   oStyle={{fontSize: '13px', padding: '6px 12px'}}>📥 Export Project</AppButton>
                    </div>
                </div>

                {/* TOOLBAR */}
                {oSelectedImage ? (
                    <div style={{
                        padding: '8px 20px',
                        background: '#f4f6f8',
                        borderBottom: '1px solid #ccc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '15px'
                    }}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                            <div style={{
                                fontSize: '13px',
                                fontWeight: 'bold',
                                color: '#555',
                                background: '#e1e4e8',
                                padding: '4px 8px',
                                borderRadius: '4px'
                            }}>
                                🏷️ Labels: {filteredLabels.length}
                            </div>
                            <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px'}}>
                                <span style={{fontWeight: 'bold', color: '#555'}}>Color:</span>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: 'white',
                                    border: '1px solid #ccc',
                                    padding: '2px 5px',
                                    borderRadius: '4px'
                                }}>
                                    <input type="color" value={sDrawingColor}
                                           onChange={(e) => handleColorChange(e.target.value)} style={{
                                        width: '25px',
                                        height: '25px',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer'
                                    }}/>
                                    <span style={{
                                        fontSize: '11px',
                                        marginLeft: '5px',
                                        fontFamily: 'monospace'
                                    }}>{sDrawingColor}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px'}}>
                                <span style={{color: '#666', fontWeight: 'bold'}}>Style By:</span>
                                <label style={{cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
                                    <input type="radio" name="styleBy" checked={sStyleBy === 'label'}
                                           onChange={() => setStyleBy('label')} style={{marginRight: '4px'}}/> Label
                                </label>
                                <label style={{cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
                                    <input type="radio" name="styleBy" checked={sStyleBy === 'annotator'}
                                           onChange={() => setStyleBy('annotator')}
                                           style={{marginRight: '4px'}}/> Annotator
                                </label>
                            </div>
                            <div style={{height: '20px', borderLeft: '1px solid #ccc'}}></div>
                            <select value={sFilterCollab} onChange={(e) => setFilterCollab(e.target.value)} style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                fontSize: '13px'
                            }}>
                                {MOCK_COLLABS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                userSelect: 'none'
                            }}>
                                <input type="checkbox" checked={bShowValidatedOnly}
                                       onChange={(e) => setShowValidatedOnly(e.target.checked)}/>
                                <span>Show Validated Only</span>
                            </label>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        padding: '8px 20px',
                        background: '#f4f6f8',
                        borderBottom: '1px solid #ccc',
                        fontSize: '13px',
                        color: '#888',
                        fontStyle: 'italic'
                    }}>Select an image.</div>
                )}

                {/* MAP */}
                <div style={{flex: 1, position: 'relative', width: '100%', minHeight: 0}}>
                    <MapboxMap
                        aoMarkers={[]}
                        oInitialView={{latitude: 48.8566, longitude: 2.3522, zoom: 12}}
                        sActiveGeoTIFF={oSelectedImage ? oSelectedImage.filename : null}
                        bEnableGeocoder={true}
                        bEnableDraw={true}
                        onDrawUpdate={handleDrawUpdate}
                        sSelectedFeatureId={sSelectedFeatureId}
                        onFeatureSelect={(id) => setSelectedFeatureId(id)}
                        aoFeatures={filteredLabels}
                        iImageOpacity={iImageOpacity / 100}

                        // --- UPDATED ZOOM LOGIC: Image takes priority, otherwise use Project BBox ---
                        oZoomToBBox={oSelectedImage?.bbox || oProjectBBox}

                        sCurrentDrawColor={sDrawingColor}
                        sInitialMapStyle="mapbox://styles/mapbox/satellite-v9"
                    />
                </div>

                {/* TABLE (Unchanged) */}
                {/* --- DYNAMIC TABLE --- */}
                <div style={{ height: '200px', borderTop: '1px solid #ddd', background: '#fff', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '8px 15px', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 'bold', fontSize: '13px' }}>
                        Feature Attributes ({oLabelTemplate?.name || "Loading..."})
                    </div>

                    <div style={{ overflow: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                            <tr style={{ textAlign: 'left', color: '#666' }}>
                                <th style={thStyle}>Color</th>

                                {/* DYNAMIC HEADERS */}
                                {oLabelTemplate?.attributes?.map(attr => (
                                    <th key={attr.name} style={thStyle}>{attr.name}</th>
                                ))}

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
                                        borderBottom: '1px solid #eee',
                                        background: feature.id === sSelectedFeatureId ? '#fff8e1' : 'white'
                                    }}
                                >
                                    <td style={tdStyle}>
                                        <div style={{width:'15px', height:'15px', borderRadius:'50%', background: feature.properties.portColor}}></div>
                                    </td>

                                    {/* DYNAMIC CELLS */}
                                    {oLabelTemplate?.attributes?.map(attr => (
                                        <td
                                            key={attr.name}
                                            style={{...tdStyle, cursor: 'text'}}
                                            title="Click to edit"
                                            // Simple Click-to-Edit for Demo
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent row select
                                                handleEditAttribute(feature.id, attr.name, feature.properties[attr.name]);
                                            }}
                                        >
                                            {feature.properties[attr.name]}
                                            <span style={{marginLeft:'5px', color:'#ccc', fontSize:'10px'}}>✎</span>
                                        </td>
                                    ))}

                                    <td style={tdStyle}>{feature.properties.measurement}</td>
                                    <td style={tdStyle}>{feature.properties.annotator}</td>
                                    <td style={tdStyle}>
                                        <button>🗑️</button>
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

const thStyle = {padding: '10px 15px', borderBottom: '1px solid #eee'};
const tdStyle = {padding: '10px 15px'};

export default EditProject;
