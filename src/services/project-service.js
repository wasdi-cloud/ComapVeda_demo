import request from './api';



// 1. GET PUBLIC PROJECTS
export const getPublicProjects = async () => {
    return await request('projects/getPublic', { method: 'GET' });
};
// 1. GET PROJECT BY ID
export const getProject = async ( sProjectId) => {
    return await request(`projects/getProject?project_id=${sProjectId}`, { method: 'GET' });
};

// 2. GET PROJECTS BY USER
export const getProjectsByUser = async (userId) => {
    return await request(`/projects/user/${userId}`, { method: 'GET' });
};

// 3. CREATE PROJECT
export const createProject = async (projectData) => {
    return await request('projects/create', {
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

    return await request(`projects/approve?${params.toString()}`, {
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

    return await request(`projects/reject?${params.toString()}`, {
        method: 'GET'
    });
};
// 6. INVITE COLLAB (Admin)
export const inviteCollab = async (projectId, note) => {
    return await request(`/projects/${projectId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note })
    });
};
// 7. REJECT PROJECT (Admin)
export const removeCollab = async (projectId, note) => {
    return await request(`/projects/${projectId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note })
    });
};
// 8. Export Project
export const exportProject = async (projectId, note) => {
    return await request(`/projects/${projectId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note })
    });
};

export const updateProject = async (projectId, projectData) => {
    // Notice how we pass project_id in the URL to match the Python Query parameter
    return await request(`projects/update?project_id=${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(projectData)
    });
};


// Add this to project-service.js
export const getProjectRequests = async () => {
    return await request('projects/getRequests', { method: 'GET' });
};

