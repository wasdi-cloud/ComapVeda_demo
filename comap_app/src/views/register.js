import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Import reusable components
import AppCard from '../components/app-card';
import AppTextInput from '../components/app-text-input';
import AppButton from '../components/app-button';
import AppCheckbox from '../components/app-checkbox';
import AppNotification from '../dialogues/app-notifications';
import { register } from '../services/auth-service';

// --- SVG Icons for Password Visibility ---
const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
);

const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
);

const Register = () => {
    const navigate = useNavigate();

    // --- STATE ---
    const [oNotification, setNotification] = useState({ show: false, message: '', type: 'info' });
    const showNotif = (message, type = 'info') => {
        setNotification({ show: true, message, type });
    };

    const [sName, setSName] = useState("");
    const [sSurname, setSSurname] = useState("");
    const [sEmail, setSEmail] = useState("");
    const [sConfirmEmail, setSConfirmEmail] = useState("");
    const [sPassword, setSPassword] = useState("");
    const [sConfirmPassword, setSConfirmPassword] = useState("");
    const [bTermsAccepted, setTermsAccepted] = useState(false);
    const [bIsSubmitting, setIsSubmitting] = useState(false);

    // --- NEW: Password Visibility States ---
    const [bShowPassword, setShowPassword] = useState(false);
    const [bShowConfirmPassword, setShowConfirmPassword] = useState(false);

    // --- HANDLER ---
    const handleRegister = async (e) => {
        e.preventDefault();

        if (sEmail !== sConfirmEmail) return showNotif("Emails do not match!", "error");

        // --- NEW: Check Password Length ---
        if (sPassword.length < 8) return showNotif("Password must be at least 8 characters long.", "error");

        if (sPassword !== sConfirmPassword) return showNotif("Passwords do not match!", "error");
        if (!bTermsAccepted) return showNotif("You must accept the Terms and Conditions.", "warning");

        setIsSubmitting(true);

        try {
            const oPayload = {
                name: sName,
                surname: sSurname,
                email: sEmail,
                password: sPassword
            };

            await register(oPayload);
            showNotif("Registration successful! Check your email for the OTP.", "success");

            setTimeout(() => {
                navigate('/confirm-register', { state: { email: sEmail } });
            }, 1500);

        } catch (error) {
            showNotif(error.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const termsLabel = (
        <span>I accept the <a href="#terms" target="_blank" rel="noopener noreferrer" style={{color: '#007bff', textDecoration: 'none'}}>Terms and Conditions</a></span>
    );

    // Reusable inline style for the eye button
    const eyeButtonStyle = {
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: '#888',
        display: 'flex',
        alignItems: 'center',
        padding: '4px'
    };

    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f2f5' }}>

            <AppNotification show={oNotification.show} message={oNotification.message} type={oNotification.type} onClose={() => setNotification(prev => ({ ...prev, show: false }))} />

            <AppCard oStyle={{width: '800px', padding: '40px'}}>
                <h2 style={{textAlign: 'center', marginBottom: '25px', marginTop: 0, color: '#333'}}>Create Account</h2>

                <form onSubmit={handleRegister} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <AppTextInput sPlaceholder="Name" required sValue={sName} fnOnChange={(e)=> setSName(e.target.value)}/>
                        <AppTextInput sPlaceholder="Surname" required sValue={sSurname} fnOnChange={(e)=> setSSurname(e.target.value)}/>
                        <AppTextInput type="email" sPlaceholder="Email" required sValue={sEmail} fnOnChange={(e)=> setSEmail(e.target.value)}/>
                        <AppTextInput type="email" sPlaceholder="Confirm Email" required sValue={sConfirmEmail} fnOnChange={(e)=> setSConfirmEmail(e.target.value)}/>

                        {/* --- Password Wrapper --- */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <AppTextInput
                                    type={bShowPassword ? "text" : "password"}
                                    sPlaceholder="Password"
                                    required
                                    sValue={sPassword}
                                    fnOnChange={(e)=> setSPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!bShowPassword)}
                                    tabIndex="-1"
                                    style={eyeButtonStyle}
                                >
                                    {bShowPassword ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>
                            {/* --- NEW: Password Helper Text --- */}
                            <span style={{
                                fontSize: '11px',
                                marginTop: '4px',
                                color: sPassword.length > 0 && sPassword.length < 8 ? '#dc3545' : '#666'
                            }}>
                                • Must be at least 8 characters
                            </span>
                        </div>

                        {/* --- Confirm Password Wrapper --- */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <AppTextInput
                                    type={bShowConfirmPassword ? "text" : "password"}
                                    sPlaceholder="Confirm Password"
                                    required
                                    sValue={sConfirmPassword}
                                    fnOnChange={(e)=> setSConfirmPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!bShowConfirmPassword)}
                                    tabIndex="-1"
                                    style={eyeButtonStyle}
                                >
                                    {bShowConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{marginTop: '5px'}}>
                        <AppCheckbox sName="terms" bRequired={true} sLabel={termsLabel} bChecked={bTermsAccepted} fnOnChange={(e) => setTermsAccepted(e.target.checked)} />
                    </div>

                    <AppButton type="submit" sVariant="success" oStyle={{width: '100%', marginTop: '10px'}} disabled={bIsSubmitting}>
                        {bIsSubmitting ? "Creating Account..." : "Sign Up"}
                    </AppButton>
                </form>

                <p style={{textAlign: 'center', fontSize: '14px', color: '#666', marginTop: '20px'}}>
                    Already have an account? <Link to="/login" style={{color: '#007bff', textDecoration: 'none'}}>Login</Link>
                </p>
            </AppCard>
        </div>
    );
};

export default Register;
