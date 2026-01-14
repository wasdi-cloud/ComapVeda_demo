import React from 'react';
import { useNavigate } from 'react-router-dom';

const ConfirmRegister = () => {
    const navigate = useNavigate();

    const handleConfirm = (e) => {
        e.preventDefault();
        // Simulate Verification API call
        alert("Account Verified Successfully!");
        navigate('/login'); // Send them to login after verification
    };

    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9' }}>
            <div style={{ width: '350px', padding: '30px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <h2 style={{ textAlign: 'center', color: '#333' }}>Verify Account</h2>
                <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', marginBottom: '20px' }}>
                    We sent a 6-digit code to your email. Please enter it below.
                </p>

                <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input
                        type="text"
                        placeholder="123456"
                        maxLength="6"
                        required
                        style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ddd', textAlign: 'center', letterSpacing: '5px', fontSize: '18px' }}
                    />

                    <button type="submit" style={{ padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Verify & Continue
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '12px' }}>
                    Didn't receive code? <span style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}>Resend</span>
                </div>
            </div>
        </div>
    );
};

export default ConfirmRegister;
