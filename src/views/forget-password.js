import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Simulate API call
        setSubmitted(true);
    };

    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9' }}>
            <div style={{ width: '350px', padding: '30px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <h2 style={{ textAlign: 'center', color: '#333' }}>Reset Password</h2>

                {!submitted ? (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <p style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
                            Enter your email address and we'll send you a link to reset your password.
                        </p>

                        <input type="email" placeholder="Enter your email" required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }} />

                        <button type="submit" style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Send Reset Link
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '10px' }}>
                            <Link to="/login" style={{ fontSize: '14px', color: '#007bff', textDecoration: 'none' }}>Back to Login</Link>
                        </div>
                    </form>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>📧</div>
                        <h3 style={{ color: '#28a745' }}>Check your inbox!</h3>
                        <p style={{ fontSize: '14px', color: '#666' }}>We have sent a password reset link to your email.</p>
                        <Link to="/login" style={{ display: 'block', marginTop: '20px', color: '#007bff', textDecoration: 'none' }}>Back to Login</Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
