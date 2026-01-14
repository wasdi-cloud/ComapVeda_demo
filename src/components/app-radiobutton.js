import React from 'react';

const AppRadioButton = ({
                            bChecked,
                            fnOnChange,
                            sLabel,
                            sName,
                            sValue,
                            oStyle = {}
                        }) => {
    return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', ...oStyle }}>
            <input
                type="radio"
                name={sName}
                value={sValue}
                checked={bChecked}
                onChange={fnOnChange}
                style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px', color: '#333' }}>{sLabel}</span>
        </label>
    );
};

export default AppRadioButton;
