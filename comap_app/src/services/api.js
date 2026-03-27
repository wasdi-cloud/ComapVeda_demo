import { getToken } from "./session";

// Use environment variable or fallback to localhost
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/";

// Helper function to handle Headers and Errors
const oRequest = async (sEndPointUrl, oOptions = {}) => {
    // Get Token 
    const sToken = getToken();

    // Set Default Headers: json and auth token if available
    const oDefaultHeaders = {
        "Content-Type": "application/json",
        // FIX 1: Send the exact header name FastAPI expects, plus standard Authorization just in case
        ...(sToken && { "X-Session-Token": sToken }),
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
        let sUrl = `${BASE_URL}`;
        if (!sUrl.endsWith('/')) {
            sUrl += "/";
        }

        if (sEndPointUrl.startsWith('/')) {
            sEndPointUrl = sEndPointUrl.substring(1);
        }

        sUrl += sEndPointUrl;

        const oResponse = await fetch(sUrl, oConfig);

        // 4. Handle HTTP Errors (4xx, 5xx)
        if (!oResponse.ok) {
            // Safely try to parse the error body
            let oErrorBody = {};
            try {
                oErrorBody = await oResponse.json();
            } catch (e) {
                // If it's not JSON, do nothing
            }

            // FIX 2: Check for FastAPI's 'detail' property first!
            throw new Error(oErrorBody.detail || oErrorBody.message || "Something went wrong");
        }

        // 5. Return JSON
        // Check if response has content before parsing
        const sContentType = oResponse.headers.get("content-type");
        if (sContentType && sContentType.indexOf("application/json") !== -1) {
            return await oResponse.json();
        }

        return null; // For 204 No Content

    } catch (oError) {
        console.error("API Call Failed:", oError);
        throw oError; // Re-throw so the component can handle it
    }
};

export default oRequest;
