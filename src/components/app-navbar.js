// components/AppNavbar.js
import React from 'react';
import { Link } from 'react-router-dom';
import AppButton from "./app-button";
// import { AppButton } from ... (your button path)

const AppNavbar = () => {
    return (
        <nav style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '15px 30px', background: '#333', color: 'white'
        }}>
            <div style={{fontSize: '20px', fontWeight: 'bold'}}>🌍 COMAP App</div>
            <div style={{display: 'flex', gap: '15px'}}>
                <Link to="/login" style={{textDecoration: 'none'}}>
                    <span style={{color: 'white', marginRight: '15px', lineHeight: '34px'}}>My Account</span>
                </Link>
                <Link to="/approve-project" style={{textDecoration: 'none'}}>
                    <span style={{color: 'white', marginRight: '15px', lineHeight: '34px'}}>Requests</span>
                </Link>
                <Link to="/label-templates" style={{textDecoration: 'none'}}>
                    <span style={{color: 'white', marginRight: '15px', lineHeight: '34px'}}>Templates</span>
                </Link>
                <Link to="/new-project" style={{textDecoration: 'none'}}>
                    <span style={{color: 'white', marginRight: '15px', lineHeight: '34px'}}>New Project</span>
                </Link>
                <Link to="/" style={{textDecoration: 'none'}}>
                    <span style={{color: 'white', marginRight: '15px', lineHeight: '34px'}}>Home</span>
                </Link>
                <Link to="/login" style={{textDecoration: 'none'}}>
                    <span style={{color: 'white', marginRight: '15px', lineHeight: '34px'}}>Login</span>
                </Link>
                <Link to="/register" style={{textDecoration: 'none'}}>
                    <AppButton sVariant="success" oStyle={{padding: '5px 15px'}}>Register</AppButton>
                </Link>
                
            </div>
        </nav>
    );
};

export default AppNavbar;
