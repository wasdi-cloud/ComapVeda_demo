import oRequest from './api';

// --- LABEL MANAGEMENT ---

/**
 * Get all labels associated with a specific satellite image.
 * @param {String} sImageId
 */
export const getByImage = async (sImageId) => {
    return await oRequest(`/images/${sImageId}/labels`, {
        method: 'GET'
    });
};

/**
 * Add a new label (geometry + attributes) to the database.
 * @param {Object} oLabelData - { imageId, geometry, attributes, classId, etc. }
 */
export const add = async (oLabelData) => {
    return await oRequest('/labels', {
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
    return await oRequest(`/labels/${sLabelId}`, {
        method: 'PUT',
        body: JSON.stringify(oData)
    });
};

/**
 * Delete a label.
 * @param {String} sLabelId
 */
export const remove = async (sLabelId) => {
    return await oRequest(`/labels/${sLabelId}`, {
        method: 'DELETE'
    });
};

// --- VALIDATION WORKFLOW ---

/**
 * Mark a label as Validated/Approved.
 * @param {String} sLabelId
 */
export const approveLabelApi = async (sLabelId) => {
    return await oRequest(`/labels/approve?sLabelId=${sLabelId}`, { method: 'GET' });
};

export const sendLabelNoteApi = async (labelId, note) => {
    return await oRequest('/labels/addNote', {
        method: 'POST',
        body: JSON.stringify({ labelId: labelId, note: note })
    });
};

export const resolveLabelNoteApi = async (labelId, noteId) => {
    return await oRequest('/labels/resolveNote', {
        method: 'POST',
        body: JSON.stringify({ labelId: labelId, noteId: noteId })
    });
};
/**
 * Mark a label as Rejected (usually deletes it or flags it for correction).
 * @param {String} sLabelId
 * @param {String} sReason - Optional reason for rejection
 */
export const reject = async (sLabelId, sReason = "") => {
    return await oRequest(`/labels/${sLabelId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: sReason })
    });
};


// GET labels for an image
export const getLabelsByImage = async (projectId, imageId) => {
    return await oRequest(`labels/getByImage?project_id=${projectId}&sImageName=${imageId}`, {
        method: 'GET'
    });
};

// SYNC (Save) all labels for an image
export const syncLabels = async (imageId, labelsArray) => {
    return await oRequest(`labels/sync?image_id=${imageId}`, {
        method: 'POST',
        body: JSON.stringify(labelsArray)
    });
};
