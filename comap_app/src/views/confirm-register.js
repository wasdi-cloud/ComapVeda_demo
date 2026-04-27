import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import AppCard from '../components/app-card';
import AppInput from '../components/app-text-input';
import AppButton from '../components/app-button';
import AppNotification from '../dialogues/app-notifications';
// --- IMPORT THE NEW SERVICE ---
import { confirmRegistration, resendOtp } from '../services/auth-service';

const ConfirmRegister = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Grab the email passed from the Register page
    const sEmail = location.state?.email || "";

    const [sOtpCode, setSOtpCode] = useState("");
    const [bIsSubmitting, setIsSubmitting] = useState(false);

    // --- NEW: RESEND LOADING STATE ---
    const [bIsResending, setIsResending] = useState(false);

    const [oNotification, setNotification] = useState({ show: false, message: '', type: 'info' });
    const showNotif = (message, type = 'info') => setNotification({ show: true, message, type });

    const handleConfirm = async (e) => {
        e.preventDefault();

        if (!sEmail) return showNotif("Missing email address. Please register or login again.", "error");

        setIsSubmitting(true);

        try {
            // Must match Pydantic OtpModel fields!
            const oPayload = {
                email: sEmail,
                otp_code: sOtpCode
            };

            await confirmRegistration(oPayload);
            showNotif("Account Verified Successfully! Redirecting to Home...", "success");

            // Backend gave us a session_token, so we are legally logged in! Send them home.
            setTimeout(() => {
                navigate('/');
            }, 1500);

        } catch (error) {
            showNotif(error.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- NEW: RESEND HANDLER ---
    const handleResend = async () => {
        if (!sEmail) return showNotif("Missing email address. Cannot resend.", "error");

        setIsResending(true);
        try {
            const oPayload = { email: sEmail };
            await resendOtp(oPayload);
            showNotif("A new OTP code has been sent to your email! 📧", "success");
        } catch (error) {
            showNotif(error.message || "Failed to resend OTP.", "error");
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9' }}>

            <AppNotification show={oNotification.show} message={oNotification.message} type={oNotification.type} onClose={() => setNotification(prev => ({ ...prev, show: false }))} />

            <AppCard oStyle={{ width: '350px', padding: '30px' }}>
                <h2 style={{ textAlign: 'center', color: '#333', marginTop: 0 }}>Verify Account</h2>
                <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', marginBottom: '20px' }}>
                    We sent a 6-digit code to <strong>{sEmail || "your email"}</strong>. Please enter it below.
                </p>

                <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <AppInput
                        type="text"
                        sPlaceholder="123456"
                        maxLength="6"
                        required
                        sValue={sOtpCode}
                        fnOnChange={(e) => setSOtpCode(e.target.value)}
                        oStyle={{ textAlign: 'center', letterSpacing: '5px', fontSize: '18px', padding: '12px' }}
                    />

                    <AppButton type="submit" sVariant="success" oStyle={{ width: '100%' }} disabled={bIsSubmitting}>
                        {bIsSubmitting ? "Verifying..." : "Verify & Continue"}
                    </AppButton>
                </form>

                {/* --- UPDATED: RESEND BUTTON LOGIC --- */}
                <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '12px' }}>
                    Didn't receive code?{' '}
                    {bIsResending ? (
                        <span style={{ color: '#888', cursor: 'wait' }}>Sending...</span>
                    ) : (
                        <span
                            onClick={handleResend}
                            style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            Resend
                        </span>
                    )}
                </div>
            </AppCard>
        </div>
    );
};

export default ConfirmRegister;
