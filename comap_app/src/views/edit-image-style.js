import React, {useState} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';

// REUSABLE COMPONENTS
import AppCard from '../components/app-card';
import AppSelect from '../components/app-dropdown-input';
import AppButton from '../components/app-button';
import AppRadioButton from '../components/app-radiobutton';

const ImageStyling = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // --- GRAB THE FULL STATE FROM THE EDITOR ---
    const sProjectId = location.state?.projectId || null;
    const sProjectTitle = location.state?.projectTitle || "Unknown Project";
    const sImageId = location.state?.imageId || null;
    const sImageName = location.state?.imageName || "Unknown Image";
    const sImageBBox = location.state?.imageBBox || null;
    const oCurrentStyles = location.state?.currentStyles || {}; // The memory dictionary!

    // --- 1. MOCK DATA ---
    const aoAvailableBands = [
        "B01 - Coastal Aerosol", "B02 - Blue", "B03 - Green",
        "B04 - Red", "B05 - Vegetation Red Edge", "B08 - NIR", "B11 - SWIR"
    ];

    // --- 2. STATE ---
    const [sRenderType, setSRenderType] = useState("multi");

    const [sSingleBand, setSSingleBand] = useState("B04 - Red");
    const [oMultiBands, setOMultiBands] = useState({
        red: "B04 - Red",
        green: "B03 - Green",
        blue: "B02 - Blue"
    });

    const [iBrightness, setIBrightness] = useState(0);
    const [iContrast, setIContrast] = useState(0);
    const [iHue, setIHue] = useState(0);
    const [iSaturation, setISaturation] = useState(0);

    const [sAutoLevel, setSAutoLevel] = useState("none");

    // --- HANDLERS ---

    // 1. CANCEL: Just send exactly what we received back to the editor
    const goBackToProject = () => {
        navigate('/edit-project', {
            state: {
                projectId: sProjectId,
                projectTitle: sProjectTitle,
                restoreImageId: sImageId,
                restoreBBox: sImageBBox,
                restoreStyles: oCurrentStyles
            }
        });
    };

    // 2. SAVE: Update the dictionary with the new style and send it back
    const handleSaveStyle = () => {
        const oStylePayload = {
            renderType: sRenderType,
            bands: sRenderType === 'single' ? {gray: sSingleBand} : oMultiBands,
            effects: {
                brightness: iBrightness,
                contrast: iContrast,
                hue: iHue,
                saturation: iSaturation
            },
            histogram: sAutoLevel
        };

        const updatedStyles = { ...oCurrentStyles, [sImageId]: oStylePayload };

        navigate('/edit-project', {
            state: {
                projectId: sProjectId,
                projectTitle: sProjectTitle,
                restoreImageId: sImageId,
                restoreBBox: sImageBBox,
                restoreStyles: updatedStyles
            }
        });
    };

    // 3. RESET: Delete this image's style from the dictionary and send it back
    const handleResetStyle = () => {
        const updatedStyles = { ...oCurrentStyles };
        delete updatedStyles[sImageId]; // Poof! Style is gone.

        navigate('/edit-project', {
            state: {
                projectId: sProjectId,
                projectTitle: sProjectTitle,
                restoreImageId: sImageId,
                restoreBBox: sImageBBox,
                restoreStyles: updatedStyles
            }
        });
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            background: '#f4f6f8',
            minHeight: '100vh',
            padding: '40px'
        }}>
            <div style={{width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '20px'}}>

                {/* HEADER */}
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                        <h2 style={{margin: 0, color: '#333'}}>🎨 Image Styling</h2>
                        <p style={{margin: '5px 0 0 0', color: '#666', fontSize: '14px'}}>
                            Configuring style for: <strong style={{color: '#007bff'}}>{sImageName}</strong>
                        </p>
                    </div>
                    <AppButton sVariant="outline" fnOnClick={goBackToProject}>
                        Cancel
                    </AppButton>
                </div>

                {/* --- CARD 1: BAND CONFIGURATION --- */}
                <AppCard>
                    <h3 style={headerStyle}>1. Band Configuration</h3>
                    <div style={{ display: 'flex', gap: '30px', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                        <AppRadioButton sName="renderType" sValue="multi" sLabel="Multi Band (RGB)" bChecked={sRenderType === 'multi'} fnOnChange={() => setSRenderType('multi')} />
                        <AppRadioButton sName="renderType" sValue="single" sLabel="Single Band (Grayscale)" bChecked={sRenderType === 'single'} fnOnChange={() => setSRenderType('single')} />
                    </div>

                    {sRenderType === 'single' ? (
                        <div>
                            <label style={subLabelStyle}>Select Band to Render</label>
                            <AppSelect sValue={sSingleBand} fnOnChange={(e) => setSSingleBand(e.target.value)} aoOptions={aoAvailableBands} oStyle={{width: '100%', marginTop: '5px'}} />
                        </div>
                    ) : (
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px'}}>
                            <div>
                                <label style={{...subLabelStyle, color: '#dc3545'}}>Red Channel</label>
                                <AppSelect sValue={oMultiBands.red} fnOnChange={(e) => setOMultiBands({...oMultiBands, red: e.target.value})} aoOptions={aoAvailableBands} oStyle={{width: '100%', marginTop: '5px', borderLeft: '3px solid #dc3545'}} />
                            </div>
                            <div>
                                <label style={{...subLabelStyle, color: '#28a745'}}>Green Channel</label>
                                <AppSelect sValue={oMultiBands.green} fnOnChange={(e) => setOMultiBands({...oMultiBands, green: e.target.value})} aoOptions={aoAvailableBands} oStyle={{width: '100%', marginTop: '5px', borderLeft: '3px solid #28a745'}} />
                            </div>
                            <div>
                                <label style={{...subLabelStyle, color: '#007bff'}}>Blue Channel</label>
                                <AppSelect sValue={oMultiBands.blue} fnOnChange={(e) => setOMultiBands({...oMultiBands, blue: e.target.value})} aoOptions={aoAvailableBands} oStyle={{width: '100%', marginTop: '5px', borderLeft: '3px solid #007bff'}} />
                            </div>
                        </div>
                    )}
                </AppCard>

                {/* --- CARD 2: EFFECTS --- */}
                <AppCard>
                    <h3 style={headerStyle}>2. Image Effects</h3>
                    <div style={{marginBottom: '25px'}}>
                        <label style={{...subLabelStyle, marginBottom: '10px', display: 'block'}}>Histogram Auto-Level</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#f9f9f9', padding: '15px', borderRadius: '6px' }}>
                            <AppRadioButton sName="hist" sValue="none" sLabel="None (Raw)" bChecked={sAutoLevel === 'none'} fnOnChange={() => setSAutoLevel('none')} />
                            <AppRadioButton sName="hist" sValue="linear" sLabel="Linear Auto-Level (Min/Max)" bChecked={sAutoLevel === 'linear'} fnOnChange={() => setSAutoLevel('linear')} />
                            <AppRadioButton sName="hist" sValue="saturated" sLabel="Saturated Auto-Level (Cut 2% Top/Bottom)" bChecked={sAutoLevel === 'saturated'} fnOnChange={() => setSAutoLevel('saturated')} />
                        </div>
                    </div>

                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
                        <div>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                                <label style={subLabelStyle}>Brightness</label>
                                <span style={{fontSize: '12px', color: '#666'}}>{iBrightness > 0 ? '+' : ''}{iBrightness}</span>
                            </div>
                            <input type="range" min="-100" max="100" value={iBrightness} onChange={(e) => setIBrightness(e.target.value)} style={{width: '100%', cursor: 'pointer'}} />
                        </div>
                        <div>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                                <label style={subLabelStyle}>Contrast</label>
                                <span style={{fontSize: '12px', color: '#666'}}>{iContrast > 0 ? '+' : ''}{iContrast}</span>
                            </div>
                            <input type="range" min="-100" max="100" value={iContrast} onChange={(e) => setIContrast(e.target.value)} style={{width: '100%', cursor: 'pointer'}} />
                        </div>
                        <div>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                                <label style={subLabelStyle}>Hue</label>
                                <span style={{fontSize: '12px', color: '#666'}}>{iHue}°</span>
                            </div>
                            <input type="range" min="-180" max="180" value={iHue} onChange={(e) => setIHue(e.target.value)} style={{width: '100%', cursor: 'pointer'}} />
                        </div>
                        <div>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                                <label style={subLabelStyle}>Saturation</label>
                                <span style={{fontSize: '12px', color: '#666'}}>{iSaturation > 0 ? '+' : ''}{iSaturation}</span>
                            </div>
                            <input type="range" min="-100" max="100" value={iSaturation} onChange={(e) => setISaturation(e.target.value)} style={{width: '100%', cursor: 'pointer'}} />
                        </div>
                    </div>
                </AppCard>

                {/* FOOTER - NOW WITH A RESET BUTTON */}
                <div style={{ display: 'flex', gap: '15px' }}>
                    <AppButton sVariant="outline" oStyle={{ flex: 1, padding: '15px', fontSize: '16px', color: '#dc3545', borderColor: '#dc3545' }} fnOnClick={handleResetStyle}>
                        🗑️ Reset to Default
                    </AppButton>
                    <AppButton sVariant="success" oStyle={{ flex: 2, padding: '15px', fontSize: '16px' }} fnOnClick={handleSaveStyle}>
                        💾 Save Visualization Style
                    </AppButton>
                </div>

            </div>
        </div>
    );
};

// Styles
const headerStyle = { margin: '0 0 15px 0', fontSize: '18px', color: '#333', borderBottom: '1px solid #eee', paddingBottom: '10px' };
const subLabelStyle = {fontSize: '13px', fontWeight: 'bold', color: '#555'};

export default ImageStyling;
