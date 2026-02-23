import React, {useEffect, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';

// COMPONENTS
import AppCard from '../components/app-card';
import AppTextInput from '../components/app-text-input';
import AppTextArea from '../components/app-text-area';
import AppSelect from '../components/app-dropdown-input';
import AppCheckbox from '../components/app-checkbox';
import AppRadioButton from '../components/app-radiobutton';
import AppButton from '../components/app-button';

import {createTemplate, getLabelTemplateById, updateLabelTemplate} from "../services/labelling-template-service";

const ColorInputGroup = ({value, onChange, disabled}) => {
    const isValidHex = (hex) => /^#[0-9A-F]{6}$/i.test(hex);
    return (
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            <input
                type="color"
                value={isValidHex(value) ? value : "#000000"}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                style={{
                    width: '40px',
                    height: '38px',
                    padding: 0,
                    border: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    background: 'none',
                    opacity: disabled ? 0.6 : 1
                }}
            />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                maxLength={7}
                placeholder="#000000"
                style={{
                    width: '80px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc',
                    fontSize: '13px', textTransform: 'uppercase', fontFamily: 'monospace',
                    background: disabled ? '#f5f5f5' : 'white'
                }}
            />
        </div>
    );
};

const NewLabelTemplate = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // --- NEW: ROUTER STATE ---
    const sTemplateId = location.state?.templateId || null;
    const sMode = location.state?.mode || 'create'; // 'create', 'edit', or 'view'
    const bIsViewMode = sMode === 'view';

    // --- 1. MAIN TEMPLATE STATE ---
    const [sName, setSName] = useState("");
    const [sDescription, setSDescription] = useState("");
    const [oGeometries, setOGeometries] = useState({polygon: true, polyline: false, point: false});

    // --- 2. ATTRIBUTE BUILDER STATE ---
    const [aoAttributes, setAoAttributes] = useState([]);
    const [sNewAttrName, setSNewAttrName] = useState("");
    const [sNewAttrType, setSNewAttrType] = useState("String");
    const [bNewAttrMandatory, setBNewAttrMandatory] = useState(false);
    const [sNewAttrCategories, setSNewAttrCategories] = useState("");
    const [iEditingId, setEditingId] = useState(null);

    // --- 3. STYLE STATE ---
    const [sStyleType, setSStyleType] = useState("single");
    const [sSingleColor, setSSingleColor] = useState("#FF0000");
    const [sSelectedCategoryAttr, setSSelectedCategoryAttr] = useState("");
    const [oCategoryColors, setOCategoryColors] = useState({});

    // --- NEW: LOAD EXISTING DATA ---
    useEffect(() => {
        const loadExistingTemplate = async () => {
            if (!sTemplateId) return;

            try {
                // Fetch the template from your backend
                const data = await getLabelTemplateById(sTemplateId);

                if (data) {
                    setSName(data.name);
                    setSDescription(data.description || "");

                    // Map Geometries (Handling both List format and Boolean format depending on your API)
                    setOGeometries({
                        polygon: data.geometryTypes?.includes('polygon'),
                        polyline: data.geometryTypes?.includes('polyline'),
                        point: data.geometryTypes?.includes('point')
                    });

                    // Map Attributes & Colors backwards
                    const loadedAttributes = [];
                    const loadedColors = {};

                    (data.attributes || []).forEach((attr, idx) => {
                        let options = [];
                        if (attr.type.toLowerCase() === 'category' && attr.categoryValues) {
                            options = attr.categoryValues.map(cv => cv.value);
                            attr.categoryValues.forEach(cv => {
                                loadedColors[cv.value] = cv.color;
                            });
                        }
                        loadedAttributes.push({
                            id: idx, // Assign temp ID for UI editing
                            name: attr.name,
                            type: attr.type.charAt(0).toUpperCase() + attr.type.slice(1).toLowerCase(), // "String"
                            mandatory: !attr.isOptional,
                            options: options
                        });
                    });

                    setAoAttributes(loadedAttributes);
                    setOCategoryColors(loadedColors);

                    // Map Style
                    setSStyleType(data.isSingleColorStyle ? 'single' : 'category');
                    setSSingleColor(data.featureColor || '#FF0000');
                    setSSelectedCategoryAttr(data.colourAttributeName || "");
                }
            } catch (error) {
                console.error("Failed to load template data", error);
            }
        };

        loadExistingTemplate();
    }, [sTemplateId]);


    // --- HANDLERS (Unchanged, just added View Mode guards) ---
    const handleSaveAttribute = () => {
        if (!sNewAttrName) return alert("Please enter an attribute name");
        let aoOptions = [];
        if (sNewAttrType === "Category") {
            aoOptions = sNewAttrCategories.split(',').map(s => s.trim()).filter(s => s !== "");
            if (aoOptions.length === 0) return alert("Please enter category values");
        }
        const oAttributeData = {
            id: iEditingId || Date.now(),
            name: sNewAttrName,
            type: sNewAttrType,
            mandatory: bNewAttrMandatory,
            options: aoOptions
        };

        if (iEditingId) {
            setAoAttributes(aoAttributes.map(a => a.id === iEditingId ? oAttributeData : a));
            setEditingId(null);
        } else {
            setAoAttributes([...aoAttributes, oAttributeData]);
        }
        setSNewAttrName("");
        setSNewAttrType("String");
        setBNewAttrMandatory(false);
        setSNewAttrCategories("");
    };

    const handleEditAttribute = (attr) => {
        setSNewAttrName(attr.name);
        setSNewAttrType(attr.type);
        setBNewAttrMandatory(attr.mandatory);
        setSNewAttrCategories(attr.options ? attr.options.join(', ') : "");
        setEditingId(attr.id);
    };

    const handleRemoveAttribute = (id) => {
        if (window.confirm("Delete this attribute?")) setAoAttributes(aoAttributes.filter(a => a.id !== id));
    };

    const handleCategoryColorChange = (sCategoryValue, sColor) => {
        setOCategoryColors(prev => ({...prev, [sCategoryValue]: sColor}));
    };

    const handleSaveTemplate = async () => {
        const aoGeometryTypes = [];
        if (oGeometries.polygon) aoGeometryTypes.push("polygon");
        if (oGeometries.polyline) aoGeometryTypes.push("polyline");
        if (oGeometries.point) aoGeometryTypes.push("point");

        if (aoGeometryTypes.length === 0) return alert("Please select at least one geometry type.");

        const formattedAttributes = aoAttributes.map(attr => {
            let categoryValuesList = null;
            if (attr.type === "Category" && attr.options) {
                categoryValuesList = attr.options.map(optValue => ({
                    value: optValue,
                    color: oCategoryColors[optValue] || "#000000"
                }));
            }
            return {
                name: attr.name,
                type: attr.type.toLowerCase(),
                isOptional: !attr.mandatory,
                categoryValues: categoryValuesList
            };
        });

        const oPayload = {
            name: sName,
            creator: "jihed-admin",
            description: sDescription,
            geometryTypes: aoGeometryTypes,
            attributes: formattedAttributes,
            isSingleColorStyle: sStyleType === 'single',
            featureColor: sStyleType === 'single' ? sSingleColor : null,
            colourAttributeName: sStyleType === 'category' ? sSelectedCategoryAttr : null,
            creationDate: Date.now() / 1000
        };

        try {
            // --- NEW: Handle Edit vs Create ---
            if (sMode === 'edit') {
                await updateLabelTemplate(sTemplateId, oPayload);
                alert("Template Updated Successfully!");
            } else {
                await createTemplate(oPayload);
                alert("Template Saved Successfully!");
            }
            navigate('/label-templates');
        } catch (error) {
            alert("Error: " + (error.message || "Unknown error"));
        }
    };

    // Helper Title
    const pageTitle = sMode === 'view' ? '🔍 View Template' : sMode === 'edit' ? '✏️ Edit Template' : '🎨 New Label Template';

    return (
        <div style={{
            padding: '30px',
            background: '#f4f6f8',
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center'
        }}>
            <div style={{width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '20px'}}>

                <div style={{marginBottom: '10px'}}>
                    <h2 style={{margin: 0, color: '#333'}}>{pageTitle}</h2>
                    <p style={{
                        margin: '5px 0 0 0',
                        color: '#666'
                    }}>{bIsViewMode ? 'Read-only view of schema.' : 'Define schema and styles for your features.'}</p>
                </div>

                {/* 1. GENERAL INFO */}
                <AppCard>
                    <h3 style={headerStyle}>1. General Information</h3>
                    <AppTextInput disabled={bIsViewMode} sLabel="Template Name" sPlaceholder="e.g., Land Use Classes"
                                  sValue={sName} fnOnChange={(e) => setSName(e.target.value)}/>
                    <div style={{marginTop: '15px'}}>
                        <AppTextArea disabled={bIsViewMode} sPlaceholder="Description..." sValue={sDescription}
                                     fnOnChange={(e) => setSDescription(e.target.value)}/>
                    </div>
                    <div style={{marginTop: '15px'}}>
                        <label style={subLabelStyle}>Geometry Types</label>
                        <div style={{display: 'flex', gap: '20px', marginTop: '10px'}}>
                            <AppCheckbox disabled={bIsViewMode} sLabel="Polygon" bChecked={oGeometries.polygon}
                                         fnOnChange={(e) => setOGeometries({
                                             ...oGeometries,
                                             polygon: e.target.checked
                                         })}/>
                            <AppCheckbox disabled={bIsViewMode} sLabel="Polyline" bChecked={oGeometries.polyline}
                                         fnOnChange={(e) => setOGeometries({
                                             ...oGeometries,
                                             polyline: e.target.checked
                                         })}/>
                            <AppCheckbox disabled={bIsViewMode} sLabel="Point" bChecked={oGeometries.point}
                                         fnOnChange={(e) => setOGeometries({...oGeometries, point: e.target.checked})}/>
                        </div>
                    </div>
                </AppCard>

                {/* 2. ATTRIBUTES BUILDER */}
                <AppCard>
                    <h3 style={headerStyle}>2. Attributes Schema</h3>

                    {/* ONLY SHOW ADD/EDIT BLOCK IF NOT IN VIEW MODE */}
                    {!bIsViewMode && (
                        <div style={{
                            background: '#f9f9f9',
                            padding: '15px',
                            borderRadius: '6px',
                            border: iEditingId ? '1px solid #1890ff' : '1px solid #eee',
                            marginBottom: '20px'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '10px'
                            }}>
                                <label
                                    style={{...subLabelStyle}}>{iEditingId ? "✏️ Edit Attribute" : "➕ Add New Attribute"}</label>
                                {iEditingId && (
                                    <button onClick={() => {
                                        setEditingId(null);
                                        setSNewAttrName("");
                                        setSNewAttrCategories("");
                                    }} style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#666',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}>Cancel Edit</button>
                                )}
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1.5fr 1fr',
                                gap: '15px',
                                alignItems: 'end'
                            }}>
                                <AppTextInput sPlaceholder="Name (e.g. Type)" sValue={sNewAttrName}
                                              fnOnChange={(e) => setSNewAttrName(e.target.value)}/>
                                <AppSelect aoOptions={["String", "Integer", "Float", "Category"]} sValue={sNewAttrType}
                                           fnOnChange={(e) => setSNewAttrType(e.target.value)}/>
                                <AppCheckbox sLabel="Mandatory?" bChecked={bNewAttrMandatory}
                                             fnOnChange={(e) => setBNewAttrMandatory(e.target.checked)}/>
                            </div>
                            {sNewAttrType === 'Category' && (
                                <div style={{marginTop: '15px'}}>
                                    <label style={{fontSize: '12px', color: '#666'}}>Values (comma separated)</label>
                                    <AppTextInput sPlaceholder="Res, Com, Ind..." sValue={sNewAttrCategories}
                                                  fnOnChange={(e) => setSNewAttrCategories(e.target.value)}/>
                                </div>
                            )}
                            <div style={{marginTop: '15px', display: 'flex', justifyContent: 'flex-end'}}>
                                <AppButton sVariant={iEditingId ? "warning" : "primary"} fnOnClick={handleSaveAttribute}
                                           oStyle={{padding: '8px 15px', fontSize: '13px'}}>
                                    {iEditingId ? "Update Attribute" : "+ Add to Table"}
                                </AppButton>
                            </div>
                        </div>
                    )}

                    {/* TABLE */}
                    {aoAttributes.length > 0 ? (
                        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
                            <thead style={{background: '#eee'}}>
                            <tr style={{textAlign: 'left'}}>
                                <th style={{padding: '10px'}}>Name</th>
                                <th style={{padding: '10px'}}>Type</th>
                                <th style={{padding: '10px'}}>Config</th>
                                {!bIsViewMode && <th style={{padding: '10px', textAlign: 'right'}}>Action</th>}
                            </tr>
                            </thead>
                            <tbody>
                            {aoAttributes.map(attr => (
                                <tr key={attr.id} style={{
                                    borderBottom: '1px solid #eee',
                                    background: iEditingId === attr.id ? '#e6f7ff' : 'transparent'
                                }}>
                                    <td style={{padding: '10px', fontWeight: 'bold'}}>{attr.name}</td>
                                    <td style={{padding: '10px'}}>{attr.type}</td>
                                    <td style={{padding: '10px'}}>
                                        {attr.mandatory && <span style={{
                                            color: 'red',
                                            fontSize: '11px',
                                            marginRight: '5px'
                                        }}>Required</span>}
                                        {attr.type === 'Category' && <span style={{
                                            color: '#666',
                                            fontSize: '11px'
                                        }}>({attr.options.length} options)</span>}
                                    </td>
                                    {!bIsViewMode && (
                                        <td style={{padding: '10px', textAlign: 'right'}}>
                                            <button onClick={() => handleEditAttribute(attr)} style={{
                                                marginRight: '10px',
                                                border: 'none',
                                                background: 'transparent',
                                                color: '#1890ff',
                                                cursor: 'pointer',
                                                fontWeight: 'bold'
                                            }}>Edit
                                            </button>
                                            <button onClick={() => handleRemoveAttribute(attr.id)} style={{
                                                border: 'none',
                                                background: 'transparent',
                                                color: '#dc3545',
                                                cursor: 'pointer',
                                                fontWeight: 'bold'
                                            }}>Remove
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            padding: '20px',
                            color: '#999',
                            fontSize: '13px',
                            border: '1px dashed #ccc'
                        }}>No attributes yet.</div>
                    )}
                </AppCard>

                {/* 3. STYLE CONFIG */}
                <AppCard>
                    <h3 style={headerStyle}>3. Visual Style</h3>
                    <div style={{display: 'flex', gap: '30px', marginBottom: '20px'}}>
                        <AppRadioButton disabled={bIsViewMode} sName="styleType" sValue="single" sLabel="Single Color"
                                        bChecked={sStyleType === 'single'} fnOnChange={() => setSStyleType('single')}/>
                        <AppRadioButton disabled={bIsViewMode} sName="styleType" sValue="category"
                                        sLabel="Category Based" bChecked={sStyleType === 'category'}
                                        fnOnChange={() => setSStyleType('category')}/>
                    </div>

                    {sStyleType === 'single' ? (
                        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                            <label style={subLabelStyle}>Default Color:</label>
                            <ColorInputGroup disabled={bIsViewMode} value={sSingleColor} onChange={setSSingleColor}/>
                        </div>
                    ) : (
                        <div>
                            <label style={subLabelStyle}>Style based on Attribute:</label>
                            <AppSelect
                                disabled={bIsViewMode}
                                sValue={sSelectedCategoryAttr}
                                fnOnChange={(e) => setSSelectedCategoryAttr(e.target.value)}
                                aoOptions={[{
                                    value: "",
                                    label: "-- Select --"
                                }, ...aoAttributes.filter(a => a.type === 'Category').map(a => ({
                                    value: a.name,
                                    label: a.name
                                }))]}
                                oStyle={{width: '100%', marginTop: '5px', marginBottom: '15px'}}
                            />

                            {sSelectedCategoryAttr && (
                                <div style={{
                                    background: '#f9f9f9',
                                    padding: '15px',
                                    borderRadius: '6px',
                                    border: '1px solid #eee'
                                }}>
                                    <label style={{
                                        ...subLabelStyle,
                                        marginBottom: '10px',
                                        display: 'block'
                                    }}>Legend</label>
                                    {aoAttributes.find(a => a.name === sSelectedCategoryAttr)?.options.map(opt => (
                                        <div key={opt} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: '10px',
                                            paddingBottom: '10px',
                                            borderBottom: '1px solid #eee'
                                        }}>
                                            <span style={{fontSize: '14px'}}>{opt}</span>
                                            <ColorInputGroup
                                                disabled={bIsViewMode}
                                                value={oCategoryColors[opt] || "#000000"}
                                                onChange={(val) => handleCategoryColorChange(opt, val)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </AppCard>

                {/* FOOTER */}
                <div style={{display: 'flex', justifyContent: 'flex-end', gap: '15px'}}>
                    <AppButton sVariant="outline" fnOnClick={() => navigate('/label-templates')}>
                        {bIsViewMode ? 'Go Back' : 'Cancel'}
                    </AppButton>
                    {!bIsViewMode && (
                        <AppButton sVariant="success" fnOnClick={handleSaveTemplate}>
                            {sMode === 'edit' ? 'Update Template' : 'Save Template'}
                        </AppButton>
                    )}
                </div>
            </div>
        </div>
    );
};

const headerStyle = {
    margin: '0 0 15px 0',
    fontSize: '18px',
    color: '#444',
    borderBottom: '1px solid #eee',
    paddingBottom: '10px'
};
const subLabelStyle = {fontWeight: 'bold', fontSize: '13px', color: '#555'};

export default NewLabelTemplate;
