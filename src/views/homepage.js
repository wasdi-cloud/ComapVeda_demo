import React, {useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
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

    // These variables will strictly control what shows in the boxes
    const [sSearchText, setSearchText] = useState("");         // <--- NEW
    const [sSelectedMission, setSelectedMission] = useState(""); // <--- NEW
    const [sSelectedTask, setSelectedTask] = useState("");       // <--- NEW


    useEffect(() => {
        const loadProjects = async () => {
            try {
                setIsLoading(true);
                const data = await getPublicProjects();
                setProjects(data || []);
            } catch (error) {
                console.error("Failed to load public projects:", error);
                setError("Could not load projects. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };
        loadProjects();
    }, []);

    // 2. NEW: HANDLE SEARCH BUTTON CLICK
    const handleSearchClick = () => {
        // You can now use sSearchText, sSelectedMission, and sSelectedTask
        // to filter your list or call an API.
        console.log("Searching for:", {sSearchText, sSelectedMission, sSelectedTask});

        // Example: Filter the existing list locally (optional)
        // const filtered = aoProjects.filter(p => p.mission === sSelectedMission);
        // setProjects(filtered);
    };

    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif'}}>

            {/* --- A. NAVBAR (Unchanged) --- */}
            <nav style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '15px 30px', background: '#333', color: 'white'
            }}>
                <div style={{fontSize: '20px', fontWeight: 'bold'}}>🌍 COMAP App</div>
                <div style={{display: 'flex', gap: '15px'}}>
                    <Link to="/login" style={{textDecoration: 'none'}}>
                        <span style={{color: 'white', marginRight: '15px', lineHeight: '34px'}}>Login</span>
                    </Link>
                    <Link to="/register" style={{textDecoration: 'none'}}>
                        <AppButton sVariant="success" oStyle={{padding: '5px 15px'}}>Register</AppButton>
                    </Link>
                </div>
            </nav>

            {/* --- MAIN CONTENT --- */}
            <div style={{flex: 1, overflowY: 'auto', padding: '20px', background: '#f4f6f8'}}>
                <div style={{maxWidth: '1000px', margin: '0 auto'}}>

                    {/* --- B. HEADER (Unchanged) --- */}
                    <div style={{textAlign: 'center', marginBottom: '30px'}}>
                        <h1 style={{color: '#2c3e50', marginBottom: '5px'}}>Welcome to COMAP</h1>
                        <p style={{color: '#7f8c8d'}}>Explore and manage your geospatial projects</p>
                    </div>

                    {/* --- C. SEARCH SECTION (UPDATED) --- */}
                    <AppCard>
                        <label style={{display: 'block', fontWeight: 'bold', marginBottom: '10px', color: '#555'}}>
                            Search Projects
                        </label>

                        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                            {/* 3. NEW: BIND VALUE AND ONCHANGE */}
                            <AppTextInput
                                sValue={sSearchText} // <--- Pass the state
                                onChange={(e) => setSearchText(e.target.value)} // <--- Update the state
                                sPlaceholder="Type project name..."
                                oStyle={{flex: 2}}
                            />

                            <AppDropdown
                                sValue={sSelectedMission} // <--- Pass the state
                                onChange={(e) => setSelectedMission(e.target.value)} // <--- Update the state
                                aoOptions={["Sentinel-2", "Landsat 8", "MODIS"]}
                                sPlaceholder="Select Mission"
                                oStyle={{flex: 1}}
                            />

                            <AppDropdown
                                sValue={sSelectedTask} // <--- Pass the state
                                onChange={(e) => setSelectedTask(e.target.value)} // <--- Update the state
                                aoOptions={["Classification", "Detection", "Segmentation"]}
                                sPlaceholder="Select Task"
                                oStyle={{flex: 1}}
                            />

                            <AppButton
                                sVariant="primary"
                                fnOnClick={handleSearchClick} // <--- Call the search function
                            >
                                Search
                            </AppButton>
                        </div>
                    </AppCard>

                    {/* --- D. MAPBOX SECTION (Unchanged) --- */}
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

                    {/* --- E. PROJECTS LIST (Unchanged) --- */}
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
            </div>
        </div>
    );
};

export default HomePage;
