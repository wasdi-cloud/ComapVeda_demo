import React from 'react';

const AppRadioButton = ({ sLabel, sName, sValue, bChecked, fnOnChange, disabled }) => {
    return (
        <label style={{ display: 'flex', alignItems: 'center', cursor: disabled ? 'not-allowed' : 'pointer', marginRight: '15px' }}>
            <input
                type="radio"
                name={sName}
                value={sValue}
                checked={bChecked || false}
                onChange={fnOnChange}
                disabled={disabled}
                // FIX: Silence warning
                readOnly={!fnOnChange}
                style={{ marginRight: '8px' }}
            />
            <span style={{ color: disabled ? '#999' : '#333' }}>{sLabel}</span>
        </label>
    );
};

export default AppRadioButton;
