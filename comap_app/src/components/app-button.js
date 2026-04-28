import React, { useState } from 'react';

const AppButton = ({
                       children,
                       fnOnClick,
                       sVariant = "primary", // primary, secondary, outline, success, danger
                       oStyle = {},
                       type = "button",
                       disabled = false // <-- 1. ADD THE DISABLED PROP HERE
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
        fontWeight: 'bold',
        fontSize: '14px',
        transition: 'all 0.2s ease',
        border: oCurrentVariant.border,

        // --- 2. UPDATE STYLES BASED ON DISABLED STATE ---
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        // Only apply hover colors if the button is NOT disabled
        background: (bHover && !disabled) ? oCurrentVariant.hoverBg : oCurrentVariant.bg,
        color: (bHover && !disabled) ? oCurrentVariant.hoverColor : oCurrentVariant.color,

        ...oStyle
    };

    return (
        <button
            type={type}
            disabled={disabled} // <-- 3. PASS IT TO THE NATIVE HTML BUTTON
            onClick={(e) => {
                // <-- 4. LOGIC SHIELD: Don't fire if disabled!
                if (!disabled && fnOnClick) {
                    fnOnClick(e);
                }
            }}
            onMouseEnter={() => setBHover(true)}
            onMouseLeave={() => setBHover(false)}
            style={oBaseStyle}
        >
            {children}
        </button>
    );
};

export default AppButton;
