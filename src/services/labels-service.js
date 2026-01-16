import request from './api';

// --- LABEL MANAGEMENT ---

/**
 * Get all labels associated with a specific satellite image.
 * @param {String} sImageId
 */
export const getByImage = async (sImageId) => {
    return await request(`/images/${sImageId}/labels`, {
        method: 'GET'
    });
};

/**
 * Add a new label (geometry + attributes) to the database.
 * @param {Object} oLabelData - { imageId, geometry, attributes, classId, etc. }
 */
export const add = async (oLabelData) => {
    return await request('/labels', {
        method: 'POST',
        body: JSON.stringify(oLabelData)
    });
};

/**
 * Update an existing label (geometry or attributes).
 * @param {String} sLabelId
 * @param {Object} oData - Fields to update
 */
export const edit = async (sLabelId, oData) => {
    return await request(`/labels/${sLabelId}`, {
        method: 'PUT',
        body: JSON.stringify(oData)
    });
};

/**
 * Delete a label.
 * @param {String} sLabelId
 */
export const remove = async (sLabelId) => {
    return await request(`/labels/${sLabelId}`, {
        method: 'DELETE'
    });
};

// --- VALIDATION WORKFLOW ---

/**
 * Mark a label as Validated/Approved.
 * @param {String} sLabelId
 */
export const approve = async (sLabelId) => {
    return await request(`/labels/${sLabelId}/approve`, {
        method: 'POST'
    });
};

/**
 * Mark a label as Rejected (usually deletes it or flags it for correction).
 * @param {String} sLabelId
 * @param {String} sReason - Optional reason for rejection
 */
export const reject = async (sLabelId, sReason = "") => {
    return await request(`/labels/${sLabelId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: sReason })
    });
};
