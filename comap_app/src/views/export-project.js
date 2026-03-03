import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// REUSABLE COMPONENTS
import AppCard from '../components/app-card';
import AppButton from '../components/app-button';
import AppCheckbox from '../components/app-checkbox';
import AppRadioButton from '../components/app-radiobutton';

const ExportProject = () => {
    const navigate = useNavigate();

    // --- 1. MOCK PROJECT SETTINGS (Toggle these to test logic) ---
    const [oProjectConfig] = useState({
        name: "Amazon Deforestation 2023",
        bRawDataHosted: true,  // Scenario Step 3: Change to false to hide Raw Data option
        bReviewMode: true      // Scenario Step 4: Change to false to hide Review options
    });

    // --- 2. EXPORT STATE ---
    const [bIncludeRawData, setBIncludeRawData] = useState(false);
    const [sLabelFilter, setSLabelFilter] = useState("validated"); // 'validated' or 'all'
    const [bIsGenerating, setBIsGenerating] = useState(false);

    // --- HANDLERS ---
    const handleDownload = () => {
        setBIsGenerating(true);

        // Simulate Backend Generation Process
        setTimeout(() => {
            setBIsGenerating(false);
            alert("✅ Export package generated! Downloading starts now...");
            // In real app: window.location.href = 'url_to_zip';
            navigate('/'); // Return to list
        }, 1500);
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', background: '#f4f6f8', minHeight: '100vh', padding: '40px' }}>
            <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, color: '#333' }}>📦 Export Data</h2>
                        <p style={{ margin: '5px 0 0 0', color: '#666' }}>Project: <strong>{oProjectConfig.name}</strong></p>
                    </div>
                    <AppButton sVariant="outline" fnOnClick={() => navigate('/edit-project')}>
                        Cancel
                    </AppButton>
                </div>

                {/* --- CARD 1: EXPORT CONFIGURATION --- */}
                <AppCard>
                    <h3 style={headerStyle}>1. Configuration</h3>

                    {/* A. RAW DATA OPTION (Only if hosted) */}
                    {oProjectConfig.bRawDataHosted ? (
                        <div style={{ paddingBottom: '20px', marginBottom: '20px', borderBottom: '1px solid #eee' }}>
                            <label style={subLabelStyle}>Raw Imagery</label>
                            <div style={{ marginTop: '10px' }}>
                                <AppCheckbox
                                    sLabel="Include Raw Satellite Images (GeoTIFF)"
                                    bChecked={bIncludeRawData}
                                    fnOnChange={(e) => setBIncludeRawData(e.target.checked)}
                                />
                                <p style={{ fontSize: '11px', color: '#888', marginLeft: '24px', marginTop: '5px' }}>
                                    Warning: This allows downloading large files. Make sure you have a stable connection.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ paddingBottom: '20px', marginBottom: '20px', borderBottom: '1px solid #eee', color: '#999', fontSize: '13px' }}>
                            <em>Raw data is not hosted on this platform. Only labels are available.</em>
                        </div>
                    )}

                    {/* B. REVIEW / VALIDATION LOGIC */}
                    <div>
                        <label style={subLabelStyle}>Label Validation</label>
                        {oProjectConfig.bReviewMode ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                                <AppRadioButton
                                    sName="filter" sValue="validated"
                                    sLabel="Export only Validated Labels (Recommended)"
                                    bChecked={sLabelFilter === 'validated'}
                                    fnOnChange={() => setSLabelFilter('validated')}
                                />
                                <AppRadioButton
                                    sName="filter" sValue="all"
                                    sLabel="Export All Labels (Including Unreviewed)"
                                    bChecked={sLabelFilter === 'all'}
                                    fnOnChange={() => setSLabelFilter('all')}
                                />
                            </div>
                        ) : (
                            <div style={{ marginTop: '10px', fontSize: '13px', color: '#666' }}>
                                This project does not require review. All labels will be exported.
                            </div>
                        )}
                    </div>
                </AppCard>

                {/* --- CARD 2: SUMMARY PREVIEW --- */}
                <AppCard oStyle={{ background: '#f9f9f9', border: '1px solid #e0e0e0' }}>
                    <h3 style={headerStyle}>2. Export Summary</h3>

                    <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.6' }}>
                        <p style={{ margin: 0 }}>The system will generate <strong>Shapefiles (.shp)</strong> containing:</p>
                        <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                            <li>Geometry Data (Polygons/Lines/Points)</li>
                            <li>Feature Attributes (Class, Area, etc.)</li>
                            <li>Metadata: Annotator Name, Timestamp</li>
                            <li>Source Info: Satellite Image Name, Date (Y/M/D)</li>
                            {oProjectConfig.bReviewMode && (
                                <li style={{ color: '#007bff' }}>Review Status: Validated Flag, Reviewer Name, Timestamp</li>
                            )}
                        </ul>
                    </div>
                </AppCard>

                {/* --- FOOTER ACTION --- */}
                <AppButton
                    sVariant="success"
                    oStyle={{ width: '100%', padding: '15px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                    fnOnClick={handleDownload}
                    disabled={bIsGenerating}
                >
                    {bIsGenerating ? (
                        <>⚙️ Generating Package...</>
                    ) : (
                        <>⬇️ Download Export Package</>
                    )}
                </AppButton>

            </div>
        </div>
    );
};

// Styles
const headerStyle = { margin: '0 0 15px 0', fontSize: '16px', color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '10px' };
const subLabelStyle = { fontSize: '13px', fontWeight: 'bold', color: '#555' };

export default ExportProject;
