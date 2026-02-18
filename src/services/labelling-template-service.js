import request from './api';

// --- 1. TEMPLATE MANAGEMENT ---

/**
 * Get a list of all labelling templates
 */
export const getLabelTemplates = async () => {
    return await request('templates/getList', {
        method: 'GET'
    });
};

/**
 * Get a specific template by its ID
 * @param {String} sTemplateId
 */
export const getById = async (sTemplateId) => {
    return await request(`/label-templates/${sTemplateId}`, {
        method: 'GET'
    });
};

/**
 * Get the label template associated with a specific project
 * @param {String} sProjectId
 */
export const getLabelTemplateByProject = async (sProjectId) => {
    return await request(`templates/getByProject?project_id=${sProjectId}`, {
        method: 'GET'
    });
};

/**
 * Create a new labeling template
 * @param {Object} oTemplateData - { name, description, geometryTypes, etc. }
 */
export const createTemplate = async (oTemplateData) => {
    return await request('templates/create', {
        method: 'POST',
        body: JSON.stringify(oTemplateData)
    });
};

/**
 * Update an existing template (General Info & Style)
 * @param {String} sTemplateId
 * @param {Object} oData
 */
export const update = async (sTemplateId, oData) => {
    return await request(`/label-templates/${sTemplateId}`, {
        method: 'PUT',
        body: JSON.stringify(oData)
    });
};

/**
 * Delete a template
 * @param {String} sTemplateId
 */
export const remove = async (sTemplateId) => { // 'delete' is a reserved word in JS, so we use 'remove'
    return await request(`/label-templates/${sTemplateId}`, {
        method: 'DELETE'
    });
};


// --- 2. ATTRIBUTE MANAGEMENT ---

/**
 * Get all available attribute types (String, Integer, Float, Category)
 * Useful for populating the dropdown in the creation UI
 */
export const getAttributeTypes = async () => {
    return await request('/label-templates/attribute-types', {
        method: 'GET'
    });
};

/**
 * Get attributes for a specific template
 * @param {String} sTemplateId
 */
export const getAttributes = async (sTemplateId) => {
    return await request(`/label-templates/${sTemplateId}/attributes`, {
        method: 'GET'
    });
};

/**
 * Add a new attribute to a template
 * @param {String} sTemplateId
 * @param {Object} oAttributeData - { name, type, mandatory, options, etc. }
 */
export const addAttribute = async (sTemplateId, oAttributeData) => {
    return await request(`/label-templates/${sTemplateId}/attributes`, {
        method: 'POST',
        body: JSON.stringify(oAttributeData)
    });
};

/**
 * Update a specific attribute definition
 * @param {String} sTemplateId
 * @param {String} sAttributeId
 * @param {Object} oData
 */
export const updateAttribute = async (sTemplateId, sAttributeId, oData) => {
    return await request(`/label-templates/${sTemplateId}/attributes/${sAttributeId}`, {
        method: 'PUT',
        body: JSON.stringify(oData)
    });
};

/**
 * Delete an attribute from a template
 * @param {String} sTemplateId
 * @param {String} sAttributeId
 */
export const deleteAttribute = async (sTemplateId, sAttributeId) => {
    return await request(`/label-templates/${sTemplateId}/attributes/${sAttributeId}`, {
        method: 'DELETE'
    });
};
