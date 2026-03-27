import oRequest from './api';
import { clearSession, setSession } from "./session";

// --- 1. AUTHENTICATION API CALLS ---

export const register = async (oUserData) => {
    return await oRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(oUserData)
    });
};

export const confirmRegistration = async (oPayload) => {
    return await oRequest('/auth/confirmRegistration', {
        method: 'POST',
        body: JSON.stringify(oPayload)
    });
};

export const login = async (oCredentials) => {
    const response = await oRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(oCredentials)
    });

    // Save token to localStorage using your session utility
    if (response && response.session_token) {
        setSession(response.session_token, response);
    }
    return response;
};

export const recoverPassword = async (sEmail) => {
    return await oRequest('/auth/recover-password', {
        method: 'POST',
        body: JSON.stringify({ email: sEmail })
    });
};

export const changePassword = async (oPayload) => {
    return await oRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(oPayload)
    });
};

export const logout = async () => {
    try {
        await oRequest('auth/logout', { method: 'POST' });
    } catch (e) {
        console.error("Logout API failed, clearing local session anyway.");
    }
    clearSession();
    window.location.href = '/login';
};
