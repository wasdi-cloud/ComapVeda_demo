// components/AppNavbar.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

// Import our auth helpers
import { isAuthenticated } from '../services/session';
import { logout } from '../services/auth-service';

const AppNavbar = () => {
    const navigate = useNavigate();

    // 1. Check if the user is currently logged in
    const bIsLoggedIn = isAuthenticated();

    // 2. State for the profile dropdown
    const [bShowDropdown, setBShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // 3. Close dropdown if the user clicks outside of it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setBShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 4. Handle logging out
    const handleLogout = async () => {
        setBShowDropdown(false); // Close menu
        await logout();          // Clear session and route to login
    };

    return (
        <nav style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 30px',
            background: '#0f2a4a',
            color: 'white',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            zIndex: 1000,
            position: 'relative'
        }}>

            {/* LOGO & TITLE SECTION */}
            <Link to="/" style={{ textDecoration: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                    src={logo}
                    alt="COMAP Logo"
                    style={{ height: '50px', width: '110px', objectFit: 'contain' }}
                />
            </Link>

            {/* LINKS SECTION */}
            <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
                <Link to="/" style={{ textDecoration: 'none' }}>
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>Home</span>
                </Link>

                {/* --- CONDITIONALLY RENDERED LINKS --- */}
                {/* These only show up if bIsLoggedIn is TRUE */}
                {bIsLoggedIn && (
                    <>
                        <Link to="/project-requests" style={{ textDecoration: 'none' }}>
                            <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>Requests</span>
                        </Link>
                        <Link to="/label-templates" style={{ textDecoration: 'none' }}>
                            <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>Templates</span>
                        </Link>
                        <Link to="/new-project" style={{ textDecoration: 'none' }}>
                            <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>New Project</span>
                        </Link>
                    </>
                )}

                {/* --- USER PROFILE / LOGIN SECTION --- */}
                {bIsLoggedIn ? (
                    <div style={{ position: 'relative' }} ref={dropdownRef}>
                        {/* User Avatar Circle */}
                        <div
                            onClick={() => setBShowDropdown(!bShowDropdown)}
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                backgroundColor: '#1890ff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                userSelect: 'none',
                                border: '2px solid rgba(255,255,255,0.2)'
                            }}
                            title="My Account"
                        >
                            👤
                        </div>

                        {/* Dropdown Menu */}
                        {bShowDropdown && (
                            <div style={{
                                position: 'absolute',
                                top: '50px',
                                right: '0',
                                backgroundColor: 'white',
                                borderRadius: '6px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                minWidth: '150px',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <Link
                                    to="/profile"
                                    onClick={() => setBShowDropdown(false)}
                                    style={{
                                        padding: '12px 15px',
                                        textDecoration: 'none',
                                        color: '#333',
                                        fontSize: '13px',
                                        borderBottom: '1px solid #eee'
                                    }}
                                    onMouseOver={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                    onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
                                >
                                    ⚙️ My Profile
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    style={{
                                        padding: '12px 15px',
                                        background: 'none',
                                        border: 'none',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        color: '#dc3545',
                                        fontSize: '13px',
                                        fontWeight: 'bold'
                                    }}
                                    onMouseOver={(e) => e.target.style.backgroundColor = '#fcf0f0'}
                                    onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                    🚪 Log Out
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Shows if the user is NOT logged in */
                    <Link to="/login" style={{ textDecoration: 'none' }}>
                        <span style={{
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            border: '1px solid rgba(255,255,255,0.5)',
                            padding: '6px 16px',
                            borderRadius: '20px',
                            transition: 'background 0.2s'
                        }}
                              onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                            Log In
                        </span>
                    </Link>
                )}

            </div>
        </nav>
    );
};

export default AppNavbar;
