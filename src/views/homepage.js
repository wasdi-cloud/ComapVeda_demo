import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import MapboxMap from '../components/MapboxMap';

// Import our new UI components
import AppTextInput from '../components/app-text-input';
import AppDropdown from '../components/app-dropdown-input';
import AppButton from '../components/app-button';
import AppCard from '../components/app-card';
import {getPublicProjects} from "../services/project-service";

const HomePage = () => {
    const navigate = useNavigate();
    const oHomeMapView = {latitude: 20, longitude: 0, zoom: 1.5};

    // --- STATE ---
    const [aoProjects, setProjects] = useState([]);
    const [bIsLoading, setIsLoading] = useState(true);
    const [sError, setError] = useState(null);

    // Search State
    const [sSearchText, setSearchText] = useState("");
    const [sSelectedMission, setSelectedMission] = useState("");
    const [sSelectedTask, setSelectedTask] = useState("");

    useEffect(() => {
        const loadProjects = async () => {
            try {
                setIsLoading(true);
                const oData = await getPublicProjects();
                setProjects(oData || []);
            } catch (error) {
                console.error("Failed to load public projects:", error);
                setError("Could not load projects. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };
        loadProjects();
    }, []);

    const handleSearchClick = () => {
        console.log("Searching for:", {sSearchText, sSelectedMission, sSelectedTask});
    };

    // --- RENDER ---
    // Note: No Navbar here, and no 100vh outer div. The Layout handles that.
    return (
        <div style={{maxWidth: '1000px', margin: '0 auto'}}>

            {/* --- HEADER --- */}
            <div style={{textAlign: 'center', marginBottom: '30px'}}>
                <h1 style={{color: '#2c3e50', marginBottom: '5px'}}>Welcome to COMAP</h1>
                <p style={{color: '#7f8c8d'}}>Explore and manage your geospatial projects</p>
            </div>

            {/* --- SEARCH SECTION --- */}
            <AppCard>
                <label style={{display: 'block', fontWeight: 'bold', marginBottom: '10px', color: '#555'}}>
                    Search Projects
                </label>

                <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                    <AppTextInput
                        value={sSearchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        sPlaceholder="Type project name..."
                        oStyle={{flex: 2}}
                    />

                    <AppDropdown
                        value={sSelectedMission}
                        onChange={(e) => setSelectedMission(e.target.value)}
                        aoOptions={["Sentinel-2", "Landsat 8", "MODIS"]}
                        sPlaceholder="Select Mission"
                        oStyle={{flex: 1}}
                    />

                    <AppDropdown
                        value={sSelectedTask}
                        onChange={(e) => setSelectedTask(e.target.value)}
                        aoOptions={["Classification", "Detection", "Segmentation"]}
                        sPlaceholder="Select Task"
                        oStyle={{flex: 1}}
                    />

                    <AppButton
                        sVariant="primary"
                        fnOnClick={handleSearchClick}
                    >
                        Search
                    </AppButton>
                </div>
            </AppCard>

            {/* --- MAPBOX SECTION --- */}
            <div style={{
                height: '350px', width: '100%', borderRadius: '8px', overflow: 'hidden',
                marginBottom: '20px', border: '1px solid #ddd', background: '#e0e0e0'
            }}>
                <MapboxMap
                    aoMarkers={[]}
                    oInitialView={oHomeMapView}
                    bEnableDraw={false}
                    bEnableGeocoder={false}
                />
            </div>

            {/* --- PROJECTS LIST --- */}
            <AppCard oStyle={{padding: 0, overflow: 'hidden'}}>
                <div style={{
                    padding: '15px',
                    borderBottom: '1px solid #eee',
                    fontWeight: 'bold',
                    background: '#fafafa',
                    display: 'flex', justifyContent: 'space-between'
                }}>
                    <span>Available Projects</span>
                    <span style={{fontWeight: 'normal', color: '#666'}}>{aoProjects.length} found</span>
                </div>

                {bIsLoading && (
                    <div style={{padding: '20px', textAlign: 'center', color: '#666'}}>
                        ⏳ Loading projects...
                    </div>
                )}

                {sError && (
                    <div style={{padding: '20px', textAlign: 'center', color: '#dc3545'}}>
                        ⚠️ {sError}
                    </div>
                )}

                {!bIsLoading && !sError && aoProjects.map((project, index) => (
                    <div key={project.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '15px',
                        borderBottom: index !== aoProjects.length - 1 ? '1px solid #eee' : 'none',
                        background: 'white'
                    }}>
                        <div>
                            <div style={{fontWeight: 'bold', color: '#333', fontSize: '15px'}}>
                                {project.name}
                            </div>
                            <div style={{color: '#666', fontSize: '13px', marginTop: '4px'}}>
                                Mission: <span style={{color: '#007bff'}}>{project.mission}</span>
                                <span style={{margin: '0 8px', color: '#ccc'}}>|</span>
                                {project.description}
                            </div>
                        </div>

                        <AppButton
                            sVariant="outline"
                            fnOnClick={() => navigate('/edit-project')}
                            oStyle={{padding: '6px 15px', fontSize: '13px'}}
                        >
                            Open
                        </AppButton>
                    </div>
                ))}

                {!bIsLoading && !sError && aoProjects.length === 0 && (
                    <div style={{padding: '20px', textAlign: 'center', color: '#999'}}>
                        No public projects available at the moment.
                    </div>
                )}
            </AppCard>
        </div>
    );
};

export default HomePage;
