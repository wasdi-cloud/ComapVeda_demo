// components/AppNavbar.js
import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

const AppNavbar = () => {
    // Placeholder logo (Earth/Map icon).
    // Replace this string with your imported local variable if you have a file.

    return (
        <nav style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 30px',
            // 1. Changed to Dark Blue
            background: '#0f2a4a',
            color: 'white',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            zIndex: 1000,
            position: 'relative'
        }}>

            {/* 2. LOGO & TITLE SECTION */}
            <Link to="/" style={{ textDecoration: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                    src={logo}
                    alt="COMAP Logo"
                    style={{ height: '50px', width: '110px', objectFit: 'contain' }}
                />

            </Link>

            {/* LINKS SECTION */}
            <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
                <Link to="/login" style={{ textDecoration: 'none' }}>
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>My Account</span>
                </Link>
                {/* Note: Ensure this path matches your Route path for "ApproveProject" */}
                <Link to="/project-requests" style={{ textDecoration: 'none' }}>
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>Requests</span>
                </Link>
                <Link to="/label-templates" style={{ textDecoration: 'none' }}>
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>Templates</span>
                </Link>
                <Link to="/new-project" style={{ textDecoration: 'none' }}>
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>New Project</span>
                </Link>
                <Link to="/" style={{ textDecoration: 'none' }}>
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>Home</span>
                </Link>
            </div>
        </nav>
    );
};

export default AppNavbar;
