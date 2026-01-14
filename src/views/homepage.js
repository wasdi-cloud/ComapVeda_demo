import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MapboxMap from '../components/MapboxMap'; // Assuming this path is correct

const HomePage = () => {
    const navigate = useNavigate();

    // 1. DUMMY DATA: Static projects list for now
    const aoDummyProjects = [
        { id: 1, name: "Flood Analysis 2023", owner: "Jihed" },
        { id: 2, name: "Urban Expansion Paris", owner: "Valentina" },
        { id: 3, name: "Forest Cover Change", owner: "Lucas" },
    ];

    // 2. MAP CONFIG: A default view for the homepage map (e.g., World view)
    const oHomeMapView = {
        latitude: 20,
        longitude: 0,
        zoom: 1.5
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>

            {/* --- A. NAVBAR --- */}
            <nav style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '15px 30px', background: '#333', color: 'white'
            }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>🌍 COMAP App</div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <Link to="/login" style={{ color: 'white', textDecoration: 'none' }}>Login</Link>
                    <Link to="/register" style={{ color: '#4caf50', textDecoration: 'none', fontWeight: 'bold' }}>Register</Link>
                </div>
            </nav>

            {/* --- MAIN SCROLLABLE CONTENT --- */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#f4f6f8' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

                    {/* --- B. WELCOME HEADER --- */}
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <h1 style={{ color: '#2c3e50', marginBottom: '5px' }}>Welcome to COMAP</h1>
                        <p style={{ color: '#7f8c8d' }}>Explore and manage your geospatial projects</p>
                    </div>

                    {/* --- C. SEARCH SECTION --- */}
                    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px', color: '#555' }}>Search Projects</label>

                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {/* Text Input */}
                            <input
                                type="text"
                                placeholder="Type project name..."
                                style={{ flex: 2, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                            />

                            {/* Dropdown 1 (e.g., Date) */}
                            <select style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                                <option>Mission</option>
                                <option>Hover</option>
                                <option>Mission X</option>
                                <option>Mission Impossible</option>
                            </select>

                            {/* Dropdown 2 (e.g., Type) */}
                            <select style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                                <option>Task</option>
                                <option>Task A</option>
                                <option>Task B</option>
                                <option>Task C</option>
                            </select>

                            {/* Search Button */}
                            <button style={{
                                padding: '10px 25px', background: '#007bff', color: 'white',
                                border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
                            }}>
                                Search
                            </button>
                        </div>
                    </div>

                    {/* --- D. MAPBOX SECTION --- */}
                    <div style={{
                        height: '350px', width: '100%', borderRadius: '8px', overflow: 'hidden',
                        marginBottom: '20px', border: '1px solid #ddd', background: '#e0e0e0'
                    }}>
                        {/* We reuse your existing component here */}
                        <MapboxMap
                            markers={[]}
                            initialView={oHomeMapView}
                        />
                    </div>

                    {/* --- E. PROJECTS LIST --- */}
                    <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                        <div style={{ padding: '15px', borderBottom: '1px solid #eee', fontWeight: 'bold', background: '#fafafa' }}>
                            Available Projects
                        </div>

                        {aoDummyProjects.map((project, index) => (
                            <div key={project.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '15px', borderBottom: index !== aoDummyProjects.length - 1 ? '1px solid #eee' : 'none'
                            }}>
                                {/* Left: Info */}
                                <div>
                                    <span style={{ fontWeight: 'bold', color: '#333' }}>{project.name}</span>
                                    <span style={{ margin: '0 10px', color: '#ccc' }}>|</span>
                                    <span style={{ color: '#666', fontSize: '14px' }}>{project.owner}</span>
                                </div>

                                {/* Right: Open Button */}
                                <button
                                    onClick={() => navigate('/edit-project')} // Routes to your dashboard
                                    style={{
                                        padding: '8px 20px', background: 'transparent',
                                        border: '1px solid #007bff', color: '#007bff', borderRadius: '4px',
                                        cursor: 'pointer', transition: '0.2s'
                                    }}
                                    onMouseOver={(e) => { e.target.style.background = '#007bff'; e.target.style.color = 'white'; }}
                                    onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#007bff'; }}
                                >
                                    Open
                                </button>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default HomePage;
