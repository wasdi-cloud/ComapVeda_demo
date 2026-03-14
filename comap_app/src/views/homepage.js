import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// REUSABLE COMPONENTS
import MapboxMap from '../components/MapboxMap';
import AppTextInput from '../components/app-text-input';
import AppDropdown from '../components/app-dropdown-input';
import AppButton from '../components/app-button';
import AppCard from '../components/app-card';
import AppNotification from '../dialogues/app-notifications'; // <-- Added Notification

// SERVICES
import { getPublicProjects, getProjectsByUser, deleteProject, leaveProject } from "../services/project-service";
import { seedDemoImages } from "../services/images-service";
import { isAuthenticated, getUser } from '../services/session'; // <-- Import Real Auth

const HomePage = () => {
    const navigate = useNavigate();
    const oHomeMapView = { latitude: 20, longitude: 0, zoom: 1.5 };

    // --- REAL AUTH STATE ---
    const bIsLoggedIn = isAuthenticated();
    const oUser = getUser();
    // Assuming your backend uses email as the user identifier
    const sCurrentUserId = oUser?.email || null;

    // --- NOTIFICATION STATE ---
    const [oNotification, setNotification] = useState({ show: false, message: '', type: 'info' });
    const showNotif = (message, type = 'info') => setNotification({ show: true, message, type });

    // --- DATA STATE ---
    const [aoAllProjects, setAllProjects] = useState([]);
    const [aoProjects, setProjects] = useState([]);
    const [bIsLoading, setIsLoading] = useState(true);
    const [sError, setError] = useState(null);

    // --- SEARCH STATE ---
    const [sSearchText, setSearchText] = useState("");
    const [sSelectedMission, setSelectedMission] = useState("");
    const [sSelectedTask, setSelectedTask] = useState("");

    // --- AUTOMATIC SEEDING ON LOAD ---
    useEffect(() => {
        const autoSeedImages = async () => {
            try {
                // Silently seed images in the background so the backend always has data
                await seedDemoImages();
                console.log("Demo images seeded automatically.");
            } catch (error) {
                console.error("Auto-seeding failed. Backend might be unreachable.", error);
            }
        };

        autoSeedImages();
    }, []); // Empty dependency array means it runs exactly once when the homepage loads

    const loadProjects = async () => {
        try {
            setIsLoading(true);
            setError(null);

            let oData;
            // Fetch personal projects if logged in, otherwise public projects
            if (bIsLoggedIn && sCurrentUserId) {
                oData = await getProjectsByUser(sCurrentUserId);
            } else {
                oData = await getPublicProjects();
            }

            const safeData = oData || [];
            setAllProjects(safeData);
            setProjects(safeData);
        } catch (error) {
            console.error("Failed to load projects:", error);
            setError("Could not load projects. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
    }, [bIsLoggedIn, sCurrentUserId]);

    // --- FILTER LOGIC ---
    const handleSearchClick = () => {
        let oResult = [...aoAllProjects];

        if (sSearchText) {
            oResult = oResult.filter(p => p.name.toLowerCase().includes(sSearchText.toLowerCase()));
        }
        if (sSelectedMission) {
            oResult = oResult.filter(p => p.mission === sSelectedMission);
        }

        setProjects(oResult);
    };

    // --- USE CASE: LEAVE PROJECT ---
    const handleLeaveProject = async (project) => {
        if (project.userRole === 'OWNER' && project.ownersCount <= 1) {
            return showNotif("Action Denied: You are the only owner of this project. Please invite a co-owner before leaving, or delete the project entirely.", "warning");
        }

        if (window.confirm(`Are you sure you want to leave ${project.name}? You will be removed from the collaborators.`)) {
            try {
                await leaveProject(project.id, sCurrentUserId);
                showNotif("You have successfully left the project.", "success");
                loadProjects();
            } catch (err) {
                showNotif("Failed to leave project: " + err.message, "error");
            }
        }
    };

    // --- USE CASE: DELETE PROJECT ---
    const handleDeleteProject = async (project) => {
        if (window.confirm(`⚠️ WARNING: Are you sure you want to completely delete "${project.name}"? This action cannot be undone and will notify all collaborators.`)) {
            try {
                await deleteProject(project.id);
                showNotif("Project deleted successfully.", "success");
                loadProjects();
            } catch (err) {
                showNotif("Failed to delete project: " + err.message, "error");
            }
        }
    };

    const getRoleBadge = (role) => {
        if (!role) return null;
        const sRoleStr = role.toUpperCase();
        if (sRoleStr === 'OWNER') return <span style={{ padding: '3px 8px', background: '#cce5ff', color: '#004085', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>👑 OWNER</span>;
        if (sRoleStr === 'REVIEWER') return <span style={{ padding: '3px 8px', background: '#d4edda', color: '#155724', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>👀 REVIEWER</span>;
        return <span style={{ padding: '3px 8px', background: '#e2e3e5', color: '#383d41', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>✍️ ANNOTATOR</span>;
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '50px' }}>

            <AppNotification show={oNotification.show} message={oNotification.message} type={oNotification.type} onClose={() => setNotification(prev => ({ ...prev, show: false }))} />

            {/* --- HEADER --- */}
            <div style={{ textAlign: 'center', marginBottom: '30px', marginTop: '30px' }}>
                <h1 style={{ color: '#2c3e50', marginBottom: '5px' }}>Welcome to COMAP</h1>
                <p style={{ color: '#7f8c8d' }}>
                    {bIsLoggedIn ? `Hello ${oUser?.name || ''}, explore and manage your geospatial projects.` : "Explore and manage your geospatial projects. Please log in to create your own!"}
                </p>
            </div>

            {/* --- SEARCH SECTION --- */}
            <AppCard>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px', color: '#555' }}>
                    {bIsLoggedIn ? "Search My Projects" : "Search Public Projects"}
                </label>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <AppTextInput
                        sValue={sSearchText}
                        fnOnChange={(e) => setSearchText(e.target.value)}
                        sPlaceholder="Type project name..."
                        oStyle={{ flex: 2 }}
                    />
                    <AppDropdown
                        sValue={sSelectedMission}
                        fnOnChange={(e) => setSelectedMission(e.target.value)}
                        aoOptions={["Sentinel-2", "Landsat 8", "MODIS"]}
                        sPlaceholder="Select Mission"
                        oStyle={{ flex: 1 }}
                    />
                    <AppButton sVariant="primary" fnOnClick={handleSearchClick}>
                        Search
                    </AppButton>
                </div>
            </AppCard>

            {/* MAP SECTION */}
            <div style={{ height: '350px', width: '100%', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px', border: '1px solid #ddd', background: '#e0e0e0' }}>
                <MapboxMap aoMarkers={[]} oInitialView={oHomeMapView} bEnableDraw={false} bEnableGeocoder={false} />
            </div>

            {/* --- PROJECTS LIST --- */}
            <AppCard oStyle={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '15px', borderBottom: '1px solid #eee', fontWeight: 'bold', background: '#fafafa', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{bIsLoggedIn ? "My Projects" : "Available Public Projects"}</span>
                    <span style={{ fontWeight: 'normal', color: '#666' }}>
                        {aoProjects.length} found {aoProjects.length !== aoAllProjects.length ? `(of ${aoAllProjects.length})` : ''}
                    </span>
                </div>

                {bIsLoading && <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>⏳ Loading projects...</div>}
                {sError && <div style={{ padding: '20px', textAlign: 'center', color: '#dc3545' }}>⚠️ {sError}</div>}

                {!bIsLoading && !sError && aoProjects.map((project, index) => (
                    <div key={project.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', borderBottom: index !== aoProjects.length - 1 ? '1px solid #eee' : 'none', background: 'white' }}>
                        <div>
                            <div style={{ fontWeight: 'bold', color: '#333', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {project.name}
                                {/* If logged in, show their role */}
                                {bIsLoggedIn && getRoleBadge(project.userRole)}
                            </div>
                            <div style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>
                                Mission: <span style={{ color: '#007bff' }}>{project.mission}</span>
                                <span style={{ margin: '0 8px', color: '#ccc' }}>|</span>
                                {project.description}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <AppButton
                                sVariant="outline"
                                fnOnClick={() => navigate('/edit-project', { state: { projectTitle: project.name, projectId: project.id } })}
                                oStyle={{ padding: '6px 15px', fontSize: '12px' }}
                            >
                                Open
                            </AppButton>

                            {/* Show Leave and Delete only if Logged In */}
                            {bIsLoggedIn && (
                                <>
                                    <AppButton
                                        sVariant="outline"
                                        oStyle={{ padding: '6px 15px', fontSize: '12px', color: '#856404', borderColor: '#ffeeba' }}
                                        fnOnClick={() => handleLeaveProject(project)}
                                    >
                                        Leave
                                    </AppButton>

                                    {project.userRole?.toUpperCase() === 'OWNER' && (
                                        <AppButton
                                            sVariant="danger"
                                            oStyle={{ padding: '6px 15px', fontSize: '12px' }}
                                            fnOnClick={() => handleDeleteProject(project)}
                                        >
                                            Delete
                                        </AppButton>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ))}

                {!bIsLoading && !sError && aoProjects.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                        No projects found.
                    </div>
                )}
            </AppCard>
        </div>
    );
};

export default HomePage;
