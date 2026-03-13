import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Import reusable components
import AppCard from '../components/app-card';
import AppTextInput from '../components/app-text-input';
import AppButton from '../components/app-button';
import AppCheckbox from '../components/app-checkbox';
import AppNotification from '../dialogues/app-notifications';

import { register } from '../services/auth-service';

const Register = () => {
    const navigate = useNavigate();

    // --- STATE ---
    const [oNotification, setNotification] = useState({ show: false, message: '', type: 'info' });
    const showNotif = (message, type = 'info') => {
        setNotification({ show: true, message, type });
    };

    const [sName, setSName] = useState("");
    const [sSurname, setSSurname] = useState("");
    const [sEmail, setSEmail] = useState("");
    const [sConfirmEmail, setSConfirmEmail] = useState("");
    const [sPassword, setSPassword] = useState("");
    const [sConfirmPassword, setSConfirmPassword] = useState("");
    const [bTermsAccepted, setTermsAccepted] = useState(false);
    const [bIsSubmitting, setIsSubmitting] = useState(false);

    // --- HANDLER ---
    const handleRegister = async (e) => {
        e.preventDefault();

        if (sEmail !== sConfirmEmail) return showNotif("Emails do not match!", "error");
        if (sPassword !== sConfirmPassword) return showNotif("Passwords do not match!", "error");
        if (!bTermsAccepted) return showNotif("You must accept the Terms and Conditions.", "warning");

        setIsSubmitting(true);

        try {
            const oPayload = {
                name: sName,
                surname: sSurname,
                email: sEmail,
                password: sPassword
            };

            await register(oPayload);
            showNotif("Registration successful! Check your email for the OTP.", "success");

            setTimeout(() => {
                // Pass the email to the next page!
                navigate('/confirm-register', { state: { email: sEmail } });
            }, 1500);

        } catch (error) {
            showNotif(error.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const termsLabel = (
        <span>I accept the <a href="#terms" target="_blank" rel="noopener noreferrer" style={{color: '#007bff', textDecoration: 'none'}}>Terms and Conditions</a></span>
    );

    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f2f5' }}>

            <AppNotification show={oNotification.show} message={oNotification.message} type={oNotification.type} onClose={() => setNotification(prev => ({ ...prev, show: false }))} />

            <AppCard oStyle={{width: '800px', padding: '40px'}}>
                <h2 style={{textAlign: 'center', marginBottom: '25px', marginTop: 0, color: '#333'}}>Create Account</h2>

                <form onSubmit={handleRegister} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <AppTextInput sPlaceholder="Name" required sValue={sName} fnOnChange={(e)=> setSName(e.target.value)}/>
                        <AppTextInput sPlaceholder="Surname" required sValue={sSurname} fnOnChange={(e)=> setSSurname(e.target.value)}/>
                        <AppTextInput type="email" sPlaceholder="Email" required sValue={sEmail} fnOnChange={(e)=> setSEmail(e.target.value)}/>
                        <AppTextInput type="email" sPlaceholder="Confirm Email" required sValue={sConfirmEmail} fnOnChange={(e)=> setSConfirmEmail(e.target.value)}/>
                        <AppTextInput type="password" sPlaceholder="Password" required sValue={sPassword} fnOnChange={(e)=> setSPassword(e.target.value)}/>
                        <AppTextInput type="password" sPlaceholder="Confirm Password" required sValue={sConfirmPassword} fnOnChange={(e)=> setSConfirmPassword(e.target.value)}/>
                    </div>

                    <div style={{marginTop: '5px'}}>
                        <AppCheckbox sName="terms" bRequired={true} sLabel={termsLabel} bChecked={bTermsAccepted} fnOnChange={(e) => setTermsAccepted(e.target.checked)} />
                    </div>

                    <AppButton type="submit" sVariant="success" oStyle={{width: '100%', marginTop: '10px'}} disabled={bIsSubmitting}>
                        {bIsSubmitting ? "Creating Account..." : "Sign Up"}
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
