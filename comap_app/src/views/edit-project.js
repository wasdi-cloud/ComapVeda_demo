import React, {useEffect, useState, useContext, useCallback} from 'react';
import * as turf from '@turf/turf';
import {useLocation, useNavigate} from 'react-router-dom';
import AppButton from "../components/app-button";
import MapboxMap from "../components/MapboxMap";
import {getProject} from "../services/project-service";
import {getLabelTemplateById} from "../services/labelling-template-service";
import {getLabelsByImage, syncLabels} from "../services/labels-service";
import {getProjectImages} from "../services/images-service";
import AppNotification from "../dialogues/app-notifications";
import {useNotifications} from "../contexts/NotificationContext";

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
    const [oNotification, setNotification] = useState({show: false, message: '', type: 'info'});

    const { notifications } = useNotifications();

    const [aoImages, setAoImages] = useState([]);

    // --- UI STATE ---
    const [aoFeatures, setAoFeatures] = useState([]);
    const [iSelectedImageId, setISelectedImageId] = useState(null);

    // Project Data States
    const [oProject, setProject] = useState(null);
    const [oProjectBBox, setProjectBBox] = useState(null);
    const [oLabelTemplate, setLabelTemplate] = useState(null);
    const [iImageOpacity, setImageOpacity] = useState(100);
    const [sStyleBy, setStyleBy] = useState('label');
    const [sFilterCollab, setFilterCollab] = useState('all');
    const [bShowValidatedOnly, setShowValidatedOnly] = useState(false);
    const [sSelectedFeatureId, setSelectedFeatureId] = useState(null);
    const [sDrawingColor, setDrawingColor] = useState("#3b82f6");

    // --- NEW: DEDICATED ZOOM STATE ---
    const [aoMapZoomView, setMapZoomView] = useState(null);

    const [oEditingCell, setEditingCell] = useState({featureId: null, attrName: null});
    const [sEditValue, setEditValue] = useState("");

    const oSelectedImage = aoImages.find(img => img.id === iSelectedImageId);

    const [bIsSavingLabels, setIsSavingLabels] = useState(false);

    // --- FETCH LABELS WHEN IMAGE CHANGES ---
    useEffect(() => {
        const loadLabels = async () => {
            if (!iSelectedImageId) return;

            try {
                const data = await getLabelsByImage(sProjectId, String(iSelectedImageId));

                const mapboxFeatures = (data || []).map(lbl => ({
                    id: lbl.labelId,
                    type: "Feature",
                    geometry: {
                        type: lbl.geometryType,
                        coordinates: lbl.coordinates
                    },
                    properties: lbl.attributes
                }));

                setAoFeatures(mapboxFeatures);
            } catch (error) {
                console.error("Failed to load labels:", error);
            }
        };

        loadLabels();
    }, [iSelectedImageId, sProjectId]);

    // --- SAVE LABELS HANDLER ---
    const handleSaveLabels = async () => {
        if (!iSelectedImageId) return;

        if (oLabelTemplate && oLabelTemplate.attributes) {
            const requiredAttrs = oLabelTemplate.attributes.filter(a => !a.isOptional);

            for (const feature of aoFeatures) {
                for (const attr of requiredAttrs) {
                    const val = feature.properties[attr.name];

                    if (val === "" || val === null || val === undefined) {
                        let sNotifMessage = "🛑 Cannot save! The field" + attr.name + " is required. Please check your attribute table and fill in the missing values."
                        showNotif(sNotifMessage, "error")
                        return;
                    }
                }
            }
        }

        setIsSavingLabels(true);

        try {
            const payload = aoFeatures.map(f => ({
                labelId: f.id,
                imageName: String(iSelectedImageId),
                geometryType: f.geometry.type,
                coordinates: f.geometry.coordinates,
                attributes: f.properties
            }));

            await syncLabels(String(iSelectedImageId), payload);
            let sNotifMessage = "Labels saved to database successfully! 💾"
            showNotif(sNotifMessage, "success");
        } catch (error) {
            let sNotifMessage = "Failed to save labels"
            showNotif(sNotifMessage, "error");
            console.error(error);
        } finally {
            setIsSavingLabels(false);
        }
    };

    const showNotif = (message, type = 'info') => {
        setNotification({show: true, message, type});
    };

    useEffect(() => {
        setAoFeatures([]);
    }, [iSelectedImageId]);

    // Helper to convert "POLYGON((30 10...))" to [minX, minY, maxX, maxY]
    const parseWKTBbox = (wkt) => {
        if (!wkt) return null;
        try {
            const coordsText = wkt.replace(/POLYGON\s*\(\(/i, "").replace(/\)\)/, "");
            const pairs = coordsText.split(",").map(p => p.trim());

            let xValues = [];
            let yValues = [];

            pairs.forEach(pair => {
                const [x, y] = pair.split(/\s+/).map(Number);
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

            return bbox;
        } catch (e) {
            console.error("Failed to parse BBOX:", e);
            return null;
        }
    };

    // --- LOAD PROJECT DATA ---
    const loadImages = useCallback(async () => {
        try {
            const aoProjectImages = await getProjectImages(sProjectId);
            if (aoProjectImages && aoProjectImages.length > 0) {
                const aoFormattedImages = aoProjectImages.map(img => ({
                    ...img,
                    date: img.date ? new Date(img.date).toLocaleDateString() : "Unknown Date"
                }));
                setAoImages(aoFormattedImages);
            }
        } catch (error) {
            console.log("Error loading images:", error);
        }
    }, [sProjectId]);

    useEffect(() => {
        const loadProject = async () => {
            if (!sProjectId) {
                console.error("No project ID found! Redirecting to home...");
                oNavigate('/');
                return;
            }

            try {
                const oData = await getProject(sProjectId);

                if (oData) {
                    setProject(oData);

                    const oTemplateData = await getLabelTemplateById(oData.labellingTemplate);
                    if (oTemplateData) {
                        setLabelTemplate(oTemplateData);
                    }

                    if (oData.bbox) {
                        const parsedBox = parseWKTBbox(oData.bbox);
                        setProjectBBox(parsedBox);
                        // --- Set the initial map zoom view ---
                        setMapZoomView(parsedBox);
                    }

                    await loadImages();
                }
            } catch (error) {
                console.log("Error loading project data:", error);
            }
        }

        loadProject();
    }, [sProjectId, oNavigate, loadImages]);

    // --- REFRESH IMAGES ON IMPORT SUCCESS NOTIFICATION ---
    useEffect(() => {
        if (notifications.length > 0) {
            const latestNotification = notifications[notifications.length - 1];
            if (latestNotification.type === 'success' &&
                latestNotification.message &&
                latestNotification.message.includes('successfully imported')) {
                console.log('Import success notification received, refreshing images...');
                loadImages();
            }
        }
    }, [notifications, sProjectId, loadImages]);

    // --- HANDLE COLOR CHANGE ---
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

    // --- SYNC PICKER TO SELECTION ---
    useEffect(() => {
        if (sSelectedFeatureId) {
            const selectedFeature = aoFeatures.find(f => f.id === sSelectedFeatureId);
            if (selectedFeature && selectedFeature.properties.portColor) {
                setDrawingColor(selectedFeature.properties.portColor);
            }
        }
    }, [sSelectedFeatureId, aoFeatures]);

    // --- HANDLER: DRAW UPDATE ---
    const handleDrawUpdate = (featureCollection) => {
        if (!featureCollection) return;

        setAoFeatures(prevFeatures => {
            const enrichedFeatures = featureCollection.features.map(feature => {
                let sMeasurement = "0";
                if (feature.geometry.type === 'Polygon') sMeasurement = (turf.area(feature) / 1000000).toFixed(3) + " km²";
                else if (feature.geometry.type === 'LineString') sMeasurement = turf.length(feature, {units: 'kilometers'}).toFixed(3) + " km";

                const existingFeature = prevFeatures.find(f => f.id === feature.id);

                if (existingFeature) {
                    return {
                        ...feature,
                        properties: {
                            ...existingFeature.properties,
                            measurement: sMeasurement
                        }
                    };
                } else {
                    const dynamicProps = {};
                    if (oLabelTemplate && oLabelTemplate.attributes) {
                        oLabelTemplate.attributes.forEach(attr => {
                            dynamicProps[attr.name] = "";
                        });
                    }

                    const initialColor = (oLabelTemplate?.isSingleColorStyle && oLabelTemplate?.featureColor)
                        ? oLabelTemplate.featureColor : sDrawingColor;

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
                            ...dynamicProps
                        }
                    };
                }
            });

            return enrichedFeatures;
        });
    };

    const handleDeleteFeature = (id) => {
        if (window.confirm("Delete this label?")) {
            setAoFeatures(prev => prev.filter(f => f.id !== id));
        }
    };

    // --- IN-PLACE EDITING HANDLERS ---
    const startEditing = (featureId, attrName, currentValue, e) => {
        e.stopPropagation();
        setEditingCell({featureId, attrName});
        setEditValue(currentValue || "");
    };

    const updateFeatureProperties = (featureId, attrName, newValue) => {
        setAoFeatures(prev => prev.map(f => {
            if (f.id === featureId) {
                const updatedProperties = {...f.properties, [attrName]: newValue};

                if (oLabelTemplate && !oLabelTemplate.isSingleColorStyle && oLabelTemplate.colourAttributeName === attrName) {
                    const colorAttr = oLabelTemplate.attributes.find(attr => attr.name === attrName);
                    if (colorAttr && colorAttr.categoryValues) {
                        const selectedCategory = colorAttr.categoryValues.find(cat => cat.value === newValue);
                        if (selectedCategory && selectedCategory.color) {
                            updatedProperties.portColor = selectedCategory.color;
                        }
                    }
                }
                return {...f, properties: updatedProperties};
            }
            return f;
        }));
    };

    const saveEdit = () => {
        if (oEditingCell.featureId && oEditingCell.attrName) {
            updateFeatureProperties(oEditingCell.featureId, oEditingCell.attrName, sEditValue);
        }
        setEditingCell({featureId: null, attrName: null});
    };

    const handleDropdownChange = (e, featureId, attrName) => {
        const newValue = e.target.value;
        setEditValue(newValue);
        updateFeatureProperties(featureId, attrName, newValue);
        setEditingCell({featureId: null, attrName: null});

        setSelectedFeatureId(null);
        setTimeout(() => setSelectedFeatureId(featureId), 10);
    };


    const handleEditKeyDown = (e) => {
        if (e.key === 'Enter') saveEdit();
        if (e.key === 'Escape') setEditingCell({featureId: null, attrName: null});
    };

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
        <>
            <AppNotification
                show={oNotification.show}
                message={oNotification.message}
                type={oNotification.type}
                onClose={() => setNotification(prev => ({...prev, show: false}))}
            />
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
                        <AppButton fnOnClick={() => oNavigate('/add-eo', { state: { projectId: sProjectId } })} sVariant="primary"
                                   oStyle={{width: '100%', fontSize: '12px', marginBottom: '10px'}}>+ Add
                            Image</AppButton>
                        <AppButton fnOnClick={() => oNavigate('/image-styling')} sVariant="secondary"
                                   oStyle={{width: '100%', fontSize: '12px'}}>Image Style</AppButton>
                    </div>
                    <div style={{flex: 1, overflowY: 'auto', padding: '10px'}}>
                        {aoImages.map(img => {
                            const bIsSelected = iSelectedImageId === img.id;
                            return (
                                <div
                                    key={img.id}
                                    onClick={() => {
                                        setISelectedImageId(img.id);
                                        if (img.bbox) {
                                            setMapZoomView(parseWKTBbox(img.bbox));
                                        }
                                    }}
                                    style={{
                                        padding: '10px',
                                        marginBottom: '8px',
                                        background: bIsSelected ? '#e6f7ff' : '#fff',
                                        border: bIsSelected ? '1px solid #1890ff' : '1px solid #ddd',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                >
                                    <div style={{display: 'flex', alignItems: 'center'}}>
                                        {renderThumbnail(img.name)}
                                        {/* Added flex: 1 here to push the target button to the right */}
                                        <div style={{marginLeft: '12px', overflow: 'hidden', flex: 1}}>
                                            <div style={{
                                                fontWeight: 'bold',
                                                fontSize: '13px',
                                                color: '#333',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>{img.name}</div>
                                            <div
                                                style={{
                                                    fontSize: '11px',
                                                    color: '#666',
                                                    marginTop: '3px'
                                                }}>{img.date}</div>
                                        </div>

                                        {/* --- NEW TARGET BUTTON --- */}
                                        <button
                                            disabled={!bIsSelected}
                                            title="Zoom to image"
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: bIsSelected ? 'pointer' : 'not-allowed',
                                                opacity: bIsSelected ? 1 : 0.3,
                                                transition: 'opacity 0.2s ease-in-out',
                                                fontSize: '18px',
                                                marginLeft: '5px'
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevents selecting the row
                                                if (img.bbox) {
                                                    // Spreading into a new array forces Mapbox to zoom even if clicked twice
                                                    setMapZoomView([...parseWKTBbox(img.bbox)]);
                                                } else {
                                                    showNotif("No bounding box available for this image.", "warning");
                                                }
                                            }}
                                        >
                                            🎯
                                        </button>
                                    </div>

                                    {bIsSelected && (
                                        <div style={{
                                            marginTop: '10px',
                                            paddingTop: '10px',
                                            borderTop: '1px dashed #ccc'
                                        }}
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
                                            id: oProject.id,
                                            name: sProjectTitle,
                                            description: oProject?.description || "",
                                            mission: oProject?.mission || "Sentinel-2",
                                            creationDate: oProject?.creationDate || "",
                                            labelTemplate: oProject?.labellingTemplate || "",
                                            isPublic: oProject?.isPublic || false,
                                            annotatorVisibility: oProject?.hasAnnotatorGlobalView ? 'all' : 'own'
                                        },
                                        hasLabelTemplate: !!oProject?.labellingTemplate
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
                                <AppButton
                                    sVariant="success"
                                    oStyle={{padding: '4px 12px', fontSize: '12px'}}
                                    fnOnClick={handleSaveLabels}
                                    disabled={bIsSavingLabels}
                                >
                                    {bIsSavingLabels ? "Saving..." : "💾 Save Labels"}
                                </AppButton>
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
                                <select value={sFilterCollab}
                                        onChange={(e) => setFilterCollab(e.target.value)} style={{
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
                            sActiveGeoTIFF={oSelectedImage ? oSelectedImage.id : null}
                            bEnableGeocoder={true}
                            bEnableDraw={true}
                            onDrawUpdate={handleDrawUpdate}
                            sSelectedFeatureId={sSelectedFeatureId}
                            onFeatureSelect={(id) => setSelectedFeatureId(id)}
                            aoFeatures={filteredLabels}
                            iImageOpacity={iImageOpacity / 100}
                            bHasPolygons={
                                oLabelTemplate?.geometryTypes?.some(t => t.toLowerCase().includes('polygon')) ?? true
                            }
                            bHasLines={
                                oLabelTemplate?.geometryTypes?.some(t => t.toLowerCase().includes('line')) ?? true
                            }

                            // --- UPDATED TO USE THE NEW ZOOM STATE ---
                            oZoomToBBox={aoMapZoomView}

                            sCurrentDrawColor={sDrawingColor}
                            sInitialMapStyle="mapbox://styles/mapbox/satellite-v9"
                            bPreventSelfIntersection={true}
                        />
                    </div>

                    {/* TABLE */}
                    <div style={{
                        height: '200px',
                        borderTop: '1px solid #ddd',
                        background: '#fff',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{
                            padding: '8px 15px',
                            background: '#fafafa',
                            borderBottom: '1px solid #eee',
                            fontWeight: 'bold',
                            fontSize: '13px'
                        }}>
                            Feature Attributes ({oLabelTemplate?.name || "Loading..."})
                        </div>

                        <div style={{overflow: 'auto', flex: 1}}>
                            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
                                <thead style={{position: 'sticky', top: 0, background: 'white', zIndex: 10}}>
                                <tr style={{textAlign: 'left', color: '#666'}}>
                                    <th style={thStyle}>Color</th>

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
                                            <div style={{
                                                width: '15px',
                                                height: '15px',
                                                borderRadius: '50%',
                                                background: feature.properties.portColor
                                            }}></div>
                                        </td>

                                        {oLabelTemplate?.attributes?.map(attr => {
                                            const bIsEditing = oEditingCell.featureId === feature.id && oEditingCell.attrName === attr.name;

                                            return (
                                                <td
                                                    key={attr.name}
                                                    style={{...tdStyle, cursor: bIsEditing ? 'default' : 'text'}}
                                                    title={bIsEditing ? "" : "Click to edit"}
                                                    onClick={(e) => {
                                                        if (!bIsEditing) startEditing(feature.id, attr.name, feature.properties[attr.name], e);
                                                    }}
                                                >
                                                    {bIsEditing ? (
                                                        attr.type === "category" && attr.categoryValues ? (
                                                            <select
                                                                autoFocus
                                                                value={sEditValue}
                                                                onChange={(e) => handleDropdownChange(e, feature.id, attr.name)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                style={editInputStyle}
                                                            >
                                                                <option value="" disabled={!attr.isOptional}>-- Select
                                                                    --
                                                                </option>
                                                                {attr.categoryValues.map(cat => (
                                                                    <option key={cat.value} value={cat.value}>
                                                                        {cat.value}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input
                                                                type={attr.type === 'float' || attr.type === 'integer' ? 'number' : 'text'}
                                                                step={attr.type === 'float' ? 'any' : '1'}
                                                                autoFocus
                                                                value={sEditValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                onBlur={saveEdit}
                                                                onKeyDown={handleEditKeyDown}
                                                                onClick={(e) => e.stopPropagation()}
                                                                placeholder={attr.isOptional ? "Optional" : "Required"}
                                                                style={{
                                                                    ...editInputStyle,
                                                                    border: (!attr.isOptional && !sEditValue) ? '2px solid red' : '2px solid #1890ff'
                                                                }}
                                                            />
                                                        )
                                                    ) : (
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between'
                                                        }}>
                                                        <span style={{
                                                            color: (!feature.properties[attr.name] && !attr.isOptional) ? 'red' : 'inherit',
                                                            fontStyle: !feature.properties[attr.name] ? 'italic' : 'normal'
                                                        }}>
                                                            {feature.properties[attr.name] || (attr.isOptional ? "N/A" : "Missing!")}
                                                        </span>
                                                            <span style={{color: '#ccc', fontSize: '12px'}}>✎</span>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}

                                        <td style={tdStyle}>{feature.properties.measurement}</td>
                                        <td style={tdStyle}>{feature.properties.annotator}</td>
                                        <td style={tdStyle}>
                                            <button
                                                style={{
                                                    color: '#f30909',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold',
                                                    fontSize: '14px'
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteFeature(feature.id);
                                                }}
                                            >
                                                ❌
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

const thStyle = {padding: '10px 15px', borderBottom: '1px solid #eee'};
const tdStyle = {padding: '10px 15px'};
const editInputStyle = {
    width: '100%', padding: '4px', boxSizing: 'border-box',
    border: '2px solid #1890ff', borderRadius: '4px', outline: 'none'
};
export default EditProject;
