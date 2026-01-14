import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';

// 1. COMPONENTS
import MapboxMap from '../components/MapboxMap';
import AppCard from '../components/app-card';
import AppTextInput from '../components/app-text-input'; // <--- Your renamed component
import AppTextArea from '../components/app-text-area';
import AppSelect from '../components/app-dropdown-input';
import AppCheckbox from '../components/app-checkbox';
import AppRadioButton from '../components/app-radiobutton';
import AppButton from '../components/app-button';
import AppDateInput from "../components/app-date-input";

const NewProjectRequest = () => {
    const navigate = useNavigate();

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

        // Handle Tasks Object
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

    const handleSave = (e) => {
        e.preventDefault();
        console.log("Saving:", formData);
        alert("Project Created!");
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
            <div style={{padding: '20px', background: 'white', borderBottom: '1px solid #ddd', marginBottom: '20px'}}>
                <h2 style={{margin: 0, color: '#333'}}>🆕 Create New Project Request</h2>
            </div>

            <div style={{padding: '0 30px 30px 30px', maxWidth: '1000px', margin: '0 auto', width: '100%'}}>
                <form onSubmit={handleSave} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>

                    {/* --- 1. GENERAL INFO --- */}
                    <AppCard>
                        <h3 style={headerStyle}>1. General Information</h3>

                        <div style={gridStyle}>
                            <AppTextInput
                                sName="name"
                                sPlaceholder="Project Name"
                                fnOnChange={handleInputChange}
                                required
                            />
                            <AppTextInput
                                sName="link"
                                type="url"
                                sPlaceholder="External Link (Optional)"
                                fnOnChange={handleInputChange}
                            />
                        </div>

                        <div style={{marginTop: '15px'}}>
                            <AppTextArea
                                sName="description"
                                sPlaceholder="Project Description..."
                                fnOnChange={handleInputChange}
                            />
                        </div>

                        {/* Dates */}
                        <div style={{ ...gridStyle, marginTop: '15px' }}>

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
                                sValue={formData.startDate} // Don't forget to bind the value!
                                fnOnChange={handleInputChange}
                            />

                            <AppDateInput
                                sLabel="End Date"
                                sName="endDate"
                                sValue={formData.endDate} // Don't forget to bind the value!
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
                                height: '400px',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                border: '1px solid #ccc'
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
                            <AppSelect
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
                        >
                            Cancel
                        </AppButton>
                        <AppButton
                            type="submit"
                            sVariant="success"
                        >
                            Create Project
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
