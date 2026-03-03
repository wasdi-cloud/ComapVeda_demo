import React, { useState } from 'react'; // 1. Import useState
import { Link, useNavigate } from 'react-router-dom';
import AppCard from '../components/app-card';
import AppTextInput from '../components/app-text-input';
import AppButton from '../components/app-button';
import AppCheckbox from '../components/app-checkbox';

const Register = () => {
    const navigate = useNavigate();

    // 2. CREATE STATE FOR THE CHECKBOX
    const [bTermsAccepted, setTermsAccepted] = useState(false);

    const handleRegister = (e) => {
        e.preventDefault();
        navigate('/confirm-register');
    };

    const termsLabel = (
        <span>
            I accept the{' '}
            <a href="https://google.com" target="_blank" rel="noopener noreferrer" style={{color: '#007bff', textDecoration: 'none'}}>
                Terms and Conditions
            </a>
        </span>
    );

    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f2f5' }}>
            <AppCard oStyle={{width: '800px', padding: '40px'}}>
                <h2 style={{textAlign: 'center', marginBottom: '25px', marginTop: 0, color: '#333'}}>Create Account</h2>

                <form onSubmit={handleRegister} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <AppTextInput sPlaceholder="Name" required fnOnChange={(e)=> console.log(e)}/>
                        <AppTextInput sPlaceholder="Surname" required fnOnChange={(e)=> console.log(e)}/>
                        <AppTextInput type="email" sPlaceholder="Email" required fnOnChange={(e)=> console.log(e)}/>
                        <AppTextInput type="email" sPlaceholder="Confirm Email" required fnOnChange={(e)=> console.log(e)}/>
                        <AppTextInput type="password" sPlaceholder="Password" required fnOnChange={(e)=> console.log(e)}/>
                        <AppTextInput type="password" sPlaceholder="Confirm Password" required fnOnChange={(e)=> console.log(e)}/>
                    </div>

                    <div style={{marginTop: '5px'}}>
                        {/* 3. CONNECT STATE TO COMPONENT */}
                        <AppCheckbox
                            sName="terms"
                            bRequired={true}
                            sLabel={termsLabel}

                            // A. Bind the visual state
                            bChecked={bTermsAccepted}

                            // B. Update state on click
                            fnOnChange={(e) => setTermsAccepted(e.target.checked)}
                        />
                    </div>

                    <AppButton type="submit" sVariant="success" oStyle={{width: '100%', marginTop: '10px'}}>
                        Sign Up
                    </AppButton>
                </form>

                <p style={{textAlign: 'center', fontSize: '14px', color: '#666', marginTop: '20px'}}>
                    Already have an account? <Link to="/login" style={{color: '#007bff', textDecoration: 'none'}}>Login</Link>
                </p>
            </AppCard>
        </div>
    );
};

export default Register;
