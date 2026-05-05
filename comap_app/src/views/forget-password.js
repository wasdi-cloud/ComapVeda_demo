import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Import reusable components
import AppCard from '../components/app-card';
import AppInput from '../components/app-text-input';
import AppButton from '../components/app-button';
import AppNotification from '../dialogues/app-notifications';

// Import the new API calls! Make sure the path matches your project structure
import { requestPasswordReset, verifyResetOTP, resetPassword } from '../services/auth-service';

const ForgotPassword = () => {
    // --- STATE: WIZARD TRACKING ---
    // 1: Email | 2: OTP | 3: New Password | 4: Success
    const [iStep, setIStep] = useState(1);

    // --- STATE: FORM DATA ---
    const [sEmail, setSEmail] = useState("");
    const [sOtp, setSOtp] = useState("");
    const [sNewPassword, setSNewPassword] = useState("");
    const [sConfirmPassword, setSConfirmPassword] = useState("");

    // --- STATE: UI FEEDBACK ---
    const [bIsLoading, setBIsLoading] = useState(false);
    const [oNotification, setNotification] = useState({ show: false, message: '', type: 'info' });
    const showNotif = (message, type = 'info') => setNotification({ show: true, message, type });

    // ==========================================
    // HANDLERS
    // ==========================================

    // STEP 1: Request OTP
    const handleRequestOTP = async (e) => {
        e.preventDefault();
        if (!sEmail) return;
        setBIsLoading(true);

        try {
            await requestPasswordReset(sEmail);
            showNotif("If you are registered, an email has been sent!", "success");
            setIStep(2); // Move to OTP step
        } catch (error) {
            showNotif(error.message || "Failed to request password reset.", "error");
        } finally {
            setBIsLoading(false);
        }
    };

    // STEP 2: Verify OTP
    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        if (!sOtp) return;
        setBIsLoading(true);

        try {
            await verifyResetOTP(sEmail, sOtp);
            showNotif("OTP Verified! Please enter a new password.", "success");
            setIStep(3); // Move to New Password step
        } catch (error) {
            showNotif(error.message || "Invalid or expired OTP. Please try again.", "error");
        } finally {
            setBIsLoading(false);
        }
    };

    // STEP 3: Save New Password
    const handleUpdatePassword = async (e) => {
        e.preventDefault();

        if (sNewPassword !== sConfirmPassword) {
            showNotif("Passwords do not match!", "error");
            return;
        }

        setBIsLoading(true);

        try {
            await resetPassword(sEmail, sOtp, sNewPassword);
            setIStep(4); // Move to Final Success step
        } catch (error) {
            showNotif(error.message || "Failed to update password. Please try again.", "error");
        } finally {
            setBIsLoading(false);
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f9f9f9'
        }}>

            <AppNotification
                show={oNotification.show}
                message={oNotification.message}
                type={oNotification.type}
                onClose={() => setNotification(prev => ({ ...prev, show: false }))}
            />

            <AppCard oStyle={{ width: '350px', padding: '40px' }}>

                {/* --- STEP 1: REQUEST OTP --- */}
                {iStep === 1 && (
                    <>
                        <h2 style={{ textAlign: 'center', marginTop: 0, color: '#333' }}>Reset Password</h2>
                        <form onSubmit={handleRequestOTP} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', margin: 0 }}>
                                Enter your email address and we'll send you a One-Time Password (OTP).
                            </p>
                            <AppInput
                                type="email"
                                sPlaceholder="Enter your email"
                                required
                                sValue={sEmail}
                                fnOnChange={(e) => setSEmail(e.target.value)}
                            />
                            <AppButton type="submit" sVariant="primary" oStyle={{ width: '100%' }} disabled={bIsLoading}>
                                {bIsLoading ? "Sending..." : "Recover Password"}
                            </AppButton>
                            <div style={{ textAlign: 'center', marginTop: '10px' }}>
                                <Link to="/login" style={{ fontSize: '14px', color: '#007bff', textDecoration: 'none' }}>
                                    ← Back to Login
                                </Link>
                            </div>
                        </form>
                    </>
                )}

                {/* --- STEP 2: VERIFY OTP --- */}
                {iStep === 2 && (
                    <>
                        <h2 style={{ textAlign: 'center', marginTop: 0, color: '#333' }}>Check Your Email</h2>
                        <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', margin: 0 }}>
                                We sent a secure code to <strong>{sEmail}</strong>. Please enter it below.
                            </p>
                            <AppInput
                                type="text"
                                sPlaceholder="Enter OTP (e.g. 123456)"
                                required
                                sValue={sOtp}
                                fnOnChange={(e) => setSOtp(e.target.value)}
                            />
                            <AppButton type="submit" sVariant="primary" oStyle={{ width: '100%' }} disabled={bIsLoading}>
                                {bIsLoading ? "Verifying..." : "Verify OTP"}
                            </AppButton>
                            <div style={{ textAlign: 'center', marginTop: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIStep(1)}
                                    style={{ background: 'none', border: 'none', color: '#007bff', fontSize: '14px', cursor: 'pointer' }}
                                >
                                    Use a different email
                                </button>
                            </div>
                        </form>
                    </>
                )}

                {/* --- STEP 3: RESET PASSWORD --- */}
                {iStep === 3 && (
                    <>
                        <h2 style={{ textAlign: 'center', marginTop: 0, color: '#333' }}>Create New Password</h2>
                        <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', margin: 0 }}>
                                Your OTP was verified. Please enter your new password below.
                            </p>
                            <AppInput
                                type="password"
                                sPlaceholder="New Password"
                                required
                                sValue={sNewPassword}
                                fnOnChange={(e) => setSNewPassword(e.target.value)}
                            />
                            <AppInput
                                type="password"
                                sPlaceholder="Confirm New Password"
                                required
                                sValue={sConfirmPassword}
                                fnOnChange={(e) => setSConfirmPassword(e.target.value)}
                            />
                            <AppButton type="submit" sVariant="primary" oStyle={{ width: '100%' }} disabled={bIsLoading}>
                                {bIsLoading ? "Updating..." : "Update Password"}
                            </AppButton>
                        </form>
                    </>
                )}

                {/* --- STEP 4: SUCCESS --- */}
                {iStep === 4 && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
                        <h3 style={{ color: '#28a745', margin: '10px 0' }}>Password Updated!</h3>
                        <p style={{ fontSize: '14px', color: '#666' }}>
                            Your password has been changed successfully. You can now log in with your new credentials.
                        </p>
                        <div style={{ marginTop: '20px' }}>
                            <Link to="/login" style={{ textDecoration: 'none' }}>
                                <AppButton sVariant="primary" oStyle={{ width: '100%' }}>
                                    Go to Login
                                </AppButton>
                            </Link>
                        </div>
                    </div>
                )}

            </AppCard>
        </div>
    );
};

export default ForgotPassword;
