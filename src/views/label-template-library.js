import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';

// REUSABLE COMPONENTS
import AppCard from '../components/app-card';
import AppButton from '../components/app-button';
import AppTextInput from '../components/app-text-input';
import {getLabelTemplates} from "../services/labelling-template-service";

const LabelTemplatesLibrary = () => {
    const navigate = useNavigate();
    const sCurrentUserId = "jihed-admin";

    // 1. STATE MANAGEMENT
    const [aoLabelTemplates, setLabelTemplates] = useState([]);
    const [bIsLoading, setBIsLoading] = useState(true);
    const [sError, setSError] = useState(null);
    const [sSearchText, setSSearchText] = useState("");

    // 2. FETCH DATA
    useEffect(() => {
        const loadLabelTemplates = async () => {
            try {
                setBIsLoading(true);
                const aoData = await getLabelTemplates();
                setLabelTemplates(aoData || []);
            } catch (error) {
                console.error("Failed to load templates:", error);
                setSError("Could not load templates. Please try again.");
            } finally {
                setBIsLoading(false);
            }
        };
        loadLabelTemplates();
    }, []);

    // 3. HANDLERS
    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this template?")) {
            const updatedList = aoLabelTemplates.filter(t => t.templateId !== id);
            setLabelTemplates(updatedList);
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "N/A";

        // Multiply by 1000 to convert seconds to milliseconds
        return new Date(Number(timestamp) * 1000).toLocaleDateString("en-GB", {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    const filteredTemplates = aoLabelTemplates.filter(item =>
        item.name.toLowerCase().includes(sSearchText.toLowerCase())
    );

    // --- RENDER ---
    // Note: No background color or minHeight here. Layout handles it.
    return (
        <div style={{padding: '10px'}}>
            {/* HEADER */}
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
                <div>
                    <h2 style={{margin: 0, color: '#333'}}>📚 Label Templates Library</h2>
                    <p style={{margin: '5px 0 0 0', color: '#666', fontSize: '14px'}}>
                        Manage standard schemas for your projects.
                    </p>
                </div>
                <AppButton sVariant="success" fnOnClick={() => navigate('/create-label-template')}>
                    + Create New Template
                </AppButton>
            </div>

            {/* MAIN CARD */}
            <AppCard oStyle={{padding: 0, overflow: 'hidden'}}>
                {/* TOOLBAR */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <div style={{width: '300px'}}>
                        <AppTextInput
                            value={sSearchText}
                            onChange={(e) => setSSearchText(e.target.value)}
                            sPlaceholder="Search templates..."
                        />
                    </div>
                </div>

                {/* --- STATES (Loading, Error, Table) --- */}
                {bIsLoading && (
                    <div style={{padding: '40px', textAlign: 'center', color: '#666'}}>
                        ⏳ Loading templates...
                    </div>
                )}

                {sError && (
                    <div style={{padding: '40px', textAlign: 'center', color: '#dc3545'}}>
                        ⚠️ {sError}
                    </div>
                )}

                {!bIsLoading && !sError && (
                    <>
                        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
                            <thead style={{background: '#f9f9f9', borderBottom: '2px solid #eee'}}>
                            <tr style={{textAlign: 'left', color: '#555'}}>
                                <th style={thStyle}>Template Name</th>
                                <th style={thStyle}>Created At</th>
                                <th style={thStyle}>Creator</th>
                                <th style={{...thStyle, textAlign: 'right'}}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredTemplates.map((item) => (
                                <tr key={item.templateId} style={{borderBottom: '1px solid #eee', background: 'white'}}>
                                    <td style={tdStyle}><strong>{item.name}</strong></td>
                                    <td style={tdStyle}>{formatDate(item.creationDate)}</td>
                                    <td style={tdStyle}>{item.user}</td>
                                    <td style={{...tdStyle, textAlign: 'right'}}>
                                        <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                                            <AppButton sVariant="outline"
                                                       oStyle={{padding: '6px 12px', fontSize: '12px'}}>View</AppButton>
                                            {item.user === sCurrentUserId && (
                                                <>
                                                    <AppButton sVariant="primary" oStyle={{
                                                        padding: '6px 12px',
                                                        fontSize: '12px'
                                                    }}>Edit</AppButton>
                                                    <AppButton sVariant="danger"
                                                               oStyle={{padding: '6px 12px', fontSize: '12px'}}
                                                               fnOnClick={() => handleDelete(item.templateId)}>Delete</AppButton>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        {filteredTemplates.length === 0 && (
                            <div style={{padding: '40px', textAlign: 'center', color: '#999'}}>
                                No templates found.
                            </div>
                        )}
                    </>
                )}
            </AppCard>
        </div>
    );
};

const thStyle = {padding: '15px 20px', fontWeight: 'bold'};
const tdStyle = {padding: '15px 20px', color: '#333'};

export default LabelTemplatesLibrary;
