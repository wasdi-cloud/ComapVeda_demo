import request from './api';

// --- IMAGE STYLING MANAGEMENT ---





/**
 * Get the current style configuration for a specific image.
 * @param {String} sImageId
 */
export const get = async (sImageId) => {
    return await request(`/images/${sImageId}/style`, {
        method: 'GET'
    });
};

/**
 * Create a new style configuration for an image.
 * (Used the first time an image is styled)
 * @param {String} sImageId
 * @param {Object} oStyleData - { renderType, bands, effects, histogram }
 */
export const add = async (sImageId, oStyleData) => {
    return await request(`/images/${sImageId}/style`, {
        method: 'POST',
        body: JSON.stringify(oStyleData)
    });
};

/**
 * Update the existing style configuration for an image.
 * @param {String} sImageId
 * @param {Object} oStyleData
 */
export const update = async (sImageId, oStyleData) => {
    return await request(`/images/${sImageId}/style`, {
        method: 'PUT',
        body: JSON.stringify(oStyleData)
    });
};
