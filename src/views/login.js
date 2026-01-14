import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        // Simulate Login Logic...
        alert("Login Successful!");
        navigate('/edit-project'); // Redirect to dashboard
    };

    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', width: '300px', gap: '15px' }}>
                <h2>Login</h2>
                <input type="email" placeholder="Email" required style={{ padding: '10px' }} />
                <input type="password" placeholder="Password" required style={{ padding: '10px' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Link to="/forgot-password" style={{ fontSize: '12px', color: '#007bff', textDecoration: 'none' }}>
                        Forgot Password?
                    </Link>
                </div>
                <button type="submit" style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
                    Sign In
                </button>
                <p>
                    New here? <Link to="/register">Create Account</Link>
                </p>
                <Link to="/">Back Home</Link>
            </form>
        </div>
    );
};

export default Login;
