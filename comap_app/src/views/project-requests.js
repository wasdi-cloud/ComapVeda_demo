import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// REUSABLE COMPONENTS
import AppCard from '../components/app-card';
import AppButton from '../components/app-button';
import AppTextInput from '../components/app-text-input';

// SERVICES
import { getProjectRequests, approveProject, rejectProject } from '../services/project-service';

const ProjectRequests = () => {
    const navigate = useNavigate();

    // 1. STATE
    const [aoRequests, setRequests] = useState([]);
    const [bIsLoading, setIsLoading] = useState(true);
    const [sSearchText, setSSearchText] = useState("");

    // 2. FETCH DATA
    const loadRequests = async () => {
        try {
            setIsLoading(true);
            const data = await getProjectRequests();
            setRequests(data || []);
        } catch (error) {
            console.error("Failed to load requests", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    // 3. HANDLERS
    const handleView = (project) => {
        // Navigate using URL parameters instead of React State
        navigate(`/approve-project/${project.id}`);
    };

    const handleApprove = async (projectId) => {
        if(window.confirm("Are you sure you want to approve this project?")) {
            try {
                await approveProject(projectId, 10);
                alert("Project Approved!");
                loadRequests(); // Refresh the table
            } catch (error) {
                alert("Failed to approve: " + error.message);
            }
        }
    };

    const handleReject = async (projectId) => {
        if(window.confirm("Are you sure you want to reject this project?")) {
            try {
                await rejectProject(projectId);
                alert("Project Rejected!");
                loadRequests(); // Refresh the table
            } catch (error) {
                alert("Failed to reject: " + error.message);
            }
        }
    };

    // 4. HELPERS
    const formatDate = (timestamp) => {
        if (!timestamp) return "N/A";
        return new Date(Number(timestamp)).toLocaleDateString("en-GB", {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    // NEW: Calculate the status string on the client side based on the raw DB flags
    const getCalculatedStatus = (item) => {
        if (item.approved) return 'Approved';
        if (item.rejected) return 'Rejected';
        return 'Pending';
    };

    const filteredRequests = aoRequests.filter(item =>
        item.name.toLowerCase().includes(sSearchText.toLowerCase()) ||
        item.requester.toLowerCase().includes(sSearchText.toLowerCase())
    );

    const getStatusBadge = (item) => {
        const status = getCalculatedStatus(item);
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#333' }}>✅ Project Requests</h2>
                    <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                        Review and approve new project submissions.
                    </p>
                </div>
            </div>

            <AppCard oStyle={{ padding: 0, overflow: 'hidden' }}>
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

                {bIsLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                        ⏳ Loading requests...
                    </div>
                ) : (
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
                        {filteredRequests.map((item) => {
                            const currentStatus = getCalculatedStatus(item);

                            return (
                                <tr key={item.id} style={{ borderBottom: '1px solid #eee', background: 'white' }}>
                                    <td style={tdStyle}>
                                        <strong>{item.name}</strong>
                                        <div style={{fontSize:'12px', color:'#999', marginTop:'4px'}}>{item.description}</div>
                                    </td>
                                    <td style={tdStyle}>{item.requester}</td>
                                    <td style={tdStyle}>{formatDate(item.creationDate)}</td>
                                    <td style={tdStyle}>
                                        {getStatusBadge(item)}
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                            <AppButton sVariant="outline" oStyle={{ padding: '6px 12px', fontSize: '12px' }} fnOnClick={() => handleView(item)}>
                                                View
                                            </AppButton>

                                            {/* Only show Approve/Reject if it is currently Pending */}
                                            {currentStatus === 'Pending' && (
                                                <>
                                                    <AppButton sVariant="success" oStyle={{ padding: '6px 12px', fontSize: '12px' }} fnOnClick={() => handleApprove(item.id)}>
                                                        Approve
                                                    </AppButton>
                                                    <AppButton sVariant="danger" oStyle={{ padding: '6px 12px', fontSize: '12px' }} fnOnClick={() => handleReject(item.id)}>
                                                        Reject
                                                    </AppButton>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                )}

                {!bIsLoading && filteredRequests.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                        No requests found matching your search.
                    </div>
                )}
            </AppCard>
        </div>
    );
};

const thStyle = { padding: '15px 20px', fontWeight: 'bold' };
const tdStyle = { padding: '15px 20px', color: '#333', verticalAlign: 'middle' };

export default ProjectRequests;
