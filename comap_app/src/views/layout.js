// components/Layout.js
import React from 'react';
import { Outlet } from 'react-router-dom';
import AppNavbar from "../components/app-navbar";


const Layout = () => {
    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif'}}>
            {/* 1. The Navbar stays here forever */}
            <AppNavbar />

            {/* 2. The dynamic content (HomePage, LabelTemplates, etc.) loads here */}
            <div style={{flex: 1, overflowY: 'auto', background: '#f4f6f8'}}>
                <Outlet />
            </div>
        </div>
    );
};

export default Layout;
