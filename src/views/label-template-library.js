import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';

// REUSABLE COMPONENTS
import AppCard from '../components/app-card';
import AppButton from '../components/app-button';
import AppTextInput from '../components/app-text-input';

const LabelTemplatesLibrary = () => {
    const navigate = useNavigate();
    const sCurrentUserId = "jihed_123"; // Simulate logged-in user

    // 1. DUMMY DATA
    const [aoTemplates, setAoTemplates] = useState([
        {id: 1, name: "Building Footprints", createdAt: "2023-10-10", creator: "jihed_123", geometry: "Polygon"},
        {id: 2, name: "Road Network", createdAt: "2023-09-15", creator: "sarah_99", geometry: "Polyline"},
        {id: 3, name: "Points of Interest", createdAt: "2023-08-20", creator: "mike_007", geometry: "Point"},
    ]);

    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this template?")) {
            setAoTemplates(aoTemplates.filter(t => t.id !== id));
        }
    };

    return (
        <div style={{padding: '30px', background: '#f4f6f8', minHeight: '100vh'}}>

            {/* HEADER */}
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
                <div>
                    <h2 style={{margin: 0, color: '#333'}}>📚 Label Templates Library</h2>
                    <p style={{margin: '5px 0 0 0', color: '#666', fontSize: '14px'}}>Manage standard schemas for your
                        projects.</p>
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
                        <AppTextInput sPlaceholder="Search templates..."/>
                    </div>
                </div>

                {/* TABLE */}
                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
                    <thead style={{background: '#f9f9f9', borderBottom: '2px solid #eee'}}>
                    <tr style={{textAlign: 'left', color: '#555'}}>
                        <th style={thStyle}>Template Name</th>
                        <th style={thStyle}>Geometry</th>
                        <th style={thStyle}>Created At</th>
                        <th style={thStyle}>Creator</th>
                        <th style={{...thStyle, textAlign: 'right'}}>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {aoTemplates.map((item, index) => (
                        <tr key={item.id} style={{borderBottom: '1px solid #eee', background: 'white'}}>
                            <td style={tdStyle}>
                                <strong>{item.name}</strong>
                            </td>
                            <td style={tdStyle}>
                                    <span style={{
                                        padding: '4px 8px',
                                        background: '#e6f7ff',
                                        color: '#1890ff',
                                        borderRadius: '4px',
                                        fontSize: '12px'
                                    }}>
                                        {item.geometry}
                                    </span>
                            </td>
                            <td style={tdStyle}>{item.createdAt}</td>
                            <td style={tdStyle}>{item.creator}</td>
                            <td style={{...tdStyle, textAlign: 'right'}}>
                                <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                                    <AppButton sVariant="outline" oStyle={{padding: '6px 12px', fontSize: '12px'}}>
                                        View
                                    </AppButton>

                                    {/* Logic: Only Creator can Edit/Delete */}
                                    {item.creator === sCurrentUserId && (
                                        <>
                                            <AppButton sVariant="primary"
                                                       oStyle={{padding: '6px 12px', fontSize: '12px'}}>
                                                Edit
                                            </AppButton>
                                            <AppButton
                                                sVariant="danger"
                                                oStyle={{padding: '6px 12px', fontSize: '12px'}}
                                                fnOnClick={() => handleDelete(item.id)}
                                            >
                                                Delete
                                            </AppButton>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </AppCard>
        </div>
    );
};

// Styles
const thStyle = {padding: '15px 20px', fontWeight: 'bold'};
const tdStyle = {padding: '15px 20px', color: '#333'};

export default LabelTemplatesLibrary;
