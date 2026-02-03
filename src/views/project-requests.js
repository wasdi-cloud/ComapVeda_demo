import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// REUSABLE COMPONENTS
import AppCard from '../components/app-card';
import AppButton from '../components/app-button';
import AppTextInput from '../components/app-text-input';

// --- HARDCODED MOCK DATA FOR DEMO ---
const MOCK_REQUESTS = [
    { id: 101, projectName: "Amazon Rainforest Monitoring", requester: "Sarah Miller", date: "2023-10-25", status: "Pending", description: "Deforestation analysis in Sector 7." },
    { id: 102, projectName: "Urban Expansion - Berlin", requester: "Mike Ross", date: "2023-10-24", status: "Approved", description: "Tracking urban sprawl over 5 years." },
    { id: 103, projectName: "Nile Delta Agriculture", requester: "Ahmed Ali", date: "2023-10-22", status: "Rejected", description: "Crop yield estimation." },
    { id: 104, projectName: "California Wildfire Damage", requester: "Emily Clark", date: "2023-10-20", status: "Pending", description: "Post-fire assessment." },
    { id: 105, projectName: "Tokyo Port Logistics", requester: "Kenji Sato", date: "2023-10-18", status: "Approved", description: "Container traffic monitoring." },
];

const ProjectRequests = () => {
    const navigate = useNavigate();

    // 1. STATE
    const [aoRequests, setRequests] = useState(MOCK_REQUESTS);
    const [sSearchText, setSSearchText] = useState("");



    const handleView = (project) => {
        // Navigate to edit project, passing mock details
        navigate('/approve-project', {
            state: {
                projectTitle: project.projectName,
                projectId: project.id
            }
        });
    };

    // 3. FILTERING
    const filteredRequests = aoRequests.filter(item =>
        item.projectName.toLowerCase().includes(sSearchText.toLowerCase()) ||
        item.requester.toLowerCase().includes(sSearchText.toLowerCase())
    );

    // Helper for Status Badge Color
    const getStatusBadge = (status) => {
        let styles = { padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' };
        if (status === 'Approved') {
            return <span style={{ ...styles, background: '#d4edda', color: '#155724' }}>Approved</span>;
        } else if (status === 'Rejected') {
            return <span style={{ ...styles, background: '#f8d7da', color: '#721c24' }}>Rejected</span>;
        } else {
            return <span style={{ ...styles, background: '#fff3cd', color: '#856404' }}>Pending</span>;
        }
    };

    return (
        <div style={{ padding: '10px' }}>
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#333' }}>✅ Project Requests</h2>
                    <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                        Review and approve new project submissions.
                    </p>
                </div>
            </div>

            {/* MAIN CARD */}
            <AppCard oStyle={{ padding: 0, overflow: 'hidden' }}>

                {/* TOOLBAR */}
                <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems:'center' }}>
                    <div style={{ width: '300px' }}>
                        <AppTextInput
                            sValue={sSearchText}
                            fnOnChange={(e) => setSSearchText(e.target.value)}
                            sPlaceholder="Search by project or requester..."
                        />
                    </div>
                    <div style={{fontSize:'13px', color:'#666'}}>
                        Showing <strong>{filteredRequests.length}</strong> requests
                    </div>
                </div>

                {/* TABLE */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead style={{ background: '#f9f9f9', borderBottom: '2px solid #eee' }}>
                    <tr style={{ textAlign: 'left', color: '#555' }}>
                        <th style={thStyle}>Project Name</th>
                        <th style={thStyle}>Requester</th>
                        <th style={thStyle}>Date</th>
                        <th style={thStyle}>Status</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredRequests.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #eee', background: 'white' }}>
                            <td style={tdStyle}>
                                <strong>{item.projectName}</strong>
                                <div style={{fontSize:'12px', color:'#999', marginTop:'4px'}}>{item.description}</div>
                            </td>
                            <td style={tdStyle}>{item.requester}</td>
                            <td style={tdStyle}>{item.date}</td>
                            <td style={tdStyle}>
                                {getStatusBadge(item.status)}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>

                                    <AppButton
                                        sVariant="outline"
                                        oStyle={{ padding: '6px 12px', fontSize: '12px' }}
                                        fnOnClick={() => handleView(item)}
                                    >
                                        View
                                    </AppButton>

                                    {item.status === 'Pending' && (
                                        <>
                                            <AppButton
                                                sVariant="success"
                                                oStyle={{ padding: '6px 12px', fontSize: '12px' }}
                                                fnOnClick={() => console.log(item.id)}
                                            >
                                                Approve
                                            </AppButton>
                                            <AppButton
                                                sVariant="danger"
                                                oStyle={{ padding: '6px 12px', fontSize: '12px' }}
                                                fnOnClick={() => console.log(item.id)}
                                            >
                                                Reject
                                            </AppButton>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>

                {filteredRequests.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                        No requests found matching your search.
                    </div>
                )}
            </AppCard>
        </div>
    );
};

// Styles
const thStyle = { padding: '15px 20px', fontWeight: 'bold' };
const tdStyle = { padding: '15px 20px', color: '#333', verticalAlign: 'middle' };

export default ProjectRequests;
