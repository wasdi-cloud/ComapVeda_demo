import React from 'react';

const AppTextInput = ({
                          sPlaceholder,
                          sValue,
                          fnOnChange,
                          sName,
                          oStyle = {},
                          ...props
                      }) => {
    return (
        <input
            type="text"
            name={sName}
            placeholder={sPlaceholder}
            value={sValue}
            onChange={fnOnChange}
            style={{
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '14px',
                outline: 'none',
                // Allow overrides
                ...oStyle
            }}
            {...props}
        />
    );
};

export default AppTextInput;
