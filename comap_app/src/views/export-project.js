import React, {useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';

// REUSABLE COMPONENTS
import AppCard from '../components/app-card';
import AppButton from '../components/app-button';
import AppCheckbox from '../components/app-checkbox';
import AppRadioButton from '../components/app-radiobutton';
import {triggerExport} from "../services/project-service";

const ExportProject = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // --- 1. GRAB REAL PROJECT DATA FROM ROUTER ---
    const sProjectId = location.state?.projectId || null;
    const sProjectTitle = location.state?.projectTitle || "Unknown Project";
    const bRawDataHosted = location.state?.bRawDataHosted ?? false;
    const bReviewMode = location.state?.bReviewMode ?? false;

    // --- 2. EXPORT STATE ---
    const [bIncludeRawData, setBIncludeRawData] = useState(false);
    const [sLabelFilter, setSLabelFilter] = useState("validated"); // 'validated' or 'all'
    const [bIsGenerating, setBIsGenerating] = useState(false);
    const [oNotification, setNotification] = useState({show: false, message: '', type: 'info'});

    // --- HANDLERS ---
    const goBackToProject = () => {
        // Send the core identifiers back so EditProject can reload safely!
        navigate('/edit-project', {
            state: {
                projectId: sProjectId,
                projectTitle: sProjectTitle
            }
        });
    };

    const showNotif = (message, type = 'info') => {
        setNotification({show: true, message, type});
    };

    // Don't forget to import this at the top if you haven't!
// import { triggerExport } from '../services/project-service';

    const handleDownload = async () => {
        setBIsGenerating(true);

        const oExportPayload = {
            projectId: sProjectId,
            includeRawData: bIncludeRawData,
            labelFilter: bReviewMode ? sLabelFilter : "all"
        };

        try {
            // 1. Call your existing service (It now returns the Blob directly!)
            const blob = await triggerExport(oExportPayload);

            // 2. Create a temporary hidden link to force the browser to download it
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ComapVeda_Export_${sProjectTitle.replace(/\s+/g, '_')}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            showNotif("✅ Export package downloaded successfully!", "success");

            setTimeout(() => {
                goBackToProject();
            }, 1500);

        } catch (error) {
            console.error(error);
            showNotif("Error generating export package.", "error");
        } finally {
            setBIsGenerating(false);
        }
    };

    // Failsafe: If someone types /export-project directly into the URL bar without a project
    if (!sProjectId) {
        return (
            <div style={{padding: '40px', textAlign: 'center'}}>
                <h3>Error: No project selected.</h3>
                <AppButton fnOnClick={() => navigate('/')}>Go to Home</AppButton>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            background: '#f4f6f8',
            minHeight: '100vh',
            padding: '40px'
        }}>
            <div style={{width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '20px'}}>

                {/* HEADER */}
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                        <h2 style={{margin: 0, color: '#333'}}>📦 Export Data</h2>
                        <p style={{margin: '5px 0 0 0', color: '#666'}}>Project: <strong>{sProjectTitle}</strong></p>
                    </div>
                    <AppButton sVariant="outline" fnOnClick={goBackToProject}>
                        Cancel
                    </AppButton>
                </div>

                {/* --- CARD 1: EXPORT CONFIGURATION --- */}
                <AppCard>
                    <h3 style={headerStyle}>1. Configuration</h3>

                    {/* A. RAW DATA OPTION (Only if hosted) */}
                    {bRawDataHosted ? (
                        <div style={{paddingBottom: '20px', marginBottom: '20px', borderBottom: '1px solid #eee'}}>
                            <label style={subLabelStyle}>Raw Imagery</label>
                            <div style={{marginTop: '10px'}}>
                                <AppCheckbox
                                    sLabel="Include Raw Satellite Images (GeoTIFF)"
                                    bChecked={bIncludeRawData}
                                    fnOnChange={(e) => setBIncludeRawData(e.target.checked)}
                                />
                                <p style={{fontSize: '11px', color: '#888', marginLeft: '24px', marginTop: '5px'}}>
                                    Warning: This allows downloading large files. Make sure you have a stable
                                    connection.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            paddingBottom: '20px',
                            marginBottom: '20px',
                            borderBottom: '1px solid #eee',
                            color: '#999',
                            fontSize: '13px'
                        }}>
                            <em>Raw data is not hosted on this platform. Only labels are available.</em>
                        </div>
                    )}

                    {/* B. REVIEW / VALIDATION LOGIC */}
                    <div>
                        <label style={subLabelStyle}>Label Validation</label>
                        {bReviewMode ? (
                            <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px'}}>
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
                            <div style={{marginTop: '10px', fontSize: '13px', color: '#666'}}>
                                This project does not require review. All accessible labels will be exported.
                            </div>
                        )}
                    </div>
                </AppCard>

                {/* --- CARD 2: SUMMARY PREVIEW --- */}
                <AppCard oStyle={{background: '#f9f9f9', border: '1px solid #e0e0e0'}}>
                    <h3 style={headerStyle}>2. Export Summary</h3>

                    <div style={{fontSize: '13px', color: '#555', lineHeight: '1.6'}}>
                        <p style={{margin: 0}}>The system will generate <strong>Shapefiles (.shp)</strong> containing:
                        </p>
                        <ul style={{marginTop: '5px', paddingLeft: '20px'}}>
                            <li>Geometry Data (Polygons/Lines/Points)</li>
                            <li>Feature Attributes (Class, Area, etc.)</li>
                            <li>Metadata: Annotator Name, Timestamp</li>
                            <li>Source Info: Satellite Image Name, Date (Y/M/D)</li>
                            {bReviewMode && (
                                <li style={{color: '#007bff'}}>Review Status: Validated Flag, Reviewer Name,
                                    Timestamp</li>
                            )}
                        </ul>
                    </div>
                </AppCard>

                {/* --- FOOTER ACTION --- */}
                <AppButton
                    sVariant="success"
                    oStyle={{
                        width: '100%',
                        padding: '15px',
                        fontSize: '16px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '10px'
                    }}
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
const headerStyle = {
    margin: '0 0 15px 0',
    fontSize: '16px',
    color: '#333',
    borderBottom: '1px solid #ddd',
    paddingBottom: '10px'
};
const subLabelStyle = {fontSize: '13px', fontWeight: 'bold', color: '#555'};

export default ExportProject;
