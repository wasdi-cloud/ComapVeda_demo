import oRequest from './api';



// 1. GET PUBLIC PROJECTS
export const getPublicProjects = async () => {
    return await oRequest('projects/getPublic', { method: 'GET' });
};
// 1. GET PROJECT BY ID
export const getProject = async ( sProjectId) => {
    return await oRequest(`projects/getProject?project_id=${sProjectId}`, { method: 'GET' });
};

// 2. GET PROJECTS BY USER
export const getProjectsByUser = async (userId) => {
    return await oRequest(`projects/getByUser?user_id=${userId}`, { method: 'GET' });
};

// 3. CREATE PROJECT
export const createProject = async (projectData) => {
    return await oRequest('projects/create', {
        method: 'POST',
        body: JSON.stringify(projectData)
    });
};

// 4. APPROVE PROJECT (Adapted for GET)
export const approveProject = async (projectId, maxStorage) => {
    // We construct a Query String: /approve?project_id=XYZ&maxStorage=2
    const params = new URLSearchParams({
        project_id: projectId,
        maxStorage: maxStorage // Sending it as query param
    });

    return await oRequest(`projects/approve?${params.toString()}`, {
        method: 'GET' // Changed to GET to match server
    });
};

// 5. REJECT PROJECT (Adapted for GET)
export const rejectProject = async (projectId, note) => {
    // We construct a Query String: /reject?project_id=XYZ&note=Reason
    const params = new URLSearchParams({
        project_id: projectId,
        note: note || "" // <-- ADD THE NOTE HERE!
    });

    return await oRequest(`projects/reject?${params.toString()}`, {
        method: 'GET'
    });
};
// 6. INVITE COLLAB (Admin)
export const inviteCollab = async (projectId, note) => {
    return await oRequest(`/projects/${projectId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note })
    });
};
// 7. REJECT PROJECT (Admin)
export const removeCollab = async (projectId, note) => {
    return await oRequest(`/projects/${projectId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note })
    });
};
// 8. Export Project
export const exportProject = async (projectId, note) => {
    return await oRequest(`/projects/${projectId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note })
    });
};

export const updateProject = async (projectId, projectData) => {
    // Notice how we pass project_id in the URL to match the Python Query parameter
    return await oRequest(`projects/update?project_id=${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(projectData)
    });
};


// Add this to project-service.js
export const getProjectRequests = async () => {
    return await oRequest('projects/getRequests', { method: 'GET' });
};


// --- NEW: DELETE PROJECT ---
export const deleteProject = async (projectId) => {
    return await oRequest(`projects/delete?project_id=${projectId}`, {
        method: 'DELETE'
    });
};

// --- NEW: LEAVE PROJECT ---
export const leaveProject = async (projectId, userId) => {
    // Ideally this uses the logged in session token, but we pass ID for testing
    return await oRequest(`projects/leave?project_id=${projectId}&user_id=${userId}`, {
        method: 'POST'
    });
};
