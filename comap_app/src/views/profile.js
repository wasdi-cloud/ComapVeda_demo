import React, { useState, useEffect } from 'react';
import AppCard from '../components/app-card';
import AppTextInput from '../components/app-text-input';
import AppButton from '../components/app-button';
import AppNotification from '../dialogues/app-notifications';

import { getMyProfile, updateMyProfile } from '../services/user-service';
import { getUser, setSession, getToken } from '../services/session';

const Profile = () => {
    // --- Get initial data straight from local storage to avoid empty flashes ---
    const oSessionUser = getUser();

    const [bIsLoading, setIsLoading] = useState(true);
    const [bIsSaving, setIsSaving] = useState(false);

    // State for the form (pre-fill with session data if available)
    const [sName, setSName] = useState(oSessionUser?.name || "");
    const [sSurname, setSSurname] = useState(oSessionUser?.surname || "");
    const [sEmail, setSEmail] = useState(oSessionUser?.email || "");
    const [sRole, setSRole] = useState(oSessionUser?.role || "user");

    // Notification State
    const [oNotification, setNotification] = useState({ show: false, message: '', type: 'info' });
    const showNotif = (message, type = 'info') => setNotification({ show: true, message, type });

    // Fetch Profile on Mount (To make sure we have the latest DB data)
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await getMyProfile();
                setSName(data.name || "");
                setSSurname(data.surname || "");
                setSEmail(data.email || "");
                setSRole(data.role || "user");
            } catch (error) {
                showNotif("Failed to load profile data.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        loadProfile();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const updatedUser = await updateMyProfile({
                name: sName,
                surname: sSurname
            });

            const currentToken = getToken();
            setSession(currentToken, updatedUser);

            showNotif("Profile updated successfully!", "success");
        } catch (error) {
            showNotif(error.message || "Failed to update profile.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // --- NEW: Helper to format "ADMIN" -> "Admin", "USER" -> "User" ---
    const formatRole = (roleStr) => {
        if (!roleStr) return "User";
        return roleStr.charAt(0).toUpperCase() + roleStr.slice(1).toLowerCase();
    };

    return (
        <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px' }}>

            <AppNotification
                show={oNotification.show}
                message={oNotification.message}
                type={oNotification.type}
                onClose={() => setNotification(prev => ({ ...prev, show: false }))}
            />

            <h1 style={{ color: '#2c3e50', marginBottom: '20px' }}>My Profile</h1>

            <AppCard oStyle={{ padding: '30px' }}>
                {bIsLoading ? (
                    <div style={{ textAlign: 'center', color: '#888' }}>Loading profile...</div>
                ) : (
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* READ-ONLY FIELDS */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', opacity: 0.7 }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '5px', display: 'block' }}>Email Address</label>
                                <AppTextInput
                                    sValue={sEmail}
                                    disabled={true}
                                    oStyle={{ background: '#f5f5f5' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '5px', display: 'block' }}>Account Role</label>
                                <AppTextInput
                                    sValue={formatRole(sRole)} // <-- Display formatted role here!
                                    disabled={true}
                                    oStyle={{ background: '#f5f5f5', fontWeight: 'bold', color: sRole === 'ADMIN' ? '#d9534f' : '#5bc0de' }}
                                />
                            </div>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '10px 0' }} />

                        {/* EDITABLE FIELDS */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '5px', display: 'block' }}>First Name</label>
                                <AppTextInput
                                    required
                                    sValue={sName}
                                    fnOnChange={(e) => setSName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '5px', display: 'block' }}>Last Name</label>
                                <AppTextInput
                                    required
                                    sValue={sSurname}
                                    fnOnChange={(e) => setSSurname(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <AppButton type="submit" sVariant="primary" disabled={bIsSaving}>
                                {bIsSaving ? "Saving..." : "Save Changes"}
                            </AppButton>
                        </div>
                    </form>
                )}
            </AppCard>
        </div>
    );
};

export default Profile;
