import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';

// 1. REUSABLE COMPONENTS
import MapboxMap from '../components/MapboxMap';
import AppCard from '../components/app-card';
import AppTextInput from '../components/app-text-input';
import AppTextArea from '../components/app-text-area';
import AppDateInput from '../components/app-date-input'; // Don't forget this!
import AppCheckbox from '../components/app-checkbox';
import AppRadioButton from '../components/app-radiobutton';
import AppButton from '../components/app-button';

const ApproveProject = () => {
    const navigate = useNavigate();

    // --- 1. DUMMY DATA (Simulating a fetched Pending Request) ---
    // In a real app, you would fetch this by ID using useEffect
    const [oRequestData] = useState({
        name: 'Amazon Rainforest Monitoring',
        description: 'Tracking deforestation in the western sector.',
        link: 'https://dataset-source.com',
        creationDate: '2023-10-25',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        isPublic: false,
        isGlobal: false, // It has a map!
        annotatorScope: 'own',
        reviewRequired: true,
        minReviews: 2,
        eoMission: 'Sentinel-2',
        tasks: {segmentation: true, detection: false, classification: false, other: false},
        ownerHosting: false, // Requesting platform hosting
        s3User: '', s3Password: '', s3Url: ''
    });

    // --- 2. ADMIN STATE ---
    const [iMaxStorage, setIMaxStorage] = useState(2); // Default 2GB per requirements
    const [sAdminNote, setSAdminNote] = useState("");

    // --- HANDLERS ---
    const handleApprove = () => {
        // Logic: convert request to project, save max storage...
        console.log("Approved! Storage:", iMaxStorage, "GB. Note:", sAdminNote);
        alert("Project Approved and User Notified! ✅");
        navigate('/'); // Redirect to Admin Dashboard
    };

    const handleReject = () => {
        if (!sAdminNote) {
            alert("Please provide a note explaining the rejection.");
            return;
        }
        // Logic: delete request, email user with note...
        console.log("Rejected. Reason:", sAdminNote);
        alert("Request Rejected and User Notified! ❌");
        navigate('/');
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            background: '#f4f6f8',
            overflowY: 'auto'
        }}>

            {/* HEADER */}
            <div style={{
                padding: '20px',
                background: 'white',
                borderBottom: '1px solid #ddd',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h2 style={{margin: 0, color: '#333'}}>🕵️‍♂️ Review Project Request</h2>
                    <p style={{margin: '5px 0 0 0', fontSize: '13px', color: '#666'}}>ID: #REQ-2023-884 • Requested
                        by: <strong>John Doe</strong></p>
                </div>
                <div style={{
                    padding: '5px 10px',
                    background: '#fff3cd',
                    color: '#856404',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    border: '1px solid #ffeeba'
                }}>
                    ⚠️ Status: Pending
                </div>
            </div>

            <div style={{padding: '0 30px 30px 30px', maxWidth: '1000px', margin: '0 auto', width: '100%'}}>
                <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>

                    {/* =========================================================
                        USER DATA SECTIONS (READ ONLY)
                        We add `disabled={true}` to everything
                       ========================================================= */}

                    {/* --- 1. GENERAL INFO --- */}
                    <AppCard>
                        <h3 style={headerStyle}>1. General Information</h3>
                        <div style={gridStyle}>
                            <AppTextInput sLabel="Project Name" sValue={oRequestData.name} disabled/>
                            <AppTextInput sLabel="External Link" sValue={oRequestData.link} disabled/>
                        </div>
                        <div style={{marginTop: '15px'}}>
                            <AppTextArea sValue={oRequestData.description} disabled/>
                        </div>
                        <div style={{...gridStyle, marginTop: '15px'}}>
                            <AppDateInput sLabel="Creation Date" sValue={oRequestData.creationDate}
                                          oStyle={{background: '#eee'}} disabled/>
                            <AppDateInput sLabel="Start Date" sValue={oRequestData.startDate} disabled/>
                            <AppDateInput sLabel="End Date" sValue={oRequestData.endDate} disabled/>
                        </div>
                        <div style={{display: 'flex', gap: '30px', marginTop: '20px'}}>
                            <AppCheckbox sLabel="Make Project Public" bChecked={oRequestData.isPublic} disabled/>
                            <AppCheckbox sLabel="Project Area is Global" bChecked={oRequestData.isGlobal} disabled/>
                        </div>
                    </AppCard>

                    {/* --- 2. MAP (AOI) --- */}
                    {!oRequestData.isGlobal && (
                        <AppCard>
                            <h3 style={headerStyle}>2. Area of Interest (AOI)</h3>
                            <div style={{
                                height: '350px',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                border: '1px solid #ccc',
                                opacity: 0.9
                            }}>
                                {/* Interactive features disabled for review view */}
                                <MapboxMap
                                    aoMarkers={[]}
                                    oInitialView={{
                                        latitude: -3.4653,
                                        longitude: -62.2159,
                                        zoom: 5
                                    }} // Example Amazon coordinates
                                    bEnableDraw={false}
                                    bEnableGeocoder={false}
                                />
                            </div>
                        </AppCard>
                    )}

                    {/* --- 3. LABELLING PROTOCOL --- */}
                    <AppCard oStyle={{background: '#f9f9f9', border: '1px solid #eee'}}>
                        <h3 style={headerStyle}>3. Labelling Protocol</h3>
                        <div style={{marginBottom: '15px'}}>
                            <label style={subLabelStyle}>Annotator Visibility:</label>
                            <div style={{display: 'flex', gap: '20px', marginTop: '5px'}}>
                                <AppRadioButton sLabel="Can see all labels"
                                                bChecked={oRequestData.annotatorScope === 'all'} disabled/>
                                <AppRadioButton sLabel="Only their own labels"
                                                bChecked={oRequestData.annotatorScope === 'own'} disabled/>
                            </div>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                            <AppCheckbox sLabel="Review Required" bChecked={oRequestData.reviewRequired} disabled/>
                            {oRequestData.reviewRequired && (
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                    <span style={{fontSize: '14px'}}>Min Reviews:</span>
                                    <AppTextInput sValue={oRequestData.minReviews} oStyle={{width: '60px'}} disabled/>
                                </div>
                            )}
                        </div>
                    </AppCard>

                    {/* --- 4. DATA & HOSTING (READ ONLY) --- */}
                    <AppCard>
                        <h3 style={headerStyle}>4. Data & Storage Request</h3>
                        <div style={gridStyle}>
                            <AppTextInput sLabel="EO Mission" sValue={oRequestData.eoMission} disabled/>
                            <AppCheckbox sLabel="Owner Provided Hosting (S3)" bChecked={oRequestData.ownerHosting}
                                         disabled oStyle={{marginTop: '30px'}}/>
                        </div>
                    </AppCard>

                    {/* =========================================================
                        ADMIN DECISION SECTION (INTERACTIVE)
                       ========================================================= */}

                    <AppCard oStyle={{border: '2px solid #007bff', boxShadow: '0 4px 15px rgba(0,123,255,0.15)'}}>
                        <h3 style={{...headerStyle, color: '#007bff', borderBottomColor: '#cce5ff'}}>
                            👮 Admin Decision
                        </h3>

                        {/* A. STORAGE ALLOCATION (Only if not owner hosting) */}
                        {!oRequestData.ownerHosting && (
                            <div style={{
                                marginBottom: '20px',
                                padding: '15px',
                                background: '#eef6fc',
                                borderRadius: '4px'
                            }}>
                                <label style={{...subLabelStyle, color: '#0056b3'}}>
                                    💾 Platform Storage Allocation
                                </label>
                                <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px'}}>
                                    <span style={{fontSize: '14px'}}>Max Storage Limit (GB):</span>
                                    <AppTextInput
                                        type="number"
                                        sValue={iMaxStorage}
                                        fnOnChange={(e) => setIMaxStorage(e.target.value)}
                                        oStyle={{width: '100px', fontWeight: 'bold', borderColor: '#007bff'}}
                                    />
                                    <span style={{fontSize: '12px', color: '#666'}}>(Default: 2GB)</span>
                                </div>
                            </div>
                        )}

                        {/* B. NOTES */}
                        <div style={{marginBottom: '20px'}}>
                            <label style={subLabelStyle}>Admin Note (Required for Rejection)</label>
                            <AppTextArea
                                sValue={sAdminNote}
                                fnOnChange={(e) => setSAdminNote(e.target.value)}
                                sPlaceholder="Enter feedback for the user here..."
                                iRows={3}
                            />
                        </div>

                        {/* C. ACTION BUTTONS */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '15px',
                            borderTop: '1px solid #eee',
                            paddingTop: '20px'
                        }}>
                            <AppButton
                                sVariant="outline" // "Cancel" style but red for danger
                                oStyle={{borderColor: '#dc3545', color: '#dc3545'}}
                                fnOnClick={handleReject}
                            >
                                ❌ Reject Request
                            </AppButton>

                            <AppButton
                                sVariant="success"
                                fnOnClick={handleApprove}
                            >
                                ✅ Approve Project
                            </AppButton>
                        </div>
                    </AppCard>

                </div>
            </div>
        </div>
    );
};

// --- STYLES ---
const headerStyle = {
    margin: '0 0 15px 0',
    fontSize: '18px',
    color: '#444',
    borderBottom: '1px solid #eee',
    paddingBottom: '10px'
};
const subLabelStyle = {fontWeight: 'bold', fontSize: '13px', color: '#555'};
const gridStyle = {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'};

export default ApproveProject;
