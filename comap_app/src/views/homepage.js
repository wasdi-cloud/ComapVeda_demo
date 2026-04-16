import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as turf from '@turf/turf';

// REUSABLE COMPONENTS
import MapboxMap from '../components/MapboxMap';
import AppTextInput from '../components/app-text-input';
import AppDropdown from '../components/app-dropdown-input';
import AppButton from '../components/app-button';
import AppCard from '../components/app-card';
import AppNotification from '../dialogues/app-notifications';
import AppCheckbox from '../components/app-checkbox';

// SERVICES
import { getPublicProjects, getProjectsByUser, deleteProject, leaveProject } from "../services/project-service";
import { isAuthenticated, getUser } from '../services/session';

const HomePage = () => {
    const navigate = useNavigate();
    const oHomeMapView = { latitude: 20, longitude: 0, zoom: 1.5 };

    // --- REAL AUTH STATE ---
    const bIsLoggedIn = isAuthenticated();
    const oUser = getUser();
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
    const [aoDrawnSearchArea, setAoDrawnSearchArea] = useState([]);
    const [bIncludeGlobal, setBIncludeGlobal] = useState(true);

    const loadProjects = async () => {
        try {
            setIsLoading(true);
            setError(null);

            let oData;
            if (bIsLoggedIn && sCurrentUserId) {
                oData = await getProjectsByUser(sCurrentUserId);
            } else {
                oData = await getPublicProjects();
            }

            const safeData = oData || [];
            setAllProjects(safeData);
            setProjects(safeData); // Will be immediately filtered by the useEffect below
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

    // --- HELPER: Parse WKT to Turf Polygon ---
    const parseWKTToTurf = (wkt) => {
        if (!wkt) return null;
        try {
            const coordsText = wkt.replace(/POLYGON\s*\(\(/i, "").replace(/\)\)/, "");
            const pairs = coordsText.split(",").map(p => p.trim());
            const coords = pairs.map(pair => {
                const [x, y] = pair.split(/\s+/).map(Number);
                return [x, y];
            });
            return turf.polygon([coords]);
        } catch (e) {
            return null;
        }
    };

    // --- COMPUTE MARKERS FOR MAP ---
    const projectMarkers = aoProjects
        .filter(p => p.aoi && p.aoi.bbox && !p.aoi.isGlobal)
        .map(p => {
            const oPoly = parseWKTToTurf(p.aoi.bbox);
            if (!oPoly) return null;

            const oCenter = turf.center(oPoly);
            const lng = oCenter.geometry.coordinates[0];
            const lat = oCenter.geometry.coordinates[1];

            return {
                position: [lat, lng],
                title: p.name
            };
        })
        .filter(Boolean);

    // --- NEW: INSTANT FILTERING EFFECT ---
    // This runs automatically whenever ANY filter state changes!
    useEffect(() => {
        let oResult = [...aoAllProjects];

        if (!bIncludeGlobal) {
            oResult = oResult.filter(p => !p.aoi?.isGlobal);
        }

        if (sSearchText) {
            oResult = oResult.filter(p => p.name.toLowerCase().includes(sSearchText.toLowerCase()));
        }

        if (sSelectedMission) {
            oResult = oResult.filter(p => p.mission === sSelectedMission);
        }

        if (sSelectedTask) {
            oResult = oResult.filter(p => p.tasks && p.tasks.includes(sSelectedTask));
        }

        if (aoDrawnSearchArea.length > 0) {
            const oSearchPolygon = aoDrawnSearchArea[0];

            oResult = oResult.filter(p => {
                if (p.aoi?.isGlobal) return true;
                if (!p.aoi?.bbox) return false;

                const oProjectPolygon = parseWKTToTurf(p.aoi.bbox);
                if (!oProjectPolygon) return false;

                try {
                    return turf.booleanIntersects(oSearchPolygon, oProjectPolygon);
                } catch (e) {
                    return false;
                }
            });
        }

        setProjects(oResult);
    }, [sSearchText, sSelectedMission, sSelectedTask, aoDrawnSearchArea, bIncludeGlobal, aoAllProjects]);

    // --- UX UPGRADE: CLEAR FILTERS ---
    const handleClearFilters = () => {
        setSearchText("");
        setSelectedMission("");
        setSelectedTask("");
        setAoDrawnSearchArea([]);
        setBIncludeGlobal(true);
    };

    const bHasActiveFilters = sSearchText || sSelectedMission || sSelectedTask || aoDrawnSearchArea.length > 0 || !bIncludeGlobal;

    // --- USE CASES ---
    const handleLeaveProject = async (project) => {
        if (project.userRole === 'OWNER' && project.ownersCount <= 1) {
            return showNotif("Action Denied: You are the only owner of this project. Please invite a co-owner before leaving.", "warning");
        }
        if (window.confirm(`Are you sure you want to leave ${project.name}?`)) {
            try {
                await leaveProject(project.id, sCurrentUserId);
                showNotif("You have successfully left the project.", "success");
                loadProjects();
            } catch (err) {
                showNotif("Failed to leave project: " + err.message, "error");
            }
        }
    };

    const handleDeleteProject = async (project) => {
        if (window.confirm(`⚠️ WARNING: Are you sure you want to completely delete "${project.name}"? This action cannot be undone.`)) {
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <label style={{ fontWeight: 'bold', color: '#555', margin: 0 }}>
                        {bIsLoggedIn ? "Search My Projects" : "Search Public Projects"}
                    </label>
                    {bHasActiveFilters && (
                        <button onClick={handleClearFilters} style={{ background: 'none', border: 'none', color: '#dc3545', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                            ✖ Clear Filters
                        </button>
                    )}
                </div>

                {/* UX UPGRADE: FORCED FLEX-END TO NEUTRALIZE HIDDEN MARGINS */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '5px' }}>Search by Name</label>
                        <AppTextInput
                            sValue={sSearchText}
                            fnOnChange={(e) => setSearchText(e.target.value)}
                            sPlaceholder="Type project name..."
                            oStyle={{ width: '100%', margin: 0 }} // <-- Force margin to 0 here!
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '5px' }}>Mission</label>
                        <AppDropdown
                            sValue={sSelectedMission}
                            fnOnChange={(e) => setSelectedMission(e.target.value)}
                            aoOptions={[
                                { value: "", label: "All Missions" },
                                { value: "S2", label: "Sentinel-2" },
                                { value: "CUSTOM", label: "Custom Mission" }
                            ]}
                            oStyle={{ width: '100%', margin: 0 }} // <-- Force margin to 0 here!
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '5px' }}>Task Type</label>
                        <AppDropdown
                            sValue={sSelectedTask}
                            fnOnChange={(e) => setSelectedTask(e.target.value)}
                            aoOptions={[
                                { value: "", label: "All Tasks" },
                                { value: "SEMANTING_SEGMENTATION", label: "Semantic Segmentation" },
                                { value: "OBJECT_DETECTION", label: "Object Detection" },
                                { value: "OTHER", label: "Other" }
                            ]}
                            oStyle={{ width: '100%', margin: 0 }} // <-- Force margin to 0 here!
                        />
                    </div>

                </div>

                <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                    <AppCheckbox
                        sLabel="Include Global Projects (Projects with no specific boundaries)"
                        bChecked={bIncludeGlobal}
                        fnOnChange={(e) => setBIncludeGlobal(e.target.checked)}
                    />
                </div>
            </AppCard>

            {/* --- MAP SECTION --- */}
            <div style={{ height: '350px', width: '100%', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px', border: '1px solid #ddd', background: '#e0e0e0', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 10, left: 50, zIndex: 10, background: 'rgba(255,255,255,0.95)', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', color: '#444', pointerEvents: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>✏️ Draw a shape to filter by location</span>
                </div>

                {/* UX UPGRADE: CLEAR MAP SHAPE BUTTON */}
                {aoDrawnSearchArea.length > 0 && (
                    <button
                        onClick={() => setAoDrawnSearchArea([])}
                        style={{ position: 'absolute', top: 10, right: 50, zIndex: 10, background: '#dc3545', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                        🗑️ Clear Area Filter
                    </button>
                )}

                <MapboxMap
                    aoMarkers={projectMarkers}
                    oInitialView={oHomeMapView}
                    bEnableDraw={true}
                    bEnableGeocoder={true}
                    bHasLines={false}
                    aoFeatures={aoDrawnSearchArea}
                    onDrawUpdate={(data) => {
                        if (data && data.features && data.features.length > 0) {
                            const latestFeature = data.features[data.features.length - 1];
                            setAoDrawnSearchArea([latestFeature]);
                        } else {
                            setAoDrawnSearchArea([]);
                        }
                    }}
                />
            </div>

            {/* --- PROJECTS LIST --- */}
            <AppCard oStyle={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '15px', borderBottom: '1px solid #eee', fontWeight: 'bold', background: '#fafafa', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{bIsLoggedIn ? "My Projects" : "Available Public Projects"}</span>
                    <span style={{ fontWeight: 'normal', color: '#666' }}>
                        {aoProjects.length} found {aoProjects.length !== aoAllProjects.length ? `(of ${aoAllProjects.length})` : ''}
                    </span>
                </div>

                {bIsLoading && <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>⏳ Loading projects...</div>}

                {!bIsLoading && !sError && aoProjects.map((project, index) => (
                    <div key={project.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', borderBottom: index !== aoProjects.length - 1 ? '1px solid #eee' : 'none', background: 'white' }}>
                        <div>
                            <div style={{ fontWeight: 'bold', color: '#333', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {project.name}

                                {project.aoi?.isGlobal && (
                                    <span style={{ fontSize: '10px', background: '#e0f7fa', color: '#006064', padding: '3px 6px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid #b2ebf2' }}>
                                        🌍 GLOBAL
                                    </span>
                                )}

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
                    <div style={{ padding: '40px', textAlign: 'center', color: '#999', background: '#fcfcfc' }}>
                        <div style={{ fontSize: '30px', marginBottom: '10px' }}>🕵️‍♂️</div>
                        <div>No projects found matching your filters.</div>
                        {bHasActiveFilters && (
                            <button onClick={handleClearFilters} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', marginTop: '10px', fontWeight: 'bold' }}>
                                Clear all filters
                            </button>
                        )}
                    </div>
                )}
            </AppCard>
        </div>
    );
};

export default HomePage;
