import {getToken} from "./session";

const BASE_URL = "http://localhost:8080/api"; // Your Backend URL

// Helper function to handle Headers and Errors
const request = async (endpoint, options = {}) => {
    // 1. Get Token using the new utility
    const token = getToken();

    // 2. Set Default Headers
    const defaultHeaders = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` })
    };

    // 3. Merge Config
    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, config);

        // 4. Handle HTTP Errors (4xx, 5xx)
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.message || "Something went wrong");
        }

        // 5. Return JSON
        // Check if response has content before parsing
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return await response.json();
        }
        return null; // For 204 No Content

    } catch (error) {
        console.error("API Call Failed:", error);
        throw error; // Re-throw so the component can handle it
    }
};

export default request;
