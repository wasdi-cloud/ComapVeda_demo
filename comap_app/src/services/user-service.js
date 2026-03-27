import oRequest from './api';

export const getMyProfile = async () => {
    return await oRequest('users/me', {
        method: 'GET'
    });
};

export const updateMyProfile = async (oData) => {
    return await oRequest('users/me', {
        method: 'PUT',
        body: JSON.stringify(oData)
    });
};
