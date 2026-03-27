// components/Layout.js
import React from 'react';
import { Outlet } from 'react-router-dom';
import AppNavbar from "../components/app-navbar";
import NotificationContainer from "../components/NotificationContainer";
import { useWebSocket } from '../hooks/useWebSocket';
import { useProject } from '../contexts/ProjectContext';

const Layout = () => {
    const { currentProjectId } = useProject();

    // Global WebSocket connection for the current project
    useWebSocket(currentProjectId);

    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif'}}>
            {/* 1. The Navbar stays here forever */}
            <AppNavbar />

            {/* 2. The dynamic content (HomePage, LabelTemplates, etc.) loads here */}
            <div style={{flex: 1, overflowY: 'auto', background: '#f4f6f8'}}>
                <Outlet />
            </div>

            {/* 3. Global notifications */}
            <NotificationContainer />
        </div>
    );
};

export default Layout;
