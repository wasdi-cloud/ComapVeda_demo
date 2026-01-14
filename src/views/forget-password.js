import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Import reusable components
import AppCard from '../components/app-card';
import AppInput from '../components/app-text-input';
import AppButton from '../components/app-button';

const ForgotPassword = () => {
    // Standardizing variable name (Boolean -> bSubmitted)
    const [bSubmitted, setBSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Simulate API call
        setBSubmitted(true);
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f9f9f9'
        }}>

            {/* Reusing AppCard with fixed width */}
            <AppCard oStyle={{ width: '350px', padding: '40px' }}>

                <h2 style={{ textAlign: 'center', marginTop: 0, color: '#333' }}>Reset Password</h2>

                {!bSubmitted ? (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', margin: 0 }}>
                            Enter your email address and we'll send you a link to reset your password.
                        </p>

                        {/* Reusable Input */}
                        <AppInput
                            type="email"
                            sPlaceholder="Enter your email"
                            required
                        />

                        {/* Reusable Button - Primary Variant */}
                        <AppButton
                            type="submit"
                            sVariant="primary"
                            oStyle={{ width: '100%' }}
                        >
                            Send Reset Link
                        </AppButton>

                        <div style={{ textAlign: 'center', marginTop: '10px' }}>
                            <Link to="/login" style={{ fontSize: '14px', color: '#007bff', textDecoration: 'none' }}>
                                ← Back to Login
                            </Link>
                        </div>
                    </form>
                ) : (
                    /* Success State */
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>📧</div>
                        <h3 style={{ color: '#28a745', margin: '10px 0' }}>Check your inbox!</h3>
                        <p style={{ fontSize: '14px', color: '#666' }}>
                            We have sent a password reset link to your email.
                        </p>

                        {/* Reusing AppButton for the "Back" action instead of a plain link makes it clearer */}
                        <div style={{ marginTop: '20px' }}>
                            <Link to="/login" style={{ textDecoration: 'none' }}>
                                <AppButton sVariant="outline" oStyle={{ width: '100%' }}>
                                    Back to Login
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
