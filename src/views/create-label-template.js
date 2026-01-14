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
    const [aoAttributes, setAoAttributes] = useState([]); // The list of saved attributes

    // The "Mini Form" state for a new attribute
    const [sNewAttrName, setSNewAttrName] = useState("");
    const [sNewAttrType, setSNewAttrType] = useState("String");
    const [bNewAttrMandatory, setBNewAttrMandatory] = useState(false);
    const [sNewAttrCategories, setSNewAttrCategories] = useState(""); // For "Item 1, Item 2"

    // --- 3. STYLE STATE ---
    const [sStyleType, setSStyleType] = useState("single"); // 'single' or 'category'
    const [sSingleColor, setSSingleColor] = useState("#ff0000");
    const [sSelectedCategoryAttr, setSSelectedCategoryAttr] = useState("");
    const [oCategoryColors, setOCategoryColors] = useState({}); // { "Item 1": "#ff0000" }

    // --- HANDLERS ---

    // A. Attribute Logic
    const handleAddAttribute = () => {
        if (!sNewAttrName) return alert("Please enter an attribute name");

        // Prepare Category Options array
        let aoOptions = [];
        if (sNewAttrType === "Category") {
            aoOptions = sNewAttrCategories.split(',').map(s => s.trim()).filter(s => s !== "");
            if (aoOptions.length === 0) return alert("Please enter category values separated by comma");
        }

        const oNewAttribute = {
            id: Date.now(),
            name: sNewAttrName,
            type: sNewAttrType,
            mandatory: bNewAttrMandatory,
            options: aoOptions
        };

        setAoAttributes([...aoAttributes, oNewAttribute]);

        // Reset Mini Form
        setSNewAttrName("");
        setSNewAttrType("String");
        setBNewAttrMandatory(false);
        setSNewAttrCategories("");
    };

    const handleRemoveAttribute = (id) => {
        setAoAttributes(aoAttributes.filter(a => a.id !== id));
    };

    // B. Style Logic
    const handleCategoryColorChange = (sCategoryValue, sColor) => {
        setOCategoryColors(prev => ({
            ...prev,
            [sCategoryValue]: sColor
        }));
    };

    // C. Save Logic
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
        console.log("Saving Template:", oPayload);
        alert("Template Saved Successfully!");
        navigate('/label-templates');
    };

    return (
        <div style={{
            padding: '30px 30px 100px 30px',
            background: '#f4f6f8',
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center'
        }}>
            <div style={{width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '20px'}}>

                {/* HEADER */}
                <div style={{marginBottom: '10px'}}>
                    <h2 style={{margin: 0, color: '#333'}}>🎨 New Label Template</h2>
                    <p style={{margin: '5px 0 0 0', color: '#666'}}>Define schema and styles for your features.</p>
                </div>

                {/* --- 1. GENERAL INFO --- */}
                <AppCard>
                    <h3 style={headerStyle}>1. General Information</h3>
                    <AppTextInput
                        sLabel="Template Name"
                        sPlaceholder="e.g., Land Use Classes"
                        sValue={sName}
                        fnOnChange={(e) => setSName(e.target.value)}
                    />
                    <div style={{marginTop: '15px'}}>
                        <AppTextArea
                            sPlaceholder="Description..."
                            sValue={sDescription}
                            fnOnChange={(e) => setSDescription(e.target.value)}
                        />
                    </div>

                    <div style={{marginTop: '15px'}}>
                        <label style={subLabelStyle}>Geometry Types Supported</label>
                        <div style={{display: 'flex', gap: '20px', marginTop: '10px'}}>
                            <AppCheckbox sLabel="Polygon" bChecked={oGeometries.polygon}
                                         fnOnChange={(e) => setOGeometries({
                                             ...oGeometries,
                                             polygon: e.target.checked
                                         })}/>
                            <AppCheckbox sLabel="Polyline" bChecked={oGeometries.polyline}
                                         fnOnChange={(e) => setOGeometries({
                                             ...oGeometries,
                                             polyline: e.target.checked
                                         })}/>
                            <AppCheckbox sLabel="Point" bChecked={oGeometries.point}
                                         fnOnChange={(e) => setOGeometries({...oGeometries, point: e.target.checked})}/>
                        </div>
                    </div>
                </AppCard>

                {/* --- 2. ATTRIBUTES BUILDER --- */}
                <AppCard>
                    <h3 style={headerStyle}>2. Attributes Schema</h3>

                    {/* The Mini Form */}
                    <div style={{
                        background: '#f9f9f9',
                        padding: '15px',
                        borderRadius: '6px',
                        border: '1px solid #eee',
                        marginBottom: '20px'
                    }}>
                        <label style={{...subLabelStyle, marginBottom: '10px', display: 'block'}}>Add New
                            Attribute</label>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1.5fr 1fr',
                            gap: '15px',
                            alignItems: 'end'
                        }}>
                            <AppTextInput
                                sPlaceholder="Attribute Name (e.g. Building Type)"
                                sValue={sNewAttrName}
                                fnOnChange={(e) => setSNewAttrName(e.target.value)}
                            />
                            <AppSelect
                                aoOptions={["String", "Integer", "Float", "Category"]}
                                sValue={sNewAttrType}
                                fnOnChange={(e) => setSNewAttrType(e.target.value)}
                            />
                            <AppCheckbox
                                sLabel="Mandatory?"
                                bChecked={bNewAttrMandatory}
                                fnOnChange={(e) => setBNewAttrMandatory(e.target.checked)}
                            />
                        </div>

                        {/* Conditional Category Input */}
                        {sNewAttrType === 'Category' && (
                            <div style={{marginTop: '15px'}}>
                                <label style={{fontSize: '12px', color: '#666'}}>Category Values (comma
                                    separated)</label>
                                <AppTextInput
                                    sPlaceholder="Residential, Commercial, Industrial..."
                                    sValue={sNewAttrCategories}
                                    fnOnChange={(e) => setSNewAttrCategories(e.target.value)}
                                />
                            </div>
                        )}

                        <div style={{marginTop: '15px', display: 'flex', justifyContent: 'flex-end'}}>
                            <AppButton sVariant="primary" fnOnClick={handleAddAttribute}
                                       oStyle={{padding: '8px 15px', fontSize: '13px'}}>
                                + Add to Table
                            </AppButton>
                        </div>
                    </div>

                    {/* The Table */}
                    {aoAttributes.length > 0 ? (
                        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
                            <thead style={{background: '#eee'}}>
                            <tr style={{textAlign: 'left'}}>
                                <th style={{padding: '10px'}}>Name</th>
                                <th style={{padding: '10px'}}>Type</th>
                                <th style={{padding: '10px'}}>Config</th>
                                <th style={{padding: '10px', textAlign: 'right'}}>Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {aoAttributes.map(attr => (
                                <tr key={attr.id} style={{borderBottom: '1px solid #eee'}}>
                                    <td style={{padding: '10px', fontWeight: 'bold'}}>{attr.name}</td>
                                    <td style={{padding: '10px'}}>
                                            <span style={{
                                                padding: '2px 6px',
                                                background: '#e6f7ff',
                                                color: '#1890ff',
                                                borderRadius: '4px',
                                                fontSize: '11px'
                                            }}>
                                                {attr.type}
                                            </span>
                                    </td>
                                    <td style={{padding: '10px'}}>
                                        {attr.mandatory &&
                                            <span style={{color: 'red', fontSize: '11px'}}>Required</span>}
                                        {attr.type === 'Category' && (
                                            <div style={{fontSize: '11px', color: '#666', marginTop: '2px'}}>
                                                Values: {attr.options.join(', ')}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{padding: '10px', textAlign: 'right'}}>
                                        <button
                                            onClick={() => handleRemoveAttribute(attr.id)}
                                            style={{
                                                border: 'none',
                                                background: 'transparent',
                                                color: '#dc3545',
                                                cursor: 'pointer',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </td>
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
                            border: '1px dashed #ccc',
                            borderRadius: '4px'
                        }}>
                            No attributes added yet. Use the form above.
                        </div>
                    )}
                </AppCard>

                {/* --- 3. STYLE CONFIG --- */}
                <AppCard>
                    <h3 style={headerStyle}>3. Visual Style</h3>

                    <div style={{display: 'flex', gap: '30px', marginBottom: '20px'}}>
                        <AppRadioButton
                            sName="styleType" sValue="single" sLabel="Single Color"
                            bChecked={sStyleType === 'single'} fnOnChange={() => setSStyleType('single')}
                        />
                        <AppRadioButton
                            sName="styleType" sValue="category" sLabel="Category Based"
                            bChecked={sStyleType === 'category'} fnOnChange={() => setSStyleType('category')}
                        />
                    </div>

                    {sStyleType === 'single' ? (
                        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                            <label style={subLabelStyle}>Default Color:</label>
                            <input
                                type="color"
                                value={sSingleColor}
                                onChange={(e) => setSSingleColor(e.target.value)}
                                style={{width: '50px', height: '30px', padding: 0, border: 'none', cursor: 'pointer'}}
                            />
                        </div>
                    ) : (
                        <div>
                            {/* Step 1: Select Attribute */}
                            <label style={subLabelStyle}>Style based on Attribute:</label>
                            <AppSelect
                                sValue={sSelectedCategoryAttr}
                                fnOnChange={(e) => setSSelectedCategoryAttr(e.target.value)}
                                aoOptions={[
                                    {value: "", label: "-- Select Category Attribute --"},
                                    ...aoAttributes.filter(a => a.type === 'Category').map(a => ({
                                        value: a.name,
                                        label: a.name
                                    }))
                                ]}
                                oStyle={{width: '100%', marginTop: '5px', marginBottom: '15px'}}
                            />

                            {/* Step 2: Show Legend/Color Picker for each value */}
                            {sSelectedCategoryAttr && (
                                <div style={{
                                    background: '#f9f9f9',
                                    padding: '15px',
                                    borderRadius: '6px',
                                    border: '1px solid #eee'
                                }}>
                                    <label style={{...subLabelStyle, marginBottom: '10px', display: 'block'}}>Legend
                                        Configuration</label>

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
                                            <input
                                                type="color"
                                                value={oCategoryColors[opt] || "#000000"}
                                                onChange={(e) => handleCategoryColorChange(opt, e.target.value)}
                                                style={{
                                                    width: '40px',
                                                    height: '25px',
                                                    padding: 0,
                                                    border: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </AppCard>

                {/* --- FOOTER ACTIONS --- */}
                <div style={{display: 'flex', justifyContent: 'flex-end', gap: '15px'}}>
                    <AppButton sVariant="outline" fnOnClick={() => navigate('/label-templates')}>Cancel</AppButton>
                    <AppButton sVariant="success" fnOnClick={handleSaveTemplate}>Save Template</AppButton>
                </div>

            </div>
        </div>
    );
};

// Local Styles
const headerStyle = {
    margin: '0 0 15px 0',
    fontSize: '18px',
    color: '#444',
    borderBottom: '1px solid #eee',
    paddingBottom: '10px'
};
const subLabelStyle = {fontWeight: 'bold', fontSize: '13px', color: '#555'};

export default NewLabelTemplate;
