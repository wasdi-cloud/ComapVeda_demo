import React, {useEffect, useState, useContext, useCallback} from 'react';
import * as turf from '@turf/turf';
import {useLocation, useNavigate} from 'react-router-dom';
import AppButton from "../components/app-button";
import MapboxMap from "../components/MapboxMap";
import {getProject, getCollaborators} from "../services/project-service";
import {getLabelTemplateById} from "../services/labelling-template-service";
import {getLabelsByImage, syncLabels} from "../services/labels-service";
import {getProjectImages} from "../services/images-service";
import AppNotification from "../dialogues/app-notifications";
import {useNotifications} from "../contexts/NotificationContext";

import { getUser } from '../services/session';
import { useProject } from '../contexts/ProjectContext';

const EditProject = () => {
    const oNavigate = useNavigate();
    const oLocation = useLocation();
    const sProjectTitle = oLocation.state?.projectTitle || "High-Res Flood Analysis";
    const sProjectId = oLocation.state?.projectId || null;

    const oUser = getUser();
    const sCurrentUser = oUser?.email || "Unknown User";

    const { isImporting } = useProject();

    const [oNotification, setNotification] = useState({show: false, message: '', type: 'info'});
    const { notifications } = useNotifications();

    const [aoImages, setAoImages] = useState([]);
    const [aoCollaborators, setAoCollaborators] = useState([{id: 'all', name: 'All Annotators'}]);

    const [aoFeatures, setAoFeatures] = useState([]);
    const [iSelectedImageId, setISelectedImageId] = useState(null);

    const [oProject, setProject] = useState(null);
    const [oProjectBBox, setProjectBBox] = useState(null);
    const [oLabelTemplate, setLabelTemplate] = useState(null);
    const [iImageOpacity, setImageOpacity] = useState(100);
    const [sStyleBy, setStyleBy] = useState('label');
    const [sFilterCollab, setFilterCollab] = useState('all');
    const [bShowValidatedOnly, setShowValidatedOnly] = useState(false);
    const [sSelectedFeatureId, setSelectedFeatureId] = useState(null);

    const [oImagePropertiesModal, setImagePropertiesModal] = useState(null);

    const [sDrawingColor, setDrawingColor] = useState("#3b82f6");

    const [aoMapZoomView, setMapZoomView] = useState(null);

    const [oEditingCell, setEditingCell] = useState({featureId: null, attrName: null});
    const [sEditValue, setEditValue] = useState("");

    const oSelectedImage = aoImages.find(img => img.id === iSelectedImageId);

    const [bIsSavingLabels, setIsSavingLabels] = useState(false);


    // Catch the style coming back from the styling page
    const incomingStyle = oLocation.state?.appliedStyle || null;

    // Create a state to hold styles for our images (in case they style multiple images)
    // It will look like: { "image-id-123": { renderType: 'multi', bands: {...} } }
    const [oImageStyles, setImageStyles] = useState({});

    // If we just came back from the styling page with a new style, save it!
    useEffect(() => {
        // Did we just come back from the Image Styling page?
        if (oLocation.state?.restoreImageId || oLocation.state?.restoreStyles) {

            // 1. Restore the memory of all styled images
            if (oLocation.state.restoreStyles) {
                setImageStyles(oLocation.state.restoreStyles);
            }

            // 2. Re-select the exact image we were just working on
            if (oLocation.state.restoreImageId) {
                setISelectedImageId(oLocation.state.restoreImageId);
            }

            // 3. Zoom the map directly to that specific image!
            if (oLocation.state.restoreBBox) {
                setMapZoomView([...parseWKTBbox(oLocation.state.restoreBBox)]); // <-- Added [...]
            }

            // 4. Wipe the history so if the user hits "Refresh(F5)", it doesn't run this again
            const cleanedState = { ...oLocation.state };
            delete cleanedState.restoreStyles;
            delete cleanedState.restoreImageId;
            delete cleanedState.restoreBBox;
            window.history.replaceState(cleanedState, document.title);
        }
    }, [oLocation.state]);

    useEffect(() => {
        if (oLabelTemplate) {
            if (oLabelTemplate.isSingleColorStyle && oLabelTemplate.featureColor) {
                setDrawingColor(oLabelTemplate.featureColor);
            } else if (!oLabelTemplate.isSingleColorStyle && oLabelTemplate.colourAttributeName) {
                const colorAttr = oLabelTemplate.attributes?.find(a => a.name === oLabelTemplate.colourAttributeName);
                if (colorAttr && colorAttr.categoryValues && colorAttr.categoryValues.length > 0) {
                    setDrawingColor(colorAttr.categoryValues[0].color);
                }
            }
        }
    }, [oLabelTemplate]);

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

    const handleSaveLabels = async () => {
        if (!iSelectedImageId) return;

        if (oLabelTemplate && oLabelTemplate.attributes) {
            const requiredAttrs = oLabelTemplate.attributes.filter(a => !a.isOptional);

            for (const feature of aoFeatures) {
                for (const attr of requiredAttrs) {
                    const val = feature.properties[attr.name];

                    if (val === "" || val === null || val === undefined) {
                        let sNotifMessage = `🛑 Cannot save! The field '${attr.name}' is required. Please check your attribute table and fill in the missing values.`;
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
            showNotif("Labels saved to database successfully! 💾", "success");
        } catch (error) {
            showNotif("Failed to save labels", "error");
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

            return [
                Math.min(...xValues),
                Math.min(...yValues),
                Math.max(...xValues),
                Math.max(...yValues)
            ];
        } catch (e) {
            console.error("Failed to parse BBOX:", e);
            return null;
        }
    };

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
        const loadProjectAndCollabs = async () => {
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

                        // --- FIX: THE RACE CONDITION SHIELD ---
                        // Only set the map zoom to the Project BBox if
                        // the Image Restorer hasn't already set a zoom view!
                        setMapZoomView(prev => prev || parsedBox);
                    }

                    await loadImages();
                }

                const collabData = await getCollaborators(sProjectId);
                if (collabData && collabData.length > 0) {
                    const formattedCollabs = collabData.map(c => ({
                        id: c.userEmail,
                        name: c.userEmail
                    }));
                    setAoCollaborators([{id: 'all', name: 'All Annotators'}, ...formattedCollabs]);
                }

            } catch (error) {
                console.log("Error loading project data or collabs:", error);
            }
        }

        loadProjectAndCollabs();
    }, [sProjectId, oNavigate, loadImages]);

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
                    let assignedColor = sDrawingColor;

                    if (oLabelTemplate && oLabelTemplate.attributes) {
                        if (oLabelTemplate.isSingleColorStyle && oLabelTemplate.featureColor) {
                            assignedColor = oLabelTemplate.featureColor;
                        }

                        oLabelTemplate.attributes.forEach(attr => {
                            dynamicProps[attr.name] = "";

                            if (!oLabelTemplate.isSingleColorStyle && oLabelTemplate.colourAttributeName === attr.name) {
                                if (attr.categoryValues && attr.categoryValues.length > 0) {
                                    dynamicProps[attr.name] = attr.categoryValues[0].value;
                                    assignedColor = attr.categoryValues[0].color;
                                }
                            }
                        });
                    }

                    return {
                        ...feature,
                        properties: {
                            ...feature.properties,
                            id: feature.id,
                            annotator: sCurrentUser,
                            status: "Pending",
                            timestamp: new Date().toISOString(),
                            measurement: sMeasurement,
                            portColor: assignedColor,
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

    // --- BULLETPROOF COPY HANDLER ---
    const copyToClipboard = (e, text) => {
        if (e) e.stopPropagation();

        // 1. Try modern clipboard API (only works on https or localhost)
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text);
            showNotif("Copied to clipboard! 📋", "success");
        } else {
            // 2. Fallback for custom IPs and HTTP
            const textArea = document.createElement("textarea");
            textArea.value = text;
            // Prevent scrolling to the bottom of the page
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                document.execCommand('copy');
                showNotif("Copied to clipboard! 📋", "success");
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
                showNotif("Failed to copy", "error");
            }

            document.body.removeChild(textArea);
        }
    };

    return (
        <>
            <AppNotification
                show={oNotification.show}
                message={oNotification.message}
                type={oNotification.type}
                onClose={() => setNotification(prev => ({...prev, show: false}))}
            />

            {/* --- PROPERTIES MODAL --- */}
            {oImagePropertiesModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        background: 'white', padding: '20px', borderRadius: '8px',
                        width: '500px', maxWidth: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0 }}>Image Properties</h3>
                            <button onClick={() => setImagePropertiesModal(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#999' }}>✖</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: '#444' }}>

                            {/* --- THE NEW COPY BUTTON IS HERE --- */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <strong>Name:</strong>
                                <span style={{ wordBreak: 'break-all' }}>{oImagePropertiesModal.name}</span>
                                <button
                                    title="Copy image name"
                                    onClick={(e) => copyToClipboard(e, oImagePropertiesModal.name)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '0', marginTop: '-2px' }}
                                >
                                    📋
                                </button>
                            </div>

                            <div><strong>Date Added:</strong> {oImagePropertiesModal.date}</div>
                            <div><strong>ID:</strong> <span style={{ fontFamily: 'monospace', color: '#666' }}>{oImagePropertiesModal.id}</span></div>
                            <div><strong>Relative Path:</strong> <span style={{ fontFamily: 'monospace', wordBreak: 'break-all', color: '#666' }}>{oImagePropertiesModal.relative_path}</span></div>
                            <div><strong>Annotator System:</strong> {oImagePropertiesModal.annotator || "System"}</div>
                            <div>
                                <strong>Bounding Box (WKT):</strong>
                                <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', marginTop: '4px', fontSize: '12px', fontFamily: 'monospace', maxHeight: '80px', overflowY: 'auto' }}>
                                    {oImagePropertiesModal.bbox || "None"}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <AppButton sVariant="primary" fnOnClick={() => setImagePropertiesModal(null)}>Close</AppButton>
                        </div>
                    </div>
                </div>
            )}

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
                    width: '350px',
                    height: '100%',
                    borderRight: '1px solid #ccc',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#f9f9f9',
                    flexShrink: 0
                }}>
                    <div style={{padding: '15px', borderBottom: '1px solid #ddd', background: 'white'}}>
                        <h3 style={{margin: '0 0 10px 0', fontSize: '16px'}}>Images ({aoImages.length})</h3>

                        {isImporting && (
                            <div style={{
                                background: '#e6f7ff',
                                border: '1px solid #91d5ff',
                                borderRadius: '4px',
                                padding: '8px',
                                marginBottom: '10px',
                                fontSize: '12px',
                                color: '#0050b3',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: 'bold'
                            }}>
                                <span>⏳</span>
                                <span>Downloading & Converting...</span>
                            </div>
                        )}

                        <AppButton fnOnClick={() => oNavigate('/add-eo', { state: { projectId: sProjectId } })} sVariant="primary"
                                   oStyle={{width: '100%', fontSize: '12px', marginBottom: '10px'}}>+ Add
                            Image</AppButton>
                        <AppButton
                            disabled={!iSelectedImageId}
                            title={!iSelectedImageId ? "Select an image first to style it" : "Style this image"}
                            fnOnClick={() => {
                                if (!iSelectedImageId) {
                                    showNotif("Please select an image from the list first!", "warning");
                                    return;
                                }
                                oNavigate('/image-styling', {
                                    state: {
                                        projectId: sProjectId,
                                        projectTitle: sProjectTitle,
                                        imageId: iSelectedImageId,
                                        imageName: oSelectedImage?.name,
                                        // --- NEW: Pass these so we don't lose them! ---
                                        imageBBox: oSelectedImage?.bbox,
                                        currentStyles: oImageStyles
                                    }
                                });
                            }}
                            sVariant={iSelectedImageId ? "secondary" : "outline"}
                            oStyle={{width: '100%', fontSize: '12px'}}
                        >
                            ✨ Image Style
                        </AppButton>
                    </div>
                    <div style={{flex: 1, overflowY: 'auto', padding: '10px'}}>
                        {aoImages.map(img => {
                            const bIsSelected = iSelectedImageId === img.id;
                            return (
                                <div
                                    key={img.id}
                                    onClick={() => {
                                        if (iSelectedImageId === img.id) {
                                            setISelectedImageId(null); // Unselect
                                        } else {
                                            setISelectedImageId(img.id); // Select
                                            if (img.bbox) {
                                                setMapZoomView(parseWKTBbox(img.bbox));
                                            }
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
                                        <div style={{marginLeft: '12px', overflow: 'hidden', flex: 1}}>

                                            {/* Removed the copy button from here, left the clean text */}
                                            <div style={{
                                                fontWeight: 'bold',
                                                fontSize: '13px',
                                                color: '#333',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {img.name}
                                            </div>

                                            <div
                                                style={{
                                                    fontSize: '11px',
                                                    color: '#666',
                                                    marginTop: '3px'
                                                }}>{img.date}</div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '2px' }}>
                                            <button
                                                title="View Image Properties"
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: '16px',
                                                    opacity: 0.7,
                                                    transition: 'opacity 0.2s',
                                                }}
                                                onMouseOver={e => e.currentTarget.style.opacity = 1}
                                                onMouseOut={e => e.currentTarget.style.opacity = 0.7}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setImagePropertiesModal(img);
                                                }}
                                            >
                                                📑
                                            </button>

                                            <button
                                                disabled={!bIsSelected}
                                                title="Zoom to image"
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: bIsSelected ? 'pointer' : 'not-allowed',
                                                    opacity: bIsSelected ? 1 : 0.3,
                                                    transition: 'opacity 0.2s ease-in-out',
                                                    fontSize: '16px',
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (img.bbox) {
                                                        setMapZoomView([...parseWKTBbox(img.bbox)]);
                                                    } else {
                                                        showNotif("No bounding box available for this image.", "warning");
                                                    }
                                                }}
                                            >
                                                🎯
                                            </button>
                                        </div>
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
                            }}>
                                Current User: {sCurrentUser} | Template: {oLabelTemplate?.name}
                            </span>
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
                            <AppButton
                                fnOnClick={() => oNavigate('/project-collabs', { state: { projectId: sProjectId } })}
                                sVariant="outline"
                                oStyle={{fontSize: '13px', padding: '6px 12px'}}>
                                👥 Collaborators
                            </AppButton>
                            <AppButton
                                fnOnClick={() => oNavigate('/export-project', {
                                    state: {
                                        projectId: sProjectId,
                                        projectTitle: sProjectTitle,
                                        // Pass real DB flags if you have them, otherwise fallback to true for testing
                                        bRawDataHosted: true,
                                        bReviewMode: true
                                    }
                                })}
                                sVariant="primary"
                                oStyle={{fontSize: '13px', padding: '6px 12px'}}
                            >
                                📥 Export Project
                            </AppButton>
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
                                    {aoCollaborators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                            sActiveGeoTIFF={oSelectedImage ? oSelectedImage.relative_path : null}
                            oActiveStyle={oSelectedImage ? oImageStyles[oSelectedImage.id] : null}
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
                            oZoomToBBox={aoMapZoomView}
                            sCurrentDrawColor={sDrawingColor}
                            sInitialMapStyle="mapbox://styles/mapbox/satellite-v9"
                            bPreventSelfIntersection={oLabelTemplate ? !oLabelTemplate.isSelfIntersectAllowed : false}
                            bPreventPolygonIntersection={oLabelTemplate ? !oLabelTemplate.isPolygonsIntersectAllowed : false}
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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <button
                                                    title="Save Label"
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: bIsSavingLabels ? 'not-allowed' : 'pointer',
                                                        fontSize: '14px',
                                                        opacity: bIsSavingLabels ? 0.5 : 1
                                                    }}
                                                    disabled={bIsSavingLabels}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSaveLabels();
                                                    }}
                                                >
                                                    💾
                                                </button>
                                                <button
                                                    title="Delete Label"
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
                                            </div>
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
