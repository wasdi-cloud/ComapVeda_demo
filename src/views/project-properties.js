import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// REUSABLE COMPONENTS
import AppCard from '../components/app-card';
import AppButton from '../components/app-button';
import AppTextInput from '../components/app-text-input';
import AppCheckbox from '../components/app-checkbox';

// SERVICES
import { updateProject } from "../services/project-service";
import { getLabelTemplates } from "../services/labelling-template-service";

const ProjectPropertiesPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // 1. Get Data Passed from EditProject
    const oProjectState = location.state?.projectData;
    const bHasLabelTemplate = location.state?.hasLabelTemplate || false;

    // Safety fallback
    const oDefaultProject = {
        id: "", name: "Unknown", description: "", mission: "Unknown",
        creationDate: "", labelTemplate: "", isPublic: false, annotatorVisibility: "all"
    };

    const oInitialData = oProjectState ? oProjectState : oDefaultProject;

    const [formData, setFormData] = useState(oInitialData);


    const [bIsSaving, setIsSaving] = useState(false);
    const [sError, setError] = useState(null);

    // Templates State (to populate the real dropdown)
    const [aoTemplates, setAoTemplates] = useState([]);

    // --- LOAD REAL TEMPLATES FOR DROPDOWN ---
    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const data = await getLabelTemplates();
                setAoTemplates(data || []);
            } catch (error) {
                console.error("Failed to load templates", error);
            }
        };
        fetchTemplates();
    }, []);

    // --- SAVE HANDLER ---
    const handleSave = async () => {
        setError(null);
        setIsSaving(true);

        try {
            // 1. Map React State to Python ViewModel
            const oPayload = {
                name: formData.name,
                description: formData.description || null,
                isPublic: formData.isPublic,
                hasAnnotatorGlobalView: formData.annotatorVisibility === 'all',
                labellingTemplate: formData.labelTemplate || null
            };

            // 2. Call the API
            await updateProject(formData.id, oPayload);

            // 3. Navigate back to Edit Project, passing the ID and new Title
            navigate('/edit-project', {
                state: {
                    projectId: formData.id,
                    projectTitle: formData.name // Send the newly updated name back!
                }
            });

        } catch (error) {
            console.error("Failed to save:", error);
            setError(error.message || "An error occurred while saving the project.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        navigate(-1); // Go back to previous page safely
    };

    return (
        <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>

            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, color: '#333' }}>⚙️ Project Properties</h2>
                <AppButton sVariant="outline" fnOnClick={handleCancel} disabled={bIsSaving}>Cancel / Go Back</AppButton>
            </div>

            {sError && (
                <div style={{ padding: '15px', background: '#fdeded', color: '#5f2120', border: '1px solid #f5c6cb', borderRadius: '4px', marginBottom: '20px' }}>
                    ⚠️ {sError}
                </div>
            )}

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

                    {/* Format the Unix timestamp nicely if needed, or leave disabled */}
                    <AppTextInput sLabel="Creation Date (Unix ms)" sValue={formData.creationDate} disabled={true} />

                    {/* E. Template */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>Label Template</label>
                        <select
                            value={formData.labelTemplate}
                            onChange={(e) => setFormData({...formData, labelTemplate: e.target.value})}
                            disabled={bHasLabelTemplate} // <-- This fulfills your Use Case perfectly!
                            style={{
                                width: '100%', padding: '10px', borderRadius: '4px',
                                border: '1px solid #ccc',
                                backgroundColor: bHasLabelTemplate ? '#f5f5f5' : '#fff',
                                cursor: bHasLabelTemplate ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <option value="" disabled>-- Select Template --</option>
                            {aoTemplates.map(t => (
                                <option key={t.id || t.templateId} value={t.id || t.templateId}>
                                    {t.name}
                                </option>
                            ))}
                        </select>
                        {bHasLabelTemplate && <div style={{fontSize:'11px', color:'orange', marginTop: '4px'}}>
                            ⚠️ Cannot change: labels already exist on this project.
                        </div>}
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
                    <AppButton sVariant="primary" fnOnClick={handleSave} oStyle={{width: '150px'}} disabled={bIsSaving}>
                        {bIsSaving ? "Saving..." : "Save Changes"}
                    </AppButton>
                </div>
            </AppCard>
        </div>
    );
};

const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#555' };
const textAreaStyle = { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '80px', fontFamily: 'inherit' };

export default ProjectPropertiesPage;
