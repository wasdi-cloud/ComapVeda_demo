// src/components/app-notification.js
import React, {useEffect} from 'react';

const AppNotification = ({message, type = 'info', show, onClose}) => {
    // Auto-dismiss after 3 seconds
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    if (!show) return null;

// Dynamically set colors based on the type of message
    const getStyles = () => {
        switch (type) {
            case 'success':
                return {bg: '#d4edda', color: '#155724', border: '#c3e6cb', icon: '✅'};
            case 'error':
                return {bg: '#f8d7da', color: '#721c24', border: '#f5c6cb', icon: '🛑'};
            case 'warning':
                return {bg: '#fff3cd', color: '#856404', border: '#ffeeba', icon: '⚠️'};
            default:
                return {bg: '#e2e3e5', color: '#383d41', border: '#d6d8db', icon: 'ℹ️'};
        }
    };

    const {bg, color, border, icon} = getStyles();

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: bg,
            color: color,
            border: `1px solid ${border}`,
            padding: '15px 20px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999, // Ensures it stays on top of everything
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '250px',
            animation: 'slideIn 0.3s ease-out forwards'
        }}>
            <style>
                {`
    @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
to { transform: translateX(0); opacity: 1; }
}
`}
            </style>
            <span>{icon}</span>
            <span style={{flex: 1, fontWeight: 'bold', fontSize: '14px'}}>{message}</span>
            <button onClick={onClose} style={{
                background: 'none',
                border: 'none',
                color,
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold',
                padding: 0
            }}>
                ×
            </button>
        </div>
    );
};

export default AppNotification;
