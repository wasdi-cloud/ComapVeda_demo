import React from 'react';

const AppCheckbox = ({
                         bChecked,
                         fnOnChange,
                         sLabel,
                         sName,
                         bRequired = false,
                         oStyle = {}
                     }) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', ...oStyle }}>
            <input
                type="checkbox"
                name={sName}
                checked={bChecked}
                onChange={fnOnChange}
                required={bRequired}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            {sLabel && (
                <label style={{ fontSize: '14px', color: '#333', cursor: 'pointer' }}>
                    {sLabel}
                </label>
            )}
        </div>
    );
};

export default AppCheckbox;
