import request from './api';



// 1. GET PUBLIC PROJECTS
export const getPublicProjects = async () => {
    return await request('projects/getPublic', { method: 'GET' });
};

// 2. GET PROJECTS BY USER
export const getProjectsByUser = async (userId) => {
    return await request(`/projects/user/${userId}`, { method: 'GET' });
};

// 3. CREATE PROJECT
export const createProject = async (projectData) => {
    return await request('/projects', {
        method: 'POST',
        body: JSON.stringify(projectData)
    });
};

// 4. APPROVE PROJECT (Admin)
export const approveProject = async (projectId, maxStorage) => {
    return await request(`/projects/${projectId}/approve`, {
        method: 'POST', // or PUT depending on backend
        body: JSON.stringify({ maxStorage })
    });
};

// 5. REJECT PROJECT (Admin)
export const rejectProject = async (projectId, note) => {
    return await request(`/projects/${projectId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note })
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


