import React from 'react';

const AppTextInput = ({sLabel, sName, sValue, fnOnChange, type = "text", sPlaceholder, oStyle, disabled, required}) => {
    return (
        <div style={{display: 'flex', flexDirection: 'column', marginBottom: '10px', ...oStyle}}>
            {sLabel && <label style={{marginBottom: '5px', fontSize: '14px', color: '#666'}}>{sLabel}</label>}
            <input
                type={type}
                name={sName}
                value={sValue}
                onChange={fnOnChange}
                placeholder={sPlaceholder}
                disabled={disabled}
                required={required}
                // FIX: If no handler is provided, explicitly set readOnly to silence React warning
                readOnly={!fnOnChange}
                style={{
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    fontSize: '14px',
                    backgroundColor: disabled ? '#f5f5f5' : 'white', // Visual feedback for disabled
                    color: disabled ? '#888' : '#333'
                }}
            />
        </div>
    );
};

export default AppTextInput;
