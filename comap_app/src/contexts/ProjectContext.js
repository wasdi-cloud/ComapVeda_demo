import React, { createContext, useContext, useState } from 'react';

const ProjectContext = createContext(null);

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProject must be used within ProjectProvider');
    }
    return context;
};

export const ProjectProvider = ({ children }) => {
    const [currentProjectId, setCurrentProjectId] = useState(null);

    return (
        <ProjectContext.Provider value={{ currentProjectId, setCurrentProjectId }}>
            {children}
        </ProjectContext.Provider>
    );
};