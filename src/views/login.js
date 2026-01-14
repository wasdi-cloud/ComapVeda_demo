import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Import reusable components
import AppCard from '../components/app-card';
import AppInput from '../components/app-text-input';
import AppButton from '../components/app-button';

const Login = () => {
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        // Simulate Login Logic...
        alert("Login Successful!");
        navigate('/edit-project');
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f0f2f5' // Light background for contrast
        }}>

            {/* Wrap the form in our standard Card */}
            <AppCard oStyle={{ width: '350px', padding: '40px' }}>

                <h2 style={{ textAlign: 'center', marginBottom: '25px', color: '#333' }}>Login</h2>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Reusable Inputs */}
                    <AppInput
                        type="email"
                        sPlaceholder="Email"
                        required
                    />

                    <AppInput
                        type="password"
                        sPlaceholder="Password"
                        required
                    />

                    {/* Forgot Password Link */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-10px' }}>
                        <Link to="/forgot-password" style={{ fontSize: '12px', color: '#007bff', textDecoration: 'none' }}>
                            Forgot Password?
                        </Link>
                    </div>

                    {/* Reusable Primary Button */}
                    <AppButton type="submit" sVariant="primary">
                        Sign In
                    </AppButton>

                </form>

                {/* Footer Links */}
                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
                    <p>
                        New here? <Link to="/register" style={{ color: '#007bff', textDecoration: 'none' }}>Create Account</Link>
                    </p>
                    <div style={{ marginTop: '10px' }}>
                        <Link to="/" style={{ color: '#666', textDecoration: 'none', fontSize: '13px' }}>← Back Home</Link>
                    </div>
                </div>

            </AppCard>
        </div>
    );
};

export default Login;
