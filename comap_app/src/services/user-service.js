import request from './api';

export const getMyProfile = async () => {
    return await request('users/me', {
        method: 'GET'
    });
};

export const updateMyProfile = async (oData) => {
    return await request('users/me', {
        method: 'PUT',
        body: JSON.stringify(oData)
    });
};
