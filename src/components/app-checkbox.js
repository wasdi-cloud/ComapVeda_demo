import React from 'react';

const AppCheckbox = ({ sLabel, sName, bChecked, fnOnChange, oStyle, disabled }) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', ...oStyle }}>
            <input
                type="checkbox"
                name={sName}
                checked={bChecked || false} // Ensure it's never undefined
                onChange={fnOnChange}
                disabled={disabled}
                // FIX: Silence warning
                readOnly={!fnOnChange}
                style={{ width: '16px', height: '16px', cursor: disabled ? 'not-allowed' : 'pointer' }}
            />
            {sLabel && (
                <label style={{ fontSize: '14px', color: disabled ? '#999' : '#333' }}>
                    {sLabel}
                </label>
            )}
        </div>
    );
};

export default AppCheckbox;
