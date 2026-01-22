import React, {useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

// 1. REUSABLE COMPONENTS
import MapboxMap from '../components/MapboxMap';
import AppCard from '../components/app-card';
import AppTextInput from '../components/app-text-input';
import AppTextArea from '../components/app-text-area';
import AppDateInput from '../components/app-date-input'; // Don't forget this!
import AppCheckbox from '../components/app-checkbox';
import AppRadioButton from '../components/app-radiobutton';
import AppButton from '../components/app-button';
import {approveProject, rejectProject} from "../services/project-service";

const ApproveProject = () => {
    const navigate = useNavigate();

    // 1. Get ID from URL
    const {projectId} = useParams();
    const safeProjectId = projectId || "REQ-2023-884"; // Fallback for UI testing

    // --- 2. LOGIC STATE (NEW) ---
    const [bIsSubmitting, setIsSubmitting] = useState(false);
    const [sError, setError] = useState(null);
    const [bShowSuccessModal, setShowSuccessModal] = useState(false);
    const [sSuccessMessage, setSuccessMessage] = useState("");

    // --- 3. DUMMY DATA (Preserved from your code) ---
    const [oRequestData] = useState({
        name: 'Amazon Rainforest Monitoring',
        description: 'Tracking deforestation in the western sector.',
        link: 'https://dataset-source.com',
        creationDate: '2023-10-25',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        isPublic: false,
        isGlobal: false,
        annotatorScope: 'own',
        reviewRequired: true,
        minReviews: 2,
        eoMission: 'Sentinel-2',
        tasks: {segmentation: true, detection: false, classification: false, other: false},
        ownerHosting: false,
        s3User: '', s3Password: '', s3Url: ''
    });

    // --- 4. ADMIN STATE ---
    const [iMaxStorage, setIMaxStorage] = useState(2);
    const [sAdminNote, setSAdminNote] = useState("");

    // --- HANDLERS (INTEGRATED) ---

    const handleApprove = async () => {
        setError(null);
        try {
            setIsSubmitting(true);

            // CALL SERVER (using the function we defined previously)
            await approveProject(safeProjectId, iMaxStorage);

            // SUCCESS UI
            setSuccessMessage("Project Approved and User Notified! ✅");
            setShowSuccessModal(true);
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to approve project.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        setError(null);

        // VALIDATION: Note is mandatory for rejection
        if (!sAdminNote || sAdminNote.trim() === "") {
            setError("Please provide a note explaining the rejection.");
            return;
        }

        try {
            setIsSubmitting(true);

            // CALL SERVER
            await rejectProject(safeProjectId, sAdminNote);

            // SUCCESS UI
            setSuccessMessage("Request Rejected and User Notified! ❌");
            setShowSuccessModal(true);
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to reject project.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const closePopupAndNavigate = () => {
        setShowSuccessModal(false);
        navigate('/'); // Redirect to Dashboard
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            background: '#f4f6f8',
            overflowY: 'auto',
            position: 'relative'
        }}>

            {/* --- NEW: SUCCESS POPUP OVERLAY --- */}
            {bShowSuccessModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{
                        background: 'white', padding: '30px', borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)', textAlign: 'center', width: '350px'
                    }}>
                        <div style={{fontSize: '40px', marginBottom: '10px'}}>
                            {sSuccessMessage.includes("Rejected") ? "⚠️" : "🎉"}
                        </div>
                        <h3 style={{margin: '0 0 10px 0', color: '#333'}}>Action Complete</h3>
                        <p style={{color: '#666', marginBottom: '20px'}}>{sSuccessMessage}</p>
                        <AppButton sVariant="primary" fnOnClick={closePopupAndNavigate}>
                            Back to Dashboard
                        </AppButton>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div style={{
                padding: '20px', background: 'white', borderBottom: '1px solid #ddd', marginBottom: '20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div>
                    <h2 style={{margin: 0, color: '#333'}}>🕵️‍♂️ Review Project Request</h2>
                    <p style={{margin: '5px 0 0 0', fontSize: '13px', color: '#666'}}>
                        ID: #{safeProjectId} • Requested by: <strong>John Doe</strong>
                    </p>
                </div>
                <div style={{
                    padding: '5px 10px', background: '#fff3cd', color: '#856404', borderRadius: '4px',
                    fontSize: '13px', fontWeight: 'bold', border: '1px solid #ffeeba'
                }}>
                    ⚠️ Status: Pending
                </div>
            </div>

            <div style={{padding: '0 30px 30px 30px', maxWidth: '1000px', margin: '0 auto', width: '100%'}}>

                {/* --- NEW: ERROR BANNER --- */}
                {sError && (
                    <div style={{
                        padding: '15px', background: '#fdeded', color: '#5f2120',
                        border: '1px solid #f5c6cb', borderRadius: '4px', marginBottom: '20px'
                    }}>
                        ⚠️ <strong>Error:</strong> {sError}
                    </div>
                )}

                <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>

                    {/* --- 1. GENERAL INFO (READ ONLY) --- */}
                    <AppCard>
                        <h3 style={headerStyle}>1. General Information</h3>
                        <div style={gridStyle}>
                            <AppTextInput sName="Project Name" sValue={oRequestData.name} disabled/>
                            <AppTextInput sName="External Link" sValue={oRequestData.link} disabled/>
                        </div>
                        <div style={{marginTop: '15px'}}>
                            <AppTextArea sValue={oRequestData.description} disabled/>
                        </div>
                        <div style={{...gridStyle, marginTop: '15px'}}>
                            <AppDateInput sLabel="Creation Date" sValue={oRequestData.creationDate} disabled/>
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
                                <MapboxMap
                                    aoMarkers={[]}
                                    oInitialView={{latitude: -3.4653, longitude: -62.2159, zoom: 5}}
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
                            <AppTextInput sName="EO Mission" sValue={oRequestData.eoMission} disabled/>
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
                                marginBottom: '20px', padding: '15px', background: '#eef6fc', borderRadius: '4px'
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
                                fnOnChange={(e) => {
                                    setSAdminNote(e.target.value);
                                    if (sError) setError(null); // Clear error when user types
                                }}
                                sPlaceholder="Enter feedback for the user here..."
                                iRows={3}
                                oStyle={sError ? {borderColor: 'red'} : {}}
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
                                sVariant="outline"
                                oStyle={{borderColor: '#dc3545', color: '#dc3545'}}
                                fnOnClick={handleReject}
                                disabled={bIsSubmitting}
                            >
                                {bIsSubmitting ? "Processing..." : "❌ Reject Request"}
                            </AppButton>

                            <AppButton
                                sVariant="success"
                                fnOnClick={handleApprove}
                                disabled={bIsSubmitting}
                            >
                                {bIsSubmitting ? "Processing..." : "✅ Approve Project"}
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
