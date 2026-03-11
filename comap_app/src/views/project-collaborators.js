import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // <-- 1. Import useNavigate

// REUSABLE COMPONENTS
import AppCard from '../components/app-card';
import AppTextInput from '../components/app-text-input';
import AppSelect from '../components/app-dropdown-input';
import AppTextArea from '../components/app-text-area';
import AppButton from '../components/app-button';

const ProjectCollaborators = () => {
    const navigate = useNavigate(); // <-- 2. Initialize navigate

    // --- 1. DUMMY DATA (Existing Team) ---
    const [aoCollaborators, setAoCollaborators] = useState([
        { id: 1, name: "Jihed (You)", email: "jihed@comap.com", role: "Owner", status: "Active" },
        { id: 2, name: "Sarah Connor", email: "sarah@skynet.net", role: "Co-Owner", status: "Active" },
        { id: 3, name: "John Doe", email: "john@example.com", role: "Annotator", status: "Pending" },
    ]);

    // --- 2. FORM STATE ---
    const [sInviteEmail, setSInviteEmail] = useState("");
    const [sInviteRole, setSInviteRole] = useState("Annotator");
    const [sInviteNote, setSInviteNote] = useState("");

    // --- 3. HANDLERS ---
    const handleSendInvite = (e) => {
        e.preventDefault();

        if (!sInviteEmail) return alert("Please enter an email address.");

        // Simulate API call
        console.log("Sending Invite to:", sInviteEmail, "Role:", sInviteRole, "Note:", sInviteNote);

        // Add to list visually (simulating a "Pending" user)
        const oNewUser = {
            id: Date.now(),
            name: "Invited User", // We don't know the name yet until they accept
            email: sInviteEmail,
            role: sInviteRole,
            status: "Pending"
        };

        setAoCollaborators([...aoCollaborators, oNewUser]);

        // Reset Form
        setSInviteEmail("");
        setSInviteNote("");
        setSInviteRole("Annotator"); // Reset to default

        alert(`Invitation sent to ${sInviteEmail}! 📧`);
    };

    const handleRemove = (id) => {
        if(window.confirm("Remove this collaborator from the project?")) {
            setAoCollaborators(aoCollaborators.filter(c => c.id !== id));
        }
    };

    return (
        <div style={{ padding: '30px', background: '#f4f6f8', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* HEADER */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                    {/* --- 3. THE BACK BUTTON --- */}
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
                            marginTop: '2px', // Aligns it nicely with the title
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

                {/* --- 1. INVITATION FORM --- */}
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

                            {/* Role Select */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Role</label>
                                <AppSelect
                                    sValue={sInviteRole}
                                    fnOnChange={(e) => setSInviteRole(e.target.value)}
                                    aoOptions={[
                                        { value: "Co-Owner", label: "Co-Owner (Full Access)" },
                                        { value: "Reviewer", label: "Reviewer (QA/QC)" },
                                        { value: "Annotator", label: "Annotator (Labeling Only)" }
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
                            <AppButton type="submit" sVariant="primary">
                                Send Invitation ✉️
                            </AppButton>
                        </div>
                    </form>
                </AppCard>

                {/* --- 2. COLLABORATORS LIST --- */}
                <AppCard>
                    <h3 style={headerStyle}>Current Team ({aoCollaborators.length})</h3>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead style={{ background: '#f9f9f9', borderBottom: '2px solid #eee' }}>
                        <tr style={{ textAlign: 'left', color: '#555' }}>
                            <th style={thStyle}>User Name</th>
                            <th style={thStyle}>Email</th>
                            <th style={thStyle}>Role</th>
                            <th style={thStyle}>Status</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {aoCollaborators.map(user => (
                            <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ ...tdStyle, fontWeight: 'bold' }}>
                                    {user.name}
                                    {user.role === 'Owner' && <span style={{ marginLeft: '8px', fontSize: '10px', background: '#ffd700', padding: '2px 6px', borderRadius: '10px' }}>OWNER</span>}
                                </td>
                                <td style={tdStyle}>{user.email}</td>
                                <td style={tdStyle}>
                                        <span style={getRoleBadgeStyle(user.role)}>
                                            {user.role}
                                        </span>
                                </td>
                                <td style={tdStyle}>
                                    {user.status === 'Pending' ? (
                                        <span style={{ color: '#e6a23c', fontStyle: 'italic' }}>⏳ Pending</span>
                                    ) : (
                                        <span style={{ color: '#28a745' }}>Active</span>
                                    )}
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'right' }}>
                                    {user.role !== 'Owner' && (
                                        <button
                                            onClick={() => handleRemove(user.id)}
                                            style={{ border: 'none', background: 'transparent', color: '#dc3545', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
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
    switch(role) {
        case 'Co-Owner': return { ...base, background: '#e6f7ff', color: '#1890ff' };
        case 'Reviewer': return { ...base, background: '#f6ffed', color: '#52c41a' }; // Greenish
        case 'Annotator': return { ...base, background: '#fff7e6', color: '#fa8c16' }; // Orange
        default: return { ...base, background: '#f5f5f5', color: '#666' };
    }
};

export default ProjectCollaborators;
