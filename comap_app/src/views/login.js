import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import AppCard from '../components/app-card';
import AppInput from '../components/app-text-input';
import AppButton from '../components/app-button';
import AppNotification from '../dialogues/app-notifications';
import { login } from '../services/auth-service';

const Login = () => {
    const navigate = useNavigate();

    const [sEmail, setSEmail] = useState("");
    const [sPassword, setSPassword] = useState("");
    const [bIsSubmitting, setIsSubmitting] = useState(false);

    const [oNotification, setNotification] = useState({ show: false, message: '', type: 'info' });
    const showNotif = (message, type = 'info') => setNotification({ show: true, message, type });

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Your Pydantic 'LoginModel' expects 'username', so we map email to username!
            const oPayload = {
                username: sEmail,
                password: sPassword
            };

            await login(oPayload);
            showNotif("Login Successful!", "success");

            setTimeout(() => {
                navigate('/'); // Route to Homepage after login
            }, 1000);

        } catch (error) {
            // E.g., "Invalid credentials" or "User not confirmed."
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

                    <AppInput
                        type="password"
                        sPlaceholder="Password"
                        required
                        sValue={sPassword}
                        fnOnChange={(e)=> setSPassword(e.target.value)}
                    />

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
