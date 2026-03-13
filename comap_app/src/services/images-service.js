import request from './api';

// --- IMAGE MANAGEMENT ---

/**
 * Search for available EO images (Sentinel, Landsat, etc.) from external providers.
 * @param {Object} oQueryParams - { startDate, endDate, cloudCover, productType, aoi, etc. }
 */
export const searchImages = async (oQueryParams) => {
    // Convert the object into a URL query string (e.g., ?bbox=...&start_date=...)
    const queryString = new URLSearchParams(oQueryParams).toString();

    return await request(`images/search?${queryString}`, {
        method: 'GET'
    });
};

/**
 * Import selected images into a specific project.
 * @param oImageImportPayload
 */
export const importImage = async (oImageImportPayload) => {
    return await request('images/import', {
        method: 'POST',
        body: JSON.stringify(oImageImportPayload)
    });
};
/**
 * Get details of a specific image (Metadata, bands, etc.)
 * @param {String} sImageId
 */
export const get = async (sImageId) => {
    return await request(`/images/${sImageId}`, {
        method: 'GET'
    });
};

/**
 * Get list of all images associated with a specific project.
 * @param {String} sProjectId
 */
export const getProjectImages = async (sProjectId) => {
    // Make sure the URL matches the prefix of your router!
    return await request(`images/getListByProject/${sProjectId}`, {
        method: 'GET'
    });
};

/**
 * Remove an image from the platform/project.
 * @param {String} sImageId
 */
export const remove = async (sImageId) => {
    return await request(`/images/${sImageId}`, {
        method: 'DELETE'
    });
};

// --- OPTIONAL: TILE SERVICE HELPER ---

/**
 * Helper to construct the Tile URL for the Mapbox/Leaflet map.
 * This isn't an async API call, but a utility to format the string.
 */
export const getTileUrl = (sImageId) => {
    // Adjust based on your actual Tiler URL (e.g., TiTiler)
    const BASE_TILE_URL = "http://localhost:8000/tiles";
    return `${BASE_TILE_URL}/WebMercatorQuad/{z}/{x}/{y}.png?url=${sImageId}`;
};


export const seedDemoImages = async () => {
    // Assuming your endpoint is at /seed-demo-images
    return await request(`seed-demo-images`, {
        method: 'GET'
    });
};
