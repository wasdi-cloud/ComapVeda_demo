import React from 'react';

const AppDropdown = ({
                         aoOptions = [], // Array of strings or objects { value, label }
                         sValue,
                         fnOnChange,
                         oStyle = {},
                         children, // Allow manual <option> if needed
                         ...props
                     }) => {
    return (
        <select
            value={sValue}
            onChange={fnOnChange}
            style={{
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer',
                outline: 'none',
                ...oStyle
            }}
            {...props}
        >
            {/* Render options from array if provided */}
            {aoOptions.length > 0
                ? aoOptions.map((opt, index) => {
                    // Handle both simple strings and objects
                    const val = typeof opt === 'object' ? opt.value : opt;
                    const label = typeof opt === 'object' ? opt.label : opt;
                    return <option key={index} value={val}>{label}</option>;
                })
                : children // Fallback to manual children
            }
        </select>
    );
};

export default AppDropdown;
