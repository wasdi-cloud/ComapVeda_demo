import {getToken} from "./session";

// Use environment variable or fallback to localhost
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/";

// Helper function to handle Headers and Errors
const oRequest = async (sEndPointUrl, oOptions = {}) => {
    // 1. Get Token using the new utility
    const sToken = getToken();

    // 2. Set Default Headers
    const oDefaultHeaders = {
        "Content-Type": "application/json",
        ...(sToken && { Authorization: `Bearer ${sToken}` })
    };

    // 3. Merge Config
    const oConfig = {
        ...oOptions,
        headers: {
            ...oDefaultHeaders,
            ...oOptions.headers
        }
    };

    try {
        const oResponse = await fetch(`${BASE_URL}${sEndPointUrl}`, oConfig);

        // 4. Handle HTTP Errors (4xx, 5xx)
        if (!oResponse.ok) {
            const sErrorBody = await oResponse.json();
            throw new Error(sErrorBody.message || "Something went wrong");
        }

        // 5. Return JSON
        // Check if response has content before parsing
        const sContentType = oResponse.headers.get("content-type");
        if (sContentType && sContentType.indexOf("application/json") !== -1) {
            return await oResponse.json();
        }

        return null; // For 204 No Content

    } catch (error) {
        console.error("API Call Failed:", error);
        throw error; // Re-throw so the component can handle it
    }
};

export default oRequest;
