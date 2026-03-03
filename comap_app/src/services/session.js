// src/utils/session.js

const TOKEN_KEY = 'jwt_token';
const USER_KEY = 'user_profile';

/**
 * Save the session data to LocalStorage
 */
export const setSession = (sToken, oUser) => {
    if (sToken) {
        localStorage.setItem(TOKEN_KEY, sToken);
    }
    if (oUser) {
        // We must stringify the object to save it in LocalStorage
        localStorage.setItem(USER_KEY, JSON.stringify(oUser));
    }
};

/**
 * Get the JWT Token (Used by api.js)
 */
export const getToken = () => {
    return localStorage.getItem(TOKEN_KEY);
};

/**
 * Get the full User object (Used by Components)
 */
export const getUser = () => {
    const sUser = localStorage.getItem(USER_KEY);
    try {
        return sUser ? JSON.parse(sUser) : null;
    } catch (error) {
        console.error("Could not parse user data", error);
        return null;
    }
};

/**
 * Clear session (Logout)
 */
export const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // Optional: Force reload to clear React state
    // window.location.href = '/login';
};
