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
    // Your existing state
    const [currentProjectId, setCurrentProjectId] = useState(null);

    // NEW: State to lock the UI during background imports
    const [isImporting, setIsImporting] = useState(false);

    return (
        <ProjectContext.Provider value={{
            currentProjectId,
            setCurrentProjectId,
            isImporting,       // <-- Shared with the app
            setIsImporting     // <-- Shared with the app
        }}>
            {children}
        </ProjectContext.Provider>
    );
};
