import oRequest from './api';
import {clearSession, setSession} from "./session";

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
export const resendOtp = async (oPayload) => {
    try {
        // oPayload should be: { email: "user@example.com" }
        return await oRequest('/auth/resendOtp', {method:'POST',body:JSON.stringify(oPayload)});
    } catch (error) {
        throw error;
    }
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

export const requestPasswordReset = async (email) => {
    return await oRequest('/auth/forgotPassword', {
        method: 'POST',
        body: JSON.stringify({ email })
    });
};

export const verifyResetOTP = async (email, otp_code) => {
    return await oRequest('/auth/verifyForgotPasswordOtp', {
        method: 'POST',
        body: JSON.stringify({ email, otp_code })
    });
};

export const resetPassword = async (email, otp_code, new_password) => {
    return await oRequest('/auth/updateForgotPassword', {
        method: 'POST',
        body: JSON.stringify({ email, otp_code, new_password })
    });
};
