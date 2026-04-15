import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// REUSABLE COMPONENTS
import AppCard from '../components/app-card';
import AppTextInput from '../components/app-text-input';
import AppSelect from '../components/app-dropdown-input';
import AppTextArea from '../components/app-text-area';
import AppButton from '../components/app-button';

// SERVICES
import { getCollaborators, inviteCollab, removeCollab } from '../services/project-service';
import {getUser} from "../services/session";


const ProjectCollaborators = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Grab the Project ID from the router state
    const sProjectId = location.state?.projectId || null;

    // --- GET CURRENT USER EMAIL FROM SESSION ---
    const oUser = getUser();
    const sCurrentUserEmail = oUser?.email || "";

    // --- 1. STATE ---
    const [aoCollaborators, setAoCollaborators] = useState([]);
    const [bIsLoading, setIsLoading] = useState(true);

    const [sInviteEmail, setSInviteEmail] = useState("");
    const [sInviteRole, setSInviteRole] = useState("annotator"); // Matches Python Enum
    const [sInviteNote, setSInviteNote] = useState("");
    const [bIsSubmitting, setIsSubmitting] = useState(false);

    // --- 2. FETCH REAL DATA ---
    const loadCollaborators = async () => {
        if (!sProjectId) return;
        setIsLoading(true);
        try {
            const data = await getCollaborators(sProjectId);
            setAoCollaborators(data || []);
        } catch (error) {
            console.error("Failed to load collaborators:", error);
            setAoCollaborators([]); // Default to empty list on error
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCollaborators();
    }, [sProjectId]);

    // --- 3. HANDLERS ---
    const handleSendInvite = async (e) => {
        e.preventDefault();
        if (!sInviteEmail) return alert("Please enter an email address.");
        if (!sProjectId) return alert("Project ID is missing!");

        setIsSubmitting(true);
        try {
            const payload = {
                userEmail: sInviteEmail,
                role: sInviteRole,
                note: sInviteNote || null
            };

            await inviteCollab(sProjectId, payload);
            alert(`Invitation sent to ${sInviteEmail}! 📧`);

            // Reset Form & Reload List
            setSInviteEmail("");
            setSInviteNote("");
            setSInviteRole("annotator");
            loadCollaborators();

        } catch (error) {
            alert("Failed to send invitation: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemove = async (email) => {
        if (window.confirm(`Are you sure you want to remove ${email} from the project?`)) {
            try {
                await removeCollab(sProjectId, email);
                alert(`${email} removed successfully.`);
                loadCollaborators(); // Refresh the table
            } catch (error) {
                alert("Failed to remove collaborator: " + error.message);
            }
        }
    };

    // --- SECURITY CHECK: IS THE CURRENT USER AN OWNER? ---
    // We look through the loaded list to see if the current user has the 'co-owner' role
    const bIsCurrentUserOwner = aoCollaborators.some(
        c => c.userEmail === sCurrentUserEmail && c.userRole.toLowerCase() === 'co-owner'
    );

    return (
        <div style={{ padding: '30px', background: '#f4f6f8', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* HEADER */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            border: '1px solid #ccc',
                            background: 'white',
                            cursor: 'pointer',
                            fontSize: '20px',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            color: '#555',
                            marginTop: '2px',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#eee'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                        title="Go Back"
                    >
                        ←
                    </button>
                    <div>
                        <h2 style={{ margin: 0, color: '#333' }}>👥 Project Collaborators</h2>
                        <p style={{ margin: '5px 0 0 0', color: '#666' }}>Manage access and roles for your team.</p>
                    </div>
                </div>

                {/* --- 1. INVITATION FORM (HIDDEN IF NOT OWNER) --- */}
                {bIsCurrentUserOwner && (
                    <AppCard oStyle={{ borderTop: '4px solid #007bff' }}>
                        <h3 style={headerStyle}>Invite New Member</h3>

                        <form onSubmit={handleSendInvite}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '15px' }}>
                                <AppTextInput
                                    sLabel="Collaborator Email"
                                    sPlaceholder="colleague@example.com"
                                    type="email"
                                    sValue={sInviteEmail}
                                    fnOnChange={(e) => setSInviteEmail(e.target.value)}
                                    required
                                />

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Role</label>
                                    <AppSelect
                                        sValue={sInviteRole}
                                        fnOnChange={(e) => setSInviteRole(e.target.value)}
                                        aoOptions={[
                                            { value: "co-owner", label: "Co-Owner (Full Access)" },
                                            { value: "reviewer", label: "Reviewer (QA/QC)" },
                                            { value: "annotator", label: "Annotator (Labeling Only)" }
                                        ]}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555', marginBottom: '5px', display: 'block' }}>Invitation Note (Optional)</label>
                                <AppTextArea
                                    sPlaceholder="Hi! Please join this project to help with the flood analysis..."
                                    sValue={sInviteNote}
                                    fnOnChange={(e) => setSInviteNote(e.target.value)}
                                    iRows={2}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <AppButton type="submit" sVariant="primary" disabled={bIsSubmitting}>
                                    {bIsSubmitting ? "Sending..." : "Send Invitation ✉️"}
                                </AppButton>
                            </div>
                        </form>
                    </AppCard>
                )}

                {/* --- 2. COLLABORATORS LIST --- */}
                <AppCard>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...headerStyle }}>
                        <h3 style={{ margin: 0 }}>Current Team ({aoCollaborators.length})</h3>
                        {!bIsCurrentUserOwner && (
                            <span style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', background: '#f0f0f0', padding: '4px 8px', borderRadius: '4px' }}>
                                View-Only Mode
                            </span>
                        )}
                    </div>

                    {bIsLoading ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>⏳ Loading team...</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead style={{ background: '#f9f9f9', borderBottom: '2px solid #eee' }}>
                            <tr style={{ textAlign: 'left', color: '#555' }}>
                                <th style={thStyle}>Email</th>
                                <th style={thStyle}>Role</th>
                                {/* Only show the Actions header if they are an owner */}
                                {bIsCurrentUserOwner && <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>}
                            </tr>
                            </thead>
                            <tbody>
                            {aoCollaborators.map((user, idx) => {
                                const bIsCurrentUser = user.userEmail === sCurrentUserEmail;

                                return (
                                    <tr key={idx} style={{ borderBottom: '1px solid #eee', background: bIsCurrentUser ? '#f8fdf8' : 'white' }}>
                                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>
                                            {user.userEmail}
                                            {bIsCurrentUser && (
                                                <span style={{ marginLeft: '8px', fontSize: '10px', background: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '10px' }}>YOU</span>
                                            )}
                                        </td>
                                        <td style={tdStyle}>
                                            <span style={getRoleBadgeStyle(user.userRole)}>
                                                {user.userRole.toUpperCase()}
                                            </span>
                                        </td>

                                        {/* Only render the Actions column if the current logged-in user is an owner */}
                                        {bIsCurrentUserOwner && (
                                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                {!bIsCurrentUser ? (
                                                    <button
                                                        onClick={() => handleRemove(user.userEmail)}
                                                        style={{ border: 'none', background: 'transparent', color: '#dc3545', cursor: 'pointer', fontWeight: 'bold' }}
                                                    >
                                                        Remove
                                                    </button>
                                                ) : (
                                                    <span style={{ color: '#999', fontSize: '12px', fontStyle: 'italic' }}>Cannot remove self</span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                            {aoCollaborators.length === 0 && (
                                <tr>
                                    <td colSpan={bIsCurrentUserOwner ? "3" : "2"} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No collaborators found.</td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    )}
                </AppCard>

            </div>
        </div>
    );
};

// --- STYLES & HELPERS ---
const headerStyle = { margin: '0 0 15px 0', fontSize: '18px', color: '#444', borderBottom: '1px solid #eee', paddingBottom: '10px' };
const thStyle = { padding: '12px 15px', fontWeight: 'bold' };
const tdStyle = { padding: '12px 15px', color: '#333' };

const getRoleBadgeStyle = (role) => {
    const base = { padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' };
    switch(role?.toLowerCase()) {
        case 'co-owner': return { ...base, background: '#e6f7ff', color: '#1890ff' };
        case 'reviewer': return { ...base, background: '#f6ffed', color: '#52c41a' };
        case 'annotator': return { ...base, background: '#fff7e6', color: '#fa8c16' };
        default: return { ...base, background: '#f5f5f5', color: '#666' };
    }
};

export default ProjectCollaborators;
