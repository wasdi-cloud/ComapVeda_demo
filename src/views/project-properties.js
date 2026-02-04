import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// REUSABLE COMPONENTS
import AppCard from '../components/app-card';
import AppButton from '../components/app-button';
import AppTextInput from '../components/app-text-input';
import AppCheckbox from '../components/app-checkbox';
import AppSelect from '../components/app-dropdown-input';

const ProjectPropertiesPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // 1. Get Data Passed from EditProject
    // If someone goes to this URL directly without clicking the button, fallback to defaults
    const initialData = location.state?.projectData || {
        name: "New Project",
        description: "",
        mission: "Sentinel-2",
        creationDate: new Date().toISOString().split('T')[0],
        labelTemplate: "",
        isPublic: false,
        projectLink: "",
        aoiSummary: "N/A",
        tasks: "",
        annotatorVisibility: "all"
    };

    const hasLabels = location.state?.hasLabels || false;

    const [formData, setFormData] = useState(initialData);

    const handleSave = () => {
        // In a real app, you would send an API request here
        console.log("Saving Properties:", formData);

        // Go back to the project and pass the updated data back!
        navigate('/edit-project', {
            state: {
                projectTitle: formData.name, // Pass back new name
                // You might need to pass other updated props back depending on your app flow
            }
        });
    };

    const handleCancel = () => {
        navigate(-1); // Go back to previous page
    };

    return (
        <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>

            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, color: '#333' }}>⚙️ Project Properties</h2>
                <AppButton sVariant="outline" fnOnClick={handleCancel}>Cancel / Go Back</AppButton>
            </div>

            <AppCard>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                    {/* A. Name */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <AppTextInput
                            sLabel="Project Name"
                            sValue={formData.name}
                            fnOnChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>

                    {/* B. Description */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>Description</label>
                        <textarea
                            style={textAreaStyle}
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    {/* C. & D. Read Only Info */}
                    <AppTextInput sLabel="Mission" sValue={formData.mission} disabled={true} />
                    <AppTextInput sLabel="Creation Date" sValue={formData.creationDate} disabled={true} />

                    {/* E. Template */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>Label Template</label>
                        <AppSelect
                            sValue={formData.labelTemplate}
                            fnOnChange={(e) => setFormData({...formData, labelTemplate: e.target.value})}
                            aoOptions={["Land Use V1", "Urban Planning", "Flood Damage Schema"]}
                            disabled={hasLabels}
                        />
                        {hasLabels && <div style={{fontSize:'11px', color:'orange'}}>⚠️ Cannot change: labels exist.</div>}
                    </div>

                    {/* F. Visibility */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <AppCheckbox
                            sLabel="Make Project Public"
                            bChecked={formData.isPublic}
                            fnOnChange={(e) => setFormData({...formData, isPublic: e.target.checked})}
                        />
                    </div>

                    {/* J. Annotator Settings */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>Annotator Visibility</label>
                        <div style={{ display: 'flex', gap: '20px', marginTop: '5px' }}>
                            <label style={{cursor: 'pointer', fontSize:'13px'}}>
                                <input type="radio" name="visibility" checked={formData.annotatorVisibility === 'all'} onChange={() => setFormData({...formData, annotatorVisibility: 'all'})} /> See All
                            </label>
                            <label style={{cursor: 'pointer', fontSize:'13px'}}>
                                <input type="radio" name="visibility" checked={formData.annotatorVisibility === 'own'} onChange={() => setFormData({...formData, annotatorVisibility: 'own'})} /> See Own Only
                            </label>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee', textAlign: 'right' }}>
                    <AppButton sVariant="primary" fnOnClick={handleSave} oStyle={{width: '150px'}}>
                        Save Changes
                    </AppButton>
                </div>
            </AppCard>
        </div>
    );
};

const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#555' };
const textAreaStyle = { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '80px', fontFamily: 'inherit' };

export default ProjectPropertiesPage;
