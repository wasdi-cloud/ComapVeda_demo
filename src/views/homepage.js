import React from 'react';
import {Link, useNavigate} from 'react-router-dom';
import MapboxMap from '../components/MapboxMap';

// Import our new UI components
import AppTextInput from '../components/app-text-input';
import AppDropdownInput from '../components/app-dropdown-input';
import AppButton from '../components/app-button';
import AppCard from '../components/app-card';

const HomePage = () => {
    const navigate = useNavigate();

    // 1. DATA
    const aoDummyProjects = [
        {id: 1, name: "Flood Analysis 2023", owner: "Jihed"},
        {id: 2, name: "Urban Expansion Paris", owner: "Valentina"},
        {id: 3, name: "Forest Cover Change", owner: "Lucas"},
    ];

    const oHomeMapView = {latitude: 20, longitude: 0, zoom: 1.5};

    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif'}}>

            {/* --- A. NAVBAR --- */}
            <nav style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '15px 30px', background: '#333', color: 'white'
            }}>
                <div style={{fontSize: '20px', fontWeight: 'bold'}}>🌍 COMAP App</div>
                <div style={{display: 'flex', gap: '15px'}}>
                    <Link to="/login" style={{textDecoration: 'none'}}>
                        {/* We can use AppButton here with custom styling if we want, or keep links text */}
                        <span style={{color: 'white', marginRight: '15px'}}>Login</span>
                    </Link>
                    <Link to="/register" style={{textDecoration: 'none'}}>
                        {/* Reusing AppButton for the Register Call to Action */}
                        <AppButton sVariant="success" oStyle={{padding: '5px 15px'}}>Register</AppButton>
                    </Link>
                </div>
            </nav>

            {/* --- MAIN CONTENT --- */}
            <div style={{flex: 1, overflowY: 'auto', padding: '20px', background: '#f4f6f8'}}>
                <div style={{maxWidth: '1000px', margin: '0 auto'}}>

                    {/* --- B. HEADER --- */}
                    <div style={{textAlign: 'center', marginBottom: '30px'}}>
                        <h1 style={{color: '#2c3e50', marginBottom: '5px'}}>Welcome to COMAP</h1>
                        <p style={{color: '#7f8c8d'}}>Explore and manage your geospatial projects</p>
                    </div>

                    {/* --- C. SEARCH SECTION (Refactored) --- */}
                    <AppCard>
                        <label style={{display: 'block', fontWeight: 'bold', marginBottom: '10px', color: '#555'}}>Search
                            Projects</label>

                        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                            {/* Reusable Input */}
                            <AppTextInput
                                sPlaceholder="Type project name..."
                                oStyle={{flex: 2}}
                            />

                            {/* Reusable Selects */}
                            <AppDropdownInput
                                aoOptions={["Mission", "Hover", "Mission X", "Mission Impossible"]}
                                oStyle={{flex: 1}}
                            />

                            <AppDropdownInput
                                aoOptions={["Task", "Task A", "Task B", "Task C"]}
                                oStyle={{flex: 1}}
                            />

                            {/* Reusable Button */}
                            <AppButton sVariant="primary">
                                Search
                            </AppButton>
                        </div>
                    </AppCard>

                    {/* --- D. MAPBOX SECTION --- */}
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

                    {/* --- E. PROJECTS LIST (Refactored) --- */}
                    <AppCard oStyle={{padding: 0, overflow: 'hidden'}}>
                        <div style={{
                            padding: '15px',
                            borderBottom: '1px solid #eee',
                            fontWeight: 'bold',
                            background: '#fafafa'
                        }}>
                            Available Projects
                        </div>

                        {aoDummyProjects.map((project, index) => (
                            <div key={project.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '15px',
                                borderBottom: index !== aoDummyProjects.length - 1 ? '1px solid #eee' : 'none'
                            }}>
                                <div>
                                    <span style={{fontWeight: 'bold', color: '#333'}}>{project.name}</span>
                                    <span style={{margin: '0 10px', color: '#ccc'}}>|</span>
                                    <span style={{color: '#666', fontSize: '14px'}}>{project.owner}</span>
                                </div>

                                {/* Reusable Outline Button */}
                                <AppButton
                                    sVariant="outline"
                                    fnOnClick={() => navigate('/edit-project')}
                                    oStyle={{padding: '8px 20px'}}
                                >
                                    Open
                                </AppButton>
                            </div>
                        ))}
                    </AppCard>

                </div>
            </div>
        </div>
    );
};

export default HomePage;
