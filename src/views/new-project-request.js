import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';

// 1. COMPONENTS
import MapboxMap from '../components/MapboxMap';
import AppCard from '../components/app-card';
import AppTextInput from '../components/app-text-input'; // <--- Your renamed component
import AppTextArea from '../components/app-text-area';
import AppCheckbox from '../components/app-checkbox';
import AppButton from '../components/app-button';
import AppDateInput from "../components/app-date-input";
import {createProject} from "../services/project-service";
import AppRadioButton from "../components/app-radiobutton";
import AppDropdown from "../components/app-dropdown-input";

const NewProjectRequest = () => {
    const navigate = useNavigate();

    // --- UI STATES (NEW) ---
    const [bIsSubmitting, setIsSubmitting] = useState(false);
    const [sErrorMessage, setErrorMessage] = useState(null);
    const [bShowSuccessModal, setShowSuccessModal] = useState(false); // Controls the popup

    // --- FORM STATE ---
    const [formData, setFormData] = useState({
        name: '', description: '', link: '',
        creationDate: new Date().toISOString().split('T')[0],
        startDate: '', endDate: '',
        isPublic: false, isGlobal: true,
        annotatorScope: 'all', reviewRequired: false, minReviews: 1,
        eoMission: 'Sentinel-2',
        tasks: {segmentation: false, detection: false, classification: false, other: false},
        ownerHosting: false, s3User: '', s3Password: '', s3Url: '',
        aoiGeometry: null
    });

    // --- HANDLERS ---
    const handleInputChange = (e) => {
        const {name, value, type, checked} = e.target;

        // Clear errors when user starts typing again
        if (sErrorMessage) setErrorMessage(null);

        if (name.startsWith('task_')) {
            const taskName = name.split('_')[1];
            setFormData(prev => ({
                ...prev,
                tasks: {...prev.tasks, [taskName]: checked}
            }));
            return;
        }

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleAoiDraw = (drawData) => {
        setFormData(prev => ({...prev, aoiGeometry: drawData}));
    };

    // --- HELPER: Convert Date String (YYYY-MM-DD) to Epoch Milliseconds ---
    const toEpochMillis = (dateString) => {
        if (!dateString) return null;
        return new Date(dateString).getTime();
    };

    // --- HELPER: Convert GeoJSON/Draw Data to WKT (Simplified) ---
    // Note: In a real app, use a library like @terraformer/wkt or wellknown
    const toWKT = (geometry) => {
        if (!geometry || !geometry.coordinates) return null;

        // Assuming geometry is a simple Polygon from Mapbox Draw
        // Structure: [[[lon, lat], [lon, lat], ...]]
        const ring = geometry.coordinates[0];
        const coordString = ring.map(pt => `${pt[0]} ${pt[1]}`).join(", ");

        return `POLYGON((${coordString}))`;
    };

    // --- MAIN SAVE HANDLER ---
    const handleSave = async (e) => {
        e.preventDefault();
        setErrorMessage(null);

        // 1. VALIDATION (Client Side)
        if (!formData.name.trim()) return setErrorMessage("Project Name is required.");
        if (!formData.startDate) return setErrorMessage("Start Date is required.");
        if (formData.isOwnerHosting && (!formData.s3User || !formData.s3Password || !formData.s3Url)) {
            return setErrorMessage("All Hosting fields (User, Password, URL) are required.");
        }
        if (formData.reviewRequired && (!formData.minReviews || formData.minReviews <= 0)) {
            return setErrorMessage("Please specify a valid number of reviewers.");
        }
        if (!formData.isGlobal && !formData.aoiGeometry) {
            return setErrorMessage("Please draw the Area of Interest (AOI).");
        }

        try {
            setIsSubmitting(true);

            // 2. DATA TRANSFORMATION (React State -> Python Model)
            const tasksList = Object.keys(formData.tasks).filter(key => formData.tasks[key]);

            // Map the React state to the Python "ProjectCreate" Pydantic fields
            const oPayload = {
                // --- Basic Info ---
                name: formData.name,
                description: formData.description || null,
                link: formData.link || null,
                isPublic: formData.isPublic,

                // --- Dates (Convert to Epoch Millis) ---
                creationDate: Date.now(), // Current time in millis
                datasetStartDate: toEpochMillis(formData.startDate),
                datasetEndDate: toEpochMillis(formData.endDate),

                // --- Spatial ---
                isGlobalAoI: formData.isGlobal,
                // Only send bbox (WKT) if it is NOT global
                bbox: formData.isGlobal ? null : toWKT(formData.aoiGeometry),

                // --- Annotations & Review ---
                // Python expects bool: "all" -> True, "own" -> False
                hasAnnotatorGlobalView: formData.annotatorScope === 'all',
                doesNeedReview: formData.reviewRequired,
                reviewersNumber: formData.reviewRequired ? parseInt(formData.minReviews) : null,

                // --- Data Config ---
                mission: formData.eoMission,
                tasks: tasksList, // Array of strings ["segmentation", "detection"]
                // Assuming you handle the file upload separately and get a template name
                labellingTemplate: "Standard_Template_v1", // Hardcoded for now, or use a state variable

                // --- Hosting ---
                isOwnerHosting: formData.ownerHosting,
                hostingUsername: formData.ownerHosting ? formData.s3User : null,
                hostingPassword: formData.ownerHosting ? formData.s3Password : null,
                hostingUrl: formData.ownerHosting ? formData.s3Url : null,
            };

            console.log("Sending Payload to Python:", oPayload); // Debugging

            // 3. API CALL
            // Pass 'oPayload' instead of 'formData'
            await createProject(oPayload);

            setShowSuccessModal(true);
        } catch (error) {
            console.error("Save failed:", error);
            setErrorMessage(error.message || "An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- NEW: POPUP ACTION ---
    const closePopupAndNavigate = () => {
        setShowSuccessModal(false);
        navigate('/'); // Go back to home
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
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)', textAlign: 'center', width: '300px'
                    }}>
                        <div style={{fontSize: '40px', marginBottom: '10px'}}>✅</div>
                        <h3 style={{margin: '0 0 10px 0', color: '#333'}}>Success!</h3>
                        <p style={{color: '#666', marginBottom: '20px'}}>Request was created successfully.</p>
                        <AppButton sVariant="primary" fnOnClick={closePopupAndNavigate}>
                            OK, Great
                        </AppButton>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div style={{padding: '20px', background: 'white', borderBottom: '1px solid #ddd', marginBottom: '20px'}}>
                <h2 style={{margin: 0, color: '#333'}}>🆕 Create New Project Request</h2>
            </div>

            <div style={{padding: '0 30px 30px 30px', maxWidth: '1000px', margin: '0 auto', width: '100%'}}>

                {/* --- NEW: ERROR BANNER --- */}
                {sErrorMessage && (
                    <div style={{
                        padding: '15px', background: '#fdeded', color: '#5f2120',
                        border: '1px solid #f5c6cb', borderRadius: '4px', marginBottom: '20px'
                    }}>
                        ⚠️ <strong>Error:</strong> {sErrorMessage}
                    </div>
                )}

                <form onSubmit={handleSave} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>

                    {/* --- 1. GENERAL INFO --- */}
                    <AppCard>
                        <h3 style={headerStyle}>1. General Information</h3>

                        <div style={gridStyle}>
                            <AppTextInput
                                sName="name"
                                sValue={formData.name} // Ensure value is bound
                                sPlaceholder="Project Name *"
                                fnOnChange={handleInputChange}
                                // We handled manual validation, but HTML required is good backup
                                required
                            />
                            <AppTextInput
                                sName="link"
                                sValue={formData.link}
                                type="url"
                                sPlaceholder="External Link (Optional)"
                                fnOnChange={handleInputChange}
                            />
                        </div>

                        <div style={{marginTop: '15px'}}>
                            <AppTextArea
                                sName="description"
                                sValue={formData.description}
                                sPlaceholder="Project Description *"
                                fnOnChange={handleInputChange}
                            />
                        </div>

                        {/* Dates */}
                        <div style={{...gridStyle, marginTop: '15px'}}>
                            <AppDateInput
                                sLabel="Creation Date"
                                sName="creationDate"
                                sValue={formData.creationDate}
                                fnOnChange={handleInputChange}
                                bRequired={true}
                            />
                            <AppDateInput
                                sLabel="Start Date"
                                sName="startDate"
                                sValue={formData.startDate}
                                fnOnChange={handleInputChange}
                            />
                            <AppDateInput
                                sLabel="End Date"
                                sName="endDate"
                                sValue={formData.endDate}
                                fnOnChange={handleInputChange}
                            />
                        </div>

                        {/* Toggles */}
                        <div style={{display: 'flex', gap: '30px', marginTop: '20px'}}>
                            <AppCheckbox
                                sName="isPublic"
                                sLabel="Make Project Public"
                                bChecked={formData.isPublic}
                                fnOnChange={handleInputChange}
                            />
                            <AppCheckbox
                                sName="isGlobal"
                                sLabel="Project Area is Global"
                                bChecked={formData.isGlobal}
                                fnOnChange={handleInputChange}
                            />
                        </div>
                    </AppCard>

                    {/* --- 2. MAP (AOI) --- */}
                    {!formData.isGlobal && (
                        <AppCard>
                            <h3 style={headerStyle}>2. Area of Interest (AOI)</h3>
                            <div style={{
                                height: '400px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #ccc'
                            }}>
                                <MapboxMap
                                    aoMarkers={[]}
                                    oInitialView={{latitude: 20, longitude: 0, zoom: 1.5}}
                                    onDrawUpdate={handleAoiDraw}
                                    bEnableDraw={true}
                                    bEnableGeocoder={true}
                                />
                            </div>
                        </AppCard>
                    )}

                    {/* --- 3. LABELLING PROTOCOL --- */}
                    <AppCard oStyle={{background: '#f0f7ff', border: '1px solid #cce5ff'}}>
                        <h3 style={{...headerStyle, color: '#0056b3', borderBottomColor: '#cce5ff'}}>3. Labelling
                            Protocol</h3>

                        <div style={{marginBottom: '15px'}}>
                            <label style={subLabelStyle}>Annotator Visibility:</label>
                            <div style={{display: 'flex', gap: '20px', marginTop: '5px'}}>
                                <AppRadioButton
                                    sName="annotatorScope"
                                    sValue="all"
                                    sLabel="Can see all labels"
                                    bChecked={formData.annotatorScope === 'all'}
                                    fnOnChange={handleInputChange}
                                />
                                <AppRadioButton
                                    sName="annotatorScope"
                                    sValue="own"
                                    sLabel="Only their own labels"
                                    bChecked={formData.annotatorScope === 'own'}
                                    fnOnChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                            <AppCheckbox
                                sName="reviewRequired"
                                sLabel="Review Required"
                                bChecked={formData.reviewRequired}
                                fnOnChange={handleInputChange}
                            />

                            {formData.reviewRequired && (
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                    <span style={{fontSize: '14px'}}>Min Reviews:</span>
                                    <AppTextInput
                                        sName="minReviews"
                                        type="number"
                                        sValue={formData.minReviews}
                                        fnOnChange={handleInputChange}
                                        oStyle={{width: '60px'}}
                                    />
                                </div>
                            )}
                        </div>
                    </AppCard>

                    {/* --- 4. DATA CONFIG --- */}
                    <AppCard>
                        <h3 style={headerStyle}>4. Data Configuration</h3>

                        <div style={{marginBottom: '15px'}}>
                            <label style={subLabelStyle}>EO Mission</label>
                            <AppDropdown
                                sValue={formData.eoMission}
                                fnOnChange={handleInputChange}
                                aoOptions={["Sentinel-2", "Landsat-8", "Custom High-Res"]}
                                oStyle={{width: '100%', marginTop: '5px'}}
                            />
                        </div>

                        <div style={{marginBottom: '15px'}}>
                            <label style={subLabelStyle}>Tasks</label>
                            <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '8px'}}>
                                {['Semantic Segmentation', 'Object Detection', 'Image Classification', 'Other'].map(task => (
                                    <AppCheckbox
                                        key={task}
                                        sName={`task_${task.split(' ')[0].toLowerCase()}`}
                                        sLabel={task}
                                        fnOnChange={handleInputChange}
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                            <label style={subLabelStyle}>Labelling Template</label>
                            <input type="file" style={{display: 'block', marginTop: '5px', fontSize: '14px'}}/>
                        </div>
                    </AppCard>

                    {/* --- 5. STORAGE --- */}
                    <AppCard>
                        <h3 style={headerStyle}>5. Storage & Hosting</h3>

                        <div style={{marginBottom: '15px'}}>
                            <AppCheckbox
                                sName="ownerHosting"
                                sLabel="Owner Provided Hosting (S3)"
                                bChecked={formData.ownerHosting}
                                fnOnChange={handleInputChange}
                            />
                        </div>

                        {formData.ownerHosting && (
                            <div style={{
                                padding: '15px',
                                background: '#f9f9f9',
                                borderRadius: '4px',
                                border: '1px solid #eee'
                            }}>
                                <div style={gridStyle}>
                                    <AppTextInput sName="s3User" sPlaceholder="S3 User / Key"
                                                  fnOnChange={handleInputChange}/>
                                    <AppTextInput sName="s3Password" type="password" sPlaceholder="S3 Secret"
                                                  fnOnChange={handleInputChange}/>
                                </div>
                                <div style={{marginTop: '15px'}}>
                                    <AppTextInput sName="s3Url" sPlaceholder="S3 Bucket URL"
                                                  fnOnChange={handleInputChange}/>
                                </div>
                            </div>
                        )}
                    </AppCard>

                    {/* --- ACTIONS --- */}
                    <div style={{display: 'flex', justifyContent: 'flex-end', gap: '15px', paddingBottom: '30px'}}>
                        <AppButton
                            sVariant="outline"
                            fnOnClick={() => navigate('/')}
                            disabled={bIsSubmitting}
                        >
                            Cancel
                        </AppButton>
                        <AppButton
                            type="submit"
                            sVariant="success"
                            disabled={bIsSubmitting} // Disable while sending
                        >
                            {bIsSubmitting ? 'Creating...' : 'Create Project'}
                        </AppButton>
                    </div>

                </form>
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
const gridStyle = {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'};

export default NewProjectRequest;
