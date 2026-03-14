import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import AppCard from '../components/app-card';
import AppInput from '../components/app-text-input';
import AppButton from '../components/app-button';
import AppNotification from '../dialogues/app-notifications';
import { login } from '../services/auth-service';

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

const Login = () => {
    const navigate = useNavigate();

    const [sEmail, setSEmail] = useState("");
    const [sPassword, setSPassword] = useState("");
    const [bIsSubmitting, setIsSubmitting] = useState(false);

    // --- NEW: Password Visibility State ---
    const [bShowPassword, setShowPassword] = useState(false);

    const [oNotification, setNotification] = useState({ show: false, message: '', type: 'info' });
    const showNotif = (message, type = 'info') => setNotification({ show: true, message, type });

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const oPayload = {
                username: sEmail,
                password: sPassword
            };

            await login(oPayload);
            showNotif("Login Successful!", "success");

            setTimeout(() => {
                navigate('/');
            }, 1000);

        } catch (error) {
            showNotif(error.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f2f5' }}>

            <AppNotification show={oNotification.show} message={oNotification.message} type={oNotification.type} onClose={() => setNotification(prev => ({ ...prev, show: false }))} />

            <AppCard oStyle={{ width: '350px', padding: '40px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '25px', color: '#333' }}>Login</h2>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <AppInput
                        type="email"
                        sPlaceholder="Email"
                        required
                        sValue={sEmail}
                        fnOnChange={(e)=> setSEmail(e.target.value)}
                    />

                    {/* --- Password Wrapper --- */}
                    <div style={{ position: 'relative', width: '100%' }}>
                        <AppInput
                            type={bShowPassword ? "text" : "password"}
                            sPlaceholder="Password"
                            required
                            sValue={sPassword}
                            fnOnChange={(e)=> setSPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!bShowPassword)}
                            tabIndex="-1" // Prevents the button from interfering with form tabbing
                            style={{
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
                            }}
                            title={bShowPassword ? "Hide password" : "Show password"}
                        >
                            {bShowPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-10px' }}>
                        <Link to="/forgot-password" style={{ fontSize: '12px', color: '#007bff', textDecoration: 'none' }}>
                            Forgot Password?
                        </Link>
                    </div>

                    <AppButton type="submit" sVariant="primary" disabled={bIsSubmitting}>
                        {bIsSubmitting ? "Signing In..." : "Sign In"}
                    </AppButton>
                </form>

                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
                    <p>
                        New here? <Link to="/register" style={{ color: '#007bff', textDecoration: 'none' }}>Create Account</Link>
                    </p>
                </div>
            </AppCard>
        </div>
    );
};

export default Login;
