import React, { useState } from 'react';

const AppButton = ({
                       children,
                       fnOnClick,
                       sVariant = "primary", // primary, outline, success, danger
                       oStyle = {},
                       type = "button"
                   }) => {
    const [bHover, setBHover] = useState(false);

    // Define base styles for aoVariants
    const aoVariants = {
        primary: {
            bg: '#007bff', color: 'white', border: 'none',
            hoverBg: '#0056b3', hoverColor: 'white'
        },
        secondary: {
            bg: '#5190e6', color: 'white', border: 'none',
            hoverBg: '#0056b3', hoverColor: 'white'
        },
        success: {
            bg: '#28a745', color: 'white', border: 'none',
            hoverBg: '#218838', hoverColor: 'white'
        },
        outline: {
            bg: 'transparent', color: '#007bff', border: '1px solid #007bff',
            hoverBg: '#007bff', hoverColor: 'white'
        },
        danger: {
            bg: '#dc3545', color: 'white', border: 'none',
            hoverBg: '#c82333', hoverColor: 'white'
        }
    };

    const oCurrentVariant = aoVariants[sVariant] || aoVariants.primary;

    const oBaseStyle = {
        padding: '10px 20px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '14px',
        transition: 'all 0.2s ease',
        background: bHover ? oCurrentVariant.hoverBg : oCurrentVariant.bg,
        color: bHover ? oCurrentVariant.hoverColor : oCurrentVariant.color,
        border: oCurrentVariant.border,
        ...oStyle
    };

    return (
        <button
            type={type}
            onClick={fnOnClick}
            onMouseEnter={() => setBHover(true)}
            onMouseLeave={() => setBHover(false)}
            style={oBaseStyle}
        >
            {children}
        </button>
    );
};

export default AppButton;
