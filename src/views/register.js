import React from 'react';
import {useNavigate} from 'react-router-dom';

const Register = () => {
    const navigate = useNavigate(); // Hook for redirection

    const handleRegister = (e) => {
        e.preventDefault();
        // Simulate registration success...
        navigate('/confirm-register'); // <--- Redirect to the code entry page
    };
    return (
        <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <form onSubmit={handleRegister}
                  style={{display: 'flex', flexDirection: 'column', width: '300px', gap: '15px'}}>
                <h2>Register</h2>
                <input type="text" placeholder="Full Name" style={{padding: '10px'}}/>
                <input type="email" placeholder="Email" style={{padding: '10px'}}/>
                <input type="password" placeholder="Password" style={{padding: '10px'}}/>

                <button type="submit" style={{
                    padding: '10px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer'
                }}>
                    Sign Up
                </button>
            </form>
            <div style={{display: 'flex', flexDirection: 'column', width: '300px', gap: '15px'}}>
            </div>
        </div>
    );
};

export default Register;
