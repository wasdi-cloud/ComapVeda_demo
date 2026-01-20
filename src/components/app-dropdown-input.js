import React from 'react';

const AppDropdown = ({
                         aoOptions = [],
                         sValue,
                         sPlaceholder,
                         fnOnChange,
                         oStyle = {},
                         children,
                         ...props
                     }) => {
    return (
        <select
            value={sValue || ""} // Ensure it selects the placeholder if value is empty
            onChange={fnOnChange}
            // Remove 'placeholder' prop here! React hates it on <select>
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
            {/* 1. RENDER PLACEHOLDER AS THE FIRST OPTION */}
            {sPlaceholder && (
                <option value="" disabled hidden>
                    {sPlaceholder}
                </option>
            )}

            {/* 2. RENDER OPTIONS */}
            {aoOptions.length > 0
                ? aoOptions.map((opt, index) => {
                    const val = typeof opt === 'object' ? opt.value : opt;
                    const label = typeof opt === 'object' ? opt.label : opt;
                    return <option key={index} value={val}>{label}</option>;
                })
                : children
            }
        </select>
    );
};

export default AppDropdown;
