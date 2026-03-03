import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// 1. REUSABLE COMPONENTS
import MapboxMap from '../components/MapboxMap';
import AppCard from '../components/app-card';
import AppTextInput from '../components/app-text-input';
import AppTextArea from '../components/app-text-area';
import AppDateInput from '../components/app-date-input';
import AppCheckbox from '../components/app-checkbox';
import AppRadioButton from '../components/app-radiobutton';
import AppButton from '../components/app-button';

// SERVICES
import { approveProject, rejectProject, getProject } from "../services/project-service";

const ApproveProject = () => {
    const navigate = useNavigate();

    // 1. Get ID from URL
    const { projectId } = useParams();
    const safeProjectId = projectId || "REQ-2023-884"; // Fallback for UI testing

    // --- 2. LOGIC STATE ---
    const [bIsLoading, setIsLoading] = useState(true);
    const [bIsSubmitting, setIsSubmitting] = useState(false);
    const [sError, setError] = useState(null);
    const [bShowSuccessModal, setShowSuccessModal] = useState(false);
    const [sSuccessMessage, setSuccessMessage] = useState("");

    // --- 3. PROJECT DATA STATE ---
    const [oRequestData, setRequestData] = useState(null);
    const [oProjectBBox, setProjectBBox] = useState(null);

    // --- 4. ADMIN STATE ---
    const [iMaxStorage, setIMaxStorage] = useState(2);
    const [sAdminNote, setSAdminNote] = useState("");

    // --- HELPER: Parse WKT for Mapbox ---
    const parseWKTBbox = (wkt) => {
        if (!wkt) return null;
        try {
            const coordsText = wkt.replace(/POLYGON\s*\(\(/i, "").replace(/\)\)/, "");
            const pairs = coordsText.split(",").map(p => p.trim());
            let xValues = [], yValues = [];
            pairs.forEach(pair => {
                const [x, y] = pair.split(/\s+/).map(Number);
                if (!isNaN(x) && !isNaN(y)) { xValues.push(x); yValues.push(y); }
            });
            return [Math.min(...xValues), Math.min(...yValues), Math.max(...xValues), Math.max(...yValues)];
        } catch (e) {
            return null;
        }
    };

    // --- HELPER: Format Epoch ms to YYYY-MM-DD for Date Input ---
    const formatDateForInput = (epochMs) => {
        if (!epochMs) return "";
        return new Date(Number(epochMs)).toISOString().split('T')[0];
    };

    // --- FETCH REAL DATA ---
    useEffect(() => {
        const loadData = async () => {
            if (!projectId) return; // Skip if no ID (testing mode)

            try {
                setIsLoading(true);
                const data = await getProject(projectId);

                // Map Backend ViewModel to UI State
                setRequestData({
                    name: data.name,
                    description: data.description || "",
                    link: data.link || "",
                    creationDate: formatDateForInput(data.creationDate),
                    startDate: formatDateForInput(data.datasetStartDate),
                    endDate: formatDateForInput(data.datasetEndDate),
                    isPublic: data.isPublic,
                    isGlobal: data.isGlobalAoI,
                    annotatorScope: data.hasAnnotatorGlobalView ? 'all' : 'own',
                    reviewRequired: data.doesNeedReview,
                    minReviews: data.reviewersNumber || 0,
                    eoMission: data.mission,
                    ownerHosting: data.isOwnerHosting,
                    s3User: data.hostingUsername || "",
                    s3Url: data.hostingUrl || "",
                    approved: data.approved,
                    rejected: data.rejected,
                    rejectionNote: data.rejectionNote || ""
                });

                if (data.bbox) {
                    setProjectBBox(parseWKTBbox(data.bbox));
                }

            } catch (err) {
                console.error("Failed to load project details:", err);
                setError("Could not load project details. It may not exist.");
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [projectId]);

    // --- HANDLERS ---
    const handleApprove = async () => {
        setError(null);
        try {
            setIsSubmitting(true);
            await approveProject(safeProjectId, iMaxStorage);
            setSuccessMessage("Project Approved and User Notified! ✅");
            setShowSuccessModal(true);
        } catch (err) {
            setError(err.message || "Failed to approve project.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        setError(null);
        if (!sAdminNote || sAdminNote.trim() === "") {
            setError("Please provide a note explaining the rejection.");
            return;
        }
        try {
            setIsSubmitting(true);
            await rejectProject(safeProjectId, sAdminNote);
            setSuccessMessage("Request Rejected and User Notified! ❌");
            setShowSuccessModal(true);
        } catch (err) {
            setError(err.message || "Failed to reject project.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const closePopupAndNavigate = () => {
        setShowSuccessModal(false);
        navigate('/project-requests'); // Redirect back to list
    };

    if (bIsLoading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Loading Request Data...</div>;
    }

    if (!oRequestData) {
        return <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>⚠️ Error: Project data not found.</div>;
    }

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '90vh',
            background: '#f4f6f8', overflowY: 'auto', position: 'relative'
        }}>

            {/* SUCCESS POPUP OVERLAY */}
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
                            Back to Requests
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
                        ID: #{safeProjectId}
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

                {sError && (
                    <div style={{ padding: '15px', background: '#fdeded', color: '#5f2120', border: '1px solid #f5c6cb', borderRadius: '4px', marginBottom: '20px' }}>
                        ⚠️ <strong>Error:</strong> {sError}
                    </div>
                )}

                <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>

                    {/* 1. GENERAL INFO */}
                    <AppCard>
                        <h3 style={headerStyle}>1. General Information</h3>
                        <div style={gridStyle}>
                            <AppTextInput sLabel="Project Name" sValue={oRequestData.name} disabled/>
                            <AppTextInput sLabel="External Link" sValue={oRequestData.link} disabled/>
                        </div>
                        <div style={{marginTop: '15px'}}>
                            <label style={subLabelStyle}>Description</label>
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

                    {/* 2. MAP (AOI) */}
                    {!oRequestData.isGlobal && (
                        <AppCard>
                            <h3 style={headerStyle}>2. Area of Interest (AOI)</h3>
                            <div style={{ height: '350px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #ccc', opacity: 0.9 }}>
                                <MapboxMap
                                    aoMarkers={[]}
                                    oInitialView={{latitude: 20, longitude: 0, zoom: 1.5}}
                                    oZoomToBBox={oProjectBBox} // Automatically zoom to the drawn bounding box
                                    bEnableDraw={false}
                                    bEnableGeocoder={false}
                                />
                            </div>
                        </AppCard>
                    )}

                    {/* 3. LABELLING PROTOCOL */}
                    <AppCard oStyle={{background: '#f9f9f9', border: '1px solid #eee'}}>
                        <h3 style={headerStyle}>3. Labelling Protocol</h3>
                        <div style={{marginBottom: '15px'}}>
                            <label style={subLabelStyle}>Annotator Visibility:</label>
                            <div style={{display: 'flex', gap: '20px', marginTop: '5px'}}>
                                <AppRadioButton sLabel="Can see all labels" bChecked={oRequestData.annotatorScope === 'all'} disabled/>
                                <AppRadioButton sLabel="Only their own labels" bChecked={oRequestData.annotatorScope === 'own'} disabled/>
                            </div>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                            <AppCheckbox sLabel="Review Required" bChecked={oRequestData.reviewRequired} disabled/>
                            {oRequestData.reviewRequired && (
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                    <span style={{fontSize: '14px'}}>Min Reviews:</span>
                                    <AppTextInput sValue={oRequestData.minReviews.toString()} oStyle={{width: '60px'}} disabled/>
                                </div>
                            )}
                        </div>
                    </AppCard>

                    {/* 4. DATA & HOSTING */}
                    <AppCard>
                        <h3 style={headerStyle}>4. Data & Storage Request</h3>
                        <div style={gridStyle}>
                            <AppTextInput sLabel="EO Mission" sValue={oRequestData.eoMission} disabled/>
                            <AppCheckbox sLabel="Owner Provided Hosting (S3)" bChecked={oRequestData.ownerHosting} disabled oStyle={{marginTop: '30px'}}/>
                        </div>
                    </AppCard>
                    {/* ================================================= */}
                    {/* 5. ADMIN DECISION (DYNAMIC)                       */}
                    {/* ================================================= */}

                    {(!oRequestData.approved && !oRequestData.rejected) ? (
                        // IF PENDING: Show the Interactive Form
                        <AppCard oStyle={{border: '2px solid #007bff', boxShadow: '0 4px 15px rgba(0,123,255,0.15)'}}>
                            <h3 style={{...headerStyle, color: '#007bff', borderBottomColor: '#cce5ff'}}>
                                👮 Admin Decision
                            </h3>

                            {!oRequestData.ownerHosting && (
                                <div style={{ marginBottom: '20px', padding: '15px', background: '#eef6fc', borderRadius: '4px' }}>
                                    <label style={{...subLabelStyle, color: '#0056b3'}}>💾 Platform Storage Allocation</label>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px'}}>
                                        <span style={{fontSize: '14px'}}>Max Storage Limit (GB):</span>
                                        <AppTextInput
                                            type="number"
                                            sValue={iMaxStorage}
                                            fnOnChange={(e) => setIMaxStorage(e.target.value)}
                                            oStyle={{width: '100px', fontWeight: 'bold', borderColor: '#007bff'}}
                                        />
                                    </div>
                                </div>
                            )}

                            <div style={{marginBottom: '20px'}}>
                                <label style={subLabelStyle}>Admin Note (Required for Rejection)</label>
                                <AppTextArea
                                    sValue={sAdminNote}
                                    fnOnChange={(e) => { setSAdminNote(e.target.value); if (sError) setError(null); }}
                                    sPlaceholder="Enter feedback for the user here..."
                                    iRows={3}
                                    oStyle={sError ? {borderColor: 'red'} : {}}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                                <AppButton sVariant="outline" oStyle={{borderColor: '#dc3545', color: '#dc3545'}} fnOnClick={handleReject} disabled={bIsSubmitting}>
                                    {bIsSubmitting ? "Processing..." : "❌ Reject Request"}
                                </AppButton>
                                <AppButton sVariant="success" fnOnClick={handleApprove} disabled={bIsSubmitting}>
                                    {bIsSubmitting ? "Processing..." : "✅ Approve Project"}
                                </AppButton>
                            </div>
                        </AppCard>
                    ) : (
                        // IF ALREADY DECIDED: Show the Read-Only Result
                        <AppCard oStyle={{border: oRequestData.approved ? '2px solid #28a745' : '2px solid #dc3545'}}>
                            <h3 style={{...headerStyle, color: oRequestData.approved ? '#28a745' : '#dc3545'}}>
                                {oRequestData.approved ? "✅ Request Approved" : "❌ Request Rejected"}
                            </h3>
                            <div style={{ padding: '20px', background: oRequestData.approved ? '#d4edda' : '#f8d7da', borderRadius: '4px' }}>
                                <div style={{ fontSize: '15px', marginBottom: oRequestData.rejected ? '10px' : '0' }}>
                                    This request has been <strong>{oRequestData.approved ? "Approved" : "Rejected"}</strong> by an administrator.
                                </div>

                                {/* Show the note only if it was rejected and a note exists */}
                                {oRequestData.rejected && oRequestData.rejectionNote && (
                                    <div style={{ marginTop: '10px', padding: '15px', background: 'white', borderRadius: '4px', border: '1px solid #f5c6cb' }}>
                                        <strong style={{ color: '#721c24' }}>Admin Feedback:</strong>
                                        <p style={{ margin: '5px 0 0 0', color: '#333' }}>{oRequestData.rejectionNote}</p>
                                    </div>
                                )}
                            </div>
                        </AppCard>
                    )}

                </div>
            </div>
        </div>
    );
};

// --- STYLES ---
const headerStyle = { margin: '0 0 15px 0', fontSize: '18px', color: '#444', borderBottom: '1px solid #eee', paddingBottom: '10px' };
const subLabelStyle = {fontWeight: 'bold', fontSize: '13px', color: '#555'};
const gridStyle = {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'};

export default ApproveProject;
