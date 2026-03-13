import request from './api';
import { clearSession, setSession } from "./session";

// --- 1. AUTHENTICATION API CALLS ---

export const register = async (oUserData) => {
    return await request('auth/register', {
        method: 'POST',
        body: JSON.stringify(oUserData)
    });
};

export const confirmRegistration = async (oPayload) => {
    const response = await request('auth/confirmRegistration', {
        method: 'POST',
        body: JSON.stringify(oPayload)
    });

    // Auto-login if backend provides the token!
    if (response && response.session_token) {
        setSession(response.session_token, response);
    }
    return response;
};

export const login = async (oCredentials) => {
    const response = await request('auth/login', {
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
    return await request('auth/recoverPassword', {
        method: 'POST',
        body: JSON.stringify({ email: sEmail })
    });
};

export const changePassword = async (oPayload) => {
    return await request('auth/changePassword', {
        method: 'POST',
        body: JSON.stringify(oPayload)
    });
};

export const logout = async () => {
    try {
        await request('auth/logout', { method: 'POST' });
    } catch (e) {
        console.error("Logout API failed, clearing local session anyway.");
    }
    clearSession();
    window.location.href = '/login';
};
