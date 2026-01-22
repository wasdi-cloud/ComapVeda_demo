import React from 'react';

const AppDateInput = ({ sLabel, sName, sValue, fnOnChange, oStyle, disabled, bRequired }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', ...oStyle }}>
            {sLabel && <label style={{ marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#555' }}>{sLabel}</label>}
            <input
                type="date"
                name={sName}
                value={sValue}
                onChange={fnOnChange}
                disabled={disabled}
                required={bRequired}
                // FIX: Silence warning
                readOnly={!fnOnChange}
                style={{
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    background: disabled ? '#eee' : 'white',
                    color: disabled ? '#666' : 'black'
                }}
            />
        </div>
    );
};

export default AppDateInput;
