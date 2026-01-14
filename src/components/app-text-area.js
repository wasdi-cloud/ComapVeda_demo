import React from 'react';

const AppTextArea = ({
                         sValue,
                         fnOnChange,
                         sPlaceholder,
                         sName,
                         iRows = 3,
                         oStyle = {}
                     }) => {
    return (
        <textarea
            name={sName}
            value={sValue}
            onChange={fnOnChange}
            placeholder={sPlaceholder}
            rows={iRows}
            style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                ...oStyle
            }}
        />
    );
};

export default AppTextArea;
