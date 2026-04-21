import React from 'react';

const AppDropdown = ({
                         aoOptions = [],
                         sValue,
                         sPlaceholder,
                         fnOnChange,
                         oStyle = {},
                         sLabel, // <-- 1. Extract sLabel so it doesn't fall into ...props
                         children,
                         ...props
                     }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            {/* 2. Actually render the label to the screen if it exists! */}
            {sLabel && (
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '5px' }}>
                    {sLabel}
                </label>
            )}
            <select
                value={sValue || ""}
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
                {sPlaceholder && (
                    <option value="" disabled hidden>
                        {sPlaceholder}
                    </option>
                )}

                {aoOptions.length > 0
                    ? aoOptions.map((opt, index) => {
                        const val = typeof opt === 'object' ? opt.value : opt;
                        const label = typeof opt === 'object' ? opt.label : opt;
                        return <option key={index} value={val}>{label}</option>;
                    })
                    : children
                }
            </select>
        </div>
    );
};

export default AppDropdown;
