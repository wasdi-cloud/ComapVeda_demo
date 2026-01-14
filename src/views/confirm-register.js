import React from 'react';
import { useNavigate } from 'react-router-dom';

// Import reusable components
import AppCard from '../components/app-card';
import AppInput from '../components/app-text-input';
import AppButton from '../components/app-button';

const ConfirmRegister = () => {
    const navigate = useNavigate();

    const handleConfirm = (e) => {
        e.preventDefault();
        // Simulate Verification API call
        alert("Account Verified Successfully!");
        navigate('/login');
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f9f9f9'
        }}>

            {/* Reusing AppCard with a specific width */}
            <AppCard oStyle={{ width: '350px', padding: '30px' }}>

                <h2 style={{ textAlign: 'center', color: '#333', marginTop: 0 }}>Verify Account</h2>
                <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', marginBottom: '20px' }}>
                    We sent a 6-digit code to your email. Please enter it below.
                </p>

                <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                    {/* Reusing AppInput with specific OTP styling */}
                    <AppInput
                        type="text"
                        sPlaceholder="123456"
                        maxLength="6"
                        required
                        oStyle={{
                            textAlign: 'center',
                            letterSpacing: '5px',
                            fontSize: '18px',
                            padding: '12px'
                        }}
                    />

                    {/* Reusing AppButton with 'success' variant */}
                    <AppButton
                        type="submit"
                        sVariant="success"
                        oStyle={{ width: '100%' }} // Make button full width
                    >
                        Verify & Continue
                    </AppButton>

                </form>

                <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '12px' }}>
                    Didn't receive code?{' '}
                    <span style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}>
                        Resend
                    </span>
                </div>

            </AppCard>
        </div>
    );
};

export default ConfirmRegister;
