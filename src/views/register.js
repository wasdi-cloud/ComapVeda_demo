import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
    const navigate = useNavigate();

    const handleRegister = (e) => {
        e.preventDefault();
        // The 'required' attribute on the checkbox handles the validation automatically
        navigate('/confirm-register');
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f4f6f8'
        }}>
            <form onSubmit={handleRegister} style={{
                display: 'flex',
                flexDirection: 'column',
                width: '800px',
                padding: '40px',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                gap: '20px'
            }}>
                <h2 style={{ textAlign: 'center', marginBottom: '10px', color: '#333' }}>Create Account</h2>

                {/* --- THE GRID CONTAINER --- */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '15px'
                }}>
                    {/* Row 1 */}
                    <input type="text" placeholder="Name" required style={oInputStyle} />
                    <input type="text" placeholder="Surname" required style={oInputStyle} />

                    {/* Row 2 */}
                    <input type="email" placeholder="Email" required style={oInputStyle} />
                    <input type="email" placeholder="Confirm Email" required style={oInputStyle} />

                    {/* Row 3 */}
                    <input type="password" placeholder="Password" required style={oInputStyle} />
                    <input type="password" placeholder="Confirm Password" required style={oInputStyle} />
                </div>

                {/* --- NEW: Terms and Conditions Checkbox --- */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                    <input
                        id="terms"
                        type="checkbox"
                        required // <--- This forces the user to check it
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="terms" style={{ fontSize: '14px', color: '#555', cursor: 'pointer' }}>
                        I accept the <a href="https://google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'none' }}>Terms and Conditions</a>
                    </label>
                </div>

                {/* Submit Button */}
                <button type="submit" style={{
                    marginTop: '5px',
                    padding: '12px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                }}>
                    Sign Up
                </button>

                <p style={{ textAlign: 'center', fontSize: '14px', color: '#666' }}>
                    Already have an account? <Link to="/login" style={{ color: '#007bff' }}>Login</Link>
                </p>
            </form>
        </div>
    );
};

// Helper style object
const oInputStyle = {
    padding: '12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box'
};

export default Register;
