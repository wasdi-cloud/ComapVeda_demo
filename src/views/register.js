import React from 'react';
import {Link, useNavigate} from 'react-router-dom';

// Import Reusable Components
import AppCard from '../components/app-card';
import AppTextInput from '../components/app-text-input'; // <--- Using your specific name
import AppButton from '../components/app-button';
import AppCheckbox from '../components/app-checkbox';

const Register = () => {
    const navigate = useNavigate();

    const handleRegister = (e) => {
        e.preventDefault();
        // The 'required' prop in AppCheckbox handles validation automatically
        navigate('/confirm-register');
    };

    // We define the label for the checkbox as a variable so we can include the link
    const termsLabel = (
        <span>
            I accept the{' '}
            <a
                href="https://google.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{color: '#007bff', textDecoration: 'none'}}
            >
                Terms and Conditions
            </a>
        </span>
    );

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f0f2f5'
        }}>

            {/* 1. AppCard with custom width for the grid layout */}
            <AppCard oStyle={{width: '800px', padding: '40px'}}>

                <h2 style={{textAlign: 'center', marginBottom: '25px', marginTop: 0, color: '#333'}}>
                    Create Account
                </h2>

                <form onSubmit={handleRegister} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>

                    {/* --- THE GRID CONTAINER --- */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr', // 2 Equal Columns
                        gap: '20px'
                    }}>
                        {/* Row 1 */}
                        <AppTextInput sPlaceholder="Name" required/>
                        <AppTextInput sPlaceholder="Surname" required/>

                        {/* Row 2 */}
                        <AppTextInput type="email" sPlaceholder="Email" required/>
                        <AppTextInput type="email" sPlaceholder="Confirm Email" required/>

                        {/* Row 3 */}
                        <AppTextInput type="password" sPlaceholder="Password" required/>
                        <AppTextInput type="password" sPlaceholder="Confirm Password" required/>
                    </div>

                    {/* --- Terms and Conditions Checkbox --- */}
                    {/* We use AppCheckbox, passing the JSX element as the sLabel */}
                    <div style={{marginTop: '5px'}}>
                        <AppCheckbox
                            sName="terms"
                            bRequired={true}
                            sLabel={termsLabel} // Passing the JSX logic here works perfectly
                        />
                    </div>

                    {/* --- Submit Button --- */}
                    <AppButton
                        type="submit"
                        sVariant="success"
                        oStyle={{width: '100%', marginTop: '10px'}}
                    >
                        Sign Up
                    </AppButton>

                </form>

                {/* --- Footer Link --- */}
                <p style={{textAlign: 'center', fontSize: '14px', color: '#666', marginTop: '20px'}}>
                    Already have an account?{' '}
                    <Link to="/login" style={{color: '#007bff', textDecoration: 'none'}}>Login</Link>
                </p>

            </AppCard>
        </div>
    );
};

export default Register;
