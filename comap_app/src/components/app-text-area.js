import React from 'react';

const AppTextArea = ({sLabel, sName, sValue, fnOnChange, sPlaceholder, iRows = 3, oStyle, disabled}) => {
    return (
        <div style={{display: 'flex', flexDirection: 'column', marginBottom: '10px', ...oStyle}}>
            {sLabel && <label style={{marginBottom: '5px', fontSize: '14px', color: '#666'}}>{sLabel}</label>}
            <textarea
                name={sName}
                value={sValue}
                onChange={fnOnChange}
                rows={iRows}
                placeholder={sPlaceholder}
                disabled={disabled}
                // FIX: Silence warning
                readOnly={!fnOnChange}
                style={{
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    fontSize: '14px',
                    resize: 'vertical',
                    backgroundColor: disabled ? '#f5f5f5' : 'white',
                    color: disabled ? '#888' : '#333'
                }}
            />
        </div>
    );
};

export default AppTextArea;
