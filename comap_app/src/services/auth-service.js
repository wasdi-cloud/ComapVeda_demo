import oRequest from './api';
import {clearSession, setSession} from "./session";

// --- 1. AUTHENTICATION API CALLS ---

/**
 * Register a new user
 * @param {Object} oUserData - { name, surname, email, password, etc. }
 */
export const register = async (oUserData) => {
    return await oRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(oUserData)
    });
};

/**
 * Confirm registration via OTP or Token
 * @param {Object} oPayload - { email, code }
 */


export const confirmRegistration = async (oPayload) => {
    return await oRequest('/auth/confirm-registration', {
        method: 'POST',
        body: JSON.stringify(oPayload)
    });
};

/**
 * Login user and receive Token
 * @param {Object} oCredentials - { email, password }
 */
export const login = async (oCredentials) => {
    const response = await oRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(oCredentials)
    });

    // Check if your backend sends the token in the body
    if (response.token) {
        setSession(response.token, response.user);
    }

    return response;
};

/**
 * Request a password reset link (Forgot Password)
 * @param {String} sEmail
 */
export const recoverPassword = async (sEmail) => {
    return await oRequest('/auth/recover-password', {
        method: 'POST',
        body: JSON.stringify({email: sEmail})
    });
};

/**
 * Change password (usually requires old password or reset token)
 * @param {Object} oPayload - { oldPassword, newPassword } OR { token, newPassword }
 */
export const changePassword = async (oPayload) => {
    return await oRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(oPayload)
    });
};

export const logout = () => {
    clearSession();
    window.location.href = '/login';
};


