import { getToken } from "./session";

// Use environment variable or fallback to localhost
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/";

// Helper function to handle Headers and Errors
const request = async (endpoint, options = {}) => {
    // 1. Get Token using the utility
    const token = getToken();

    // 2. Set Default Headers
    const defaultHeaders = {
        "Content-Type": "application/json",
        // FIX 1: Send the exact header name FastAPI expects, plus standard Authorization just in case
        ...(token && {
            "Authorization": `Bearer ${token}`,
            "X-Session-Token": token
        })
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
            // Safely try to parse the error body
            let errorBody = {};
            try {
                errorBody = await response.json();
            } catch (e) {
                // If it's not JSON, do nothing
            }

            // FIX 2: Check for FastAPI's 'detail' property first!
            const errorMessage = errorBody.detail || errorBody.message || "Something went wrong";
            throw new Error(errorMessage);
        }

        // 5. Return JSON
        // Check if response has content before parsing
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return await response.json();
        }
        return null; // For 204 No Content

    } catch (error) {
        console.error("API Call Failed:", error);
        throw error; // Re-throw so the component can handle it
    }
};

export default request;
