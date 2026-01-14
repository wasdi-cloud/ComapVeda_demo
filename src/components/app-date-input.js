import React from 'react';

const AppDateInput = ({
                          sLabel,       // String: The label text (e.g. "Start Date")
                          sName,        // String: Form field name
                          sValue,       // String: The date value (YYYY-MM-DD)
                          fnOnChange,   // Function: Handle change
                          bRequired = false,
                          oStyle = {}
                      }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
            {sLabel && (
                <label style={{
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: '#555'
                }}>
                    {sLabel}
                </label>
            )}
            <input
                type="date"
                name={sName}
                value={sValue}
                onChange={fnOnChange}
                required={bRequired}
                style={{
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box', // Critical for grid alignment
                    ...oStyle
                }}
            />
        </div>
    );
};

export default AppDateInput;
