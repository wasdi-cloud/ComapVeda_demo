import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';

// COMPONENTS
import AppCard from '../components/app-card';
import AppTextInput from '../components/app-text-input';
import AppTextArea from '../components/app-text-area';
import AppSelect from '../components/app-dropdown-input';
import AppCheckbox from '../components/app-checkbox';
import AppRadioButton from '../components/app-radiobutton';
import AppButton from '../components/app-button';


// --- FIXED COMPONENT: Moved OUTSIDE the main function ---
const ColorInputGroup = ({ value, onChange }) => {

    // Helper to ensure the color picker always gets a valid 7-char hex
    // (Otherwise it ignores partial inputs like "#F" or "#FF")
    const isValidHex = (hex) => /^#[0-9A-F]{6}$/i.test(hex);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* 1. Visual Color Picker */}
            <input
                type="color"
                // Only pass valid hex to the picker, otherwise fallback to black (or keep previous)
                // This prevents warnings while typing
                value={isValidHex(value) ? value : "#000000"}
                onChange={(e) => onChange(e.target.value)}
                style={{ width: '40px', height: '38px', padding: 0, border: 'none', cursor: 'pointer', background: 'none' }}
            />

            {/* 2. Hex Text Input */}
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                maxLength={7}
                placeholder="#000000"
                style={{
                    width: '80px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc',
                    fontSize: '13px', textTransform: 'uppercase', fontFamily: 'monospace'
                }}
            />
        </div>
    );
};

const NewLabelTemplate = () => {
    const navigate = useNavigate();

    // --- 1. MAIN TEMPLATE STATE ---
    const [sName, setSName] = useState("");
    const [sDescription, setSDescription] = useState("");
    const [oGeometries, setOGeometries] = useState({
        polygon: true,
        polyline: false,
        point: false
    });

    // --- 2. ATTRIBUTE BUILDER STATE ---
    const [aoAttributes, setAoAttributes] = useState([]);
    const [sNewAttrName, setSNewAttrName] = useState("");
    const [sNewAttrType, setSNewAttrType] = useState("String");
    const [bNewAttrMandatory, setBNewAttrMandatory] = useState(false);
    const [sNewAttrCategories, setSNewAttrCategories] = useState("");

    // Edit Mode State
    const [iEditingId, setEditingId] = useState(null);

    // --- 3. STYLE STATE ---
    const [sStyleType, setSStyleType] = useState("single");
    const [sSingleColor, setSSingleColor] = useState("#FF0000"); // Valid Hex Start
    const [sSelectedCategoryAttr, setSSelectedCategoryAttr] = useState("");
    const [oCategoryColors, setOCategoryColors] = useState({});

    // --- HANDLERS ---

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

        // Reset
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
        if (window.confirm("Delete this attribute?")) {
            setAoAttributes(aoAttributes.filter(a => a.id !== id));
        }
    };

    const handleCategoryColorChange = (sCategoryValue, sColor) => {
        setOCategoryColors(prev => ({ ...prev, [sCategoryValue]: sColor }));
    };

    const handleSaveTemplate = () => {
        const oPayload = {
            name: sName,
            description: sDescription,
            geometries: oGeometries,
            attributes: aoAttributes,
            style: {
                type: sStyleType,
                singleColor: sSingleColor,
                categoryAttr: sSelectedCategoryAttr,
                categoryColors: oCategoryColors
            }
        };
        console.log("Saving:", oPayload);
        alert("Template Saved!");
        navigate('/label-templates');
    };

    return (
        <div style={{ padding: '30px', background: '#f4f6f8', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* HEADER */}
                <div style={{ marginBottom: '10px' }}>
                    <h2 style={{ margin: 0, color: '#333' }}>🎨 New Label Template</h2>
                    <p style={{ margin: '5px 0 0 0', color: '#666' }}>Define schema and styles for your features.</p>
                </div>

                {/* 1. GENERAL INFO */}
                <AppCard>
                    <h3 style={headerStyle}>1. General Information</h3>
                    <AppTextInput sLabel="Template Name" sPlaceholder="e.g., Land Use Classes" sValue={sName} fnOnChange={(e) => setSName(e.target.value)} />
                    <div style={{ marginTop: '15px' }}>
                        <AppTextArea sPlaceholder="Description..." sValue={sDescription} fnOnChange={(e) => setSDescription(e.target.value)} />
                    </div>
                    <div style={{ marginTop: '15px' }}>
                        <label style={subLabelStyle}>Geometry Types</label>
                        <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                            <AppCheckbox sLabel="Polygon" bChecked={oGeometries.polygon} fnOnChange={(e) => setOGeometries({ ...oGeometries, polygon: e.target.checked })} />
                            <AppCheckbox sLabel="Polyline" bChecked={oGeometries.polyline} fnOnChange={(e) => setOGeometries({ ...oGeometries, polyline: e.target.checked })} />
                            <AppCheckbox sLabel="Point" bChecked={oGeometries.point} fnOnChange={(e) => setOGeometries({ ...oGeometries, point: e.target.checked })} />
                        </div>
                    </div>
                </AppCard>

                {/* 2. ATTRIBUTES BUILDER */}
                <AppCard>
                    <h3 style={headerStyle}>2. Attributes Schema</h3>

                    <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '6px', border: iEditingId ? '1px solid #1890ff' : '1px solid #eee', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <label style={{ ...subLabelStyle }}>
                                {iEditingId ? "✏️ Edit Attribute" : "➕ Add New Attribute"}
                            </label>
                            {iEditingId && (
                                <button onClick={() => { setEditingId(null); setSNewAttrName(""); setSNewAttrCategories(""); }} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '12px' }}>
                                    Cancel Edit
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr', gap: '15px', alignItems: 'end' }}>
                            <AppTextInput sPlaceholder="Name (e.g. Type)" sValue={sNewAttrName} fnOnChange={(e) => setSNewAttrName(e.target.value)} />
                            <AppSelect aoOptions={["String", "Integer", "Float", "Category"]} sValue={sNewAttrType} fnOnChange={(e) => setSNewAttrType(e.target.value)} />
                            <AppCheckbox sLabel="Mandatory?" bChecked={bNewAttrMandatory} fnOnChange={(e) => setBNewAttrMandatory(e.target.checked)} />
                        </div>

                        {sNewAttrType === 'Category' && (
                            <div style={{ marginTop: '15px' }}>
                                <label style={{ fontSize: '12px', color: '#666' }}>Values (comma separated)</label>
                                <AppTextInput sPlaceholder="Res, Com, Ind..." sValue={sNewAttrCategories} fnOnChange={(e) => setSNewAttrCategories(e.target.value)} />
                            </div>
                        )}

                        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                            <AppButton sVariant={iEditingId ? "warning" : "primary"} fnOnClick={handleSaveAttribute} oStyle={{ padding: '8px 15px', fontSize: '13px' }}>
                                {iEditingId ? "Update Attribute" : "+ Add to Table"}
                            </AppButton>
                        </div>
                    </div>

                    {/* TABLE */}
                    {aoAttributes.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead style={{ background: '#eee' }}>
                            <tr style={{ textAlign: 'left' }}>
                                <th style={{ padding: '10px' }}>Name</th>
                                <th style={{ padding: '10px' }}>Type</th>
                                <th style={{ padding: '10px' }}>Config</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {aoAttributes.map(attr => (
                                <tr key={attr.id} style={{ borderBottom: '1px solid #eee', background: iEditingId === attr.id ? '#e6f7ff' : 'transparent' }}>
                                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{attr.name}</td>
                                    <td style={{ padding: '10px' }}>{attr.type}</td>
                                    <td style={{ padding: '10px' }}>
                                        {attr.mandatory && <span style={{ color: 'red', fontSize: '11px', marginRight: '5px' }}>Required</span>}
                                        {attr.type === 'Category' && <span style={{ color: '#666', fontSize: '11px' }}>({attr.options.length} options)</span>}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'right' }}>
                                        <button onClick={() => handleEditAttribute(attr)} style={{ marginRight: '10px', border: 'none', background: 'transparent', color: '#1890ff', cursor: 'pointer', fontWeight: 'bold' }}>
                                            Edit
                                        </button>
                                        <button onClick={() => handleRemoveAttribute(attr.id)} style={{ border: 'none', background: 'transparent', color: '#dc3545', cursor: 'pointer', fontWeight: 'bold' }}>
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '13px', border: '1px dashed #ccc' }}>No attributes yet.</div>
                    )}
                </AppCard>

                {/* 3. STYLE CONFIG */}
                <AppCard>
                    <h3 style={headerStyle}>3. Visual Style</h3>
                    <div style={{ display: 'flex', gap: '30px', marginBottom: '20px' }}>
                        <AppRadioButton sName="styleType" sValue="single" sLabel="Single Color" bChecked={sStyleType === 'single'} fnOnChange={() => setSStyleType('single')} />
                        <AppRadioButton sName="styleType" sValue="category" sLabel="Category Based" bChecked={sStyleType === 'category'} fnOnChange={() => setSStyleType('category')} />
                    </div>

                    {sStyleType === 'single' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <label style={subLabelStyle}>Default Color:</label>
                            {/* ColorInputGroup is now stable */}
                            <ColorInputGroup value={sSingleColor} onChange={setSSingleColor} />
                        </div>
                    ) : (
                        <div>
                            <label style={subLabelStyle}>Style based on Attribute:</label>
                            <AppSelect
                                sValue={sSelectedCategoryAttr}
                                fnOnChange={(e) => setSSelectedCategoryAttr(e.target.value)}
                                aoOptions={[{ value: "", label: "-- Select --" }, ...aoAttributes.filter(a => a.type === 'Category').map(a => ({ value: a.name, label: a.name }))]}
                                oStyle={{ width: '100%', marginTop: '5px', marginBottom: '15px' }}
                            />

                            {sSelectedCategoryAttr && (
                                <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '6px', border: '1px solid #eee' }}>
                                    <label style={{ ...subLabelStyle, marginBottom: '10px', display: 'block' }}>Legend</label>
                                    {aoAttributes.find(a => a.name === sSelectedCategoryAttr)?.options.map(opt => (
                                        <div key={opt} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
                                            <span style={{ fontSize: '14px' }}>{opt}</span>
                                            <ColorInputGroup
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                    <AppButton sVariant="outline" fnOnClick={() => navigate('/label-templates')}>Cancel</AppButton>
                    <AppButton sVariant="success" fnOnClick={handleSaveTemplate}>Save Template</AppButton>
                </div>
            </div>
        </div>
    );
};

const headerStyle = { margin: '0 0 15px 0', fontSize: '18px', color: '#444', borderBottom: '1px solid #eee', paddingBottom: '10px' };
const subLabelStyle = { fontWeight: 'bold', fontSize: '13px', color: '#555' };

export default NewLabelTemplate;
