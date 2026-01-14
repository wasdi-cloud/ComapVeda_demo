import React from 'react';

const AppCard = ({ children, oStyle = {} }) => {
    return (
        <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            marginBottom: '20px',
            ...oStyle
        }}>
            {children}
        </div>
    );
};

export default AppCard;
