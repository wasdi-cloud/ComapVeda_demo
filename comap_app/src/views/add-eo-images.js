import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import * as turf from '@turf/turf'; // <-- IMPORT TURF FOR BBOX CALCULATIONS

// REUSABLE COMPONENTS
import MapboxMap from '../components/MapboxMap';
import AppCard from '../components/app-card';
import AppDateInput from '../components/app-date-input';
import AppSelect from '../components/app-dropdown-input';
import AppButton from '../components/app-button';
import AppTextInput from '../components/app-text-input';
import AppNotification from '../dialogues/app-notifications'; // <-- IMPORT NOTIFICATION

// SERVICES
import { searchImages } from '../services/images-service'; // <-- IMPORT REAL API

const AddEoImages = () => {
    const navigate = useNavigate();

    // --- NOTIFICATION STATE ---
    const [oNotification, setNotification] = useState({ show: false, message: '', type: 'info' });
    const showNotif = (message, type = 'info') => {
        setNotification({ show: true, message, type });
    };

    // --- 1. MOCK DATA ---
    const aoAlreadyImportedIds = ["180b33ba-3be1-4d5b-b864-25de076b6b4b"]; // Use a real ID format for mock checks

    // --- 2. SEARCH FORM STATE ---
    const [sProvider, setSProvider] = useState("Copernicus");
    const [sProductName, setSProductName] = useState("");
    const [sStartDate, setSStartDate] = useState("2026-03-01");
    const [sEndDate, setSEndDate] = useState("2026-03-31");

    const [sMissionType, setSMissionType] = useState("Optical");
    const [sSatellitePlatform, setSSatellitePlatform] = useState("Sentinel-2");
    const [sProductType, setSProductType] = useState("S2MSI1C");
    const [sCloudCoverage, setSCloudCoverage] = useState("20");

    // --- MAP DRAWING STATE ---
    const [aoFeatures, setAoFeatures] = useState([]); // Stores drawn AOIs

    // --- 3. RESULTS & SELECTION ---
    const [bIsSearching, setBIsSearching] = useState(false);
    const [aoSearchResults, setAoSearchResults] = useState(null);
    const [aoSelectedIds, setAoSelectedIds] = useState([]);

    // --- HANDLERS ---

    // Captures the shapes drawn on the map
    const handleDrawUpdate = (featureCollection) => {
        if (featureCollection && featureCollection.features) {
            setAoFeatures(featureCollection.features);
        }
    };

    // Converts the drawn Mapbox GeoJSON into a WKT Polygon String
    const getBboxWkt = () => {
        if (!aoFeatures || aoFeatures.length === 0) return null;

        // Use turf to get the bounding box of the first drawn shape
        const box = turf.bbox(aoFeatures[0]);
        const [minX, minY, maxX, maxY] = box;

        // Format as WKT Polygon
        return `POLYGON((${minX} ${minY}, ${minX} ${maxY}, ${maxX} ${maxY}, ${maxX} ${minY}, ${minX} ${minY}))`;
    };

    const handleSearch = async (e) => {
        e.preventDefault();

        // 1. Get the AOI from the map
        const sWktBbox = getBboxWkt();
        if (!sWktBbox) {
            return showNotif("Please draw an Area of Interest (AOI) on the map first using the polygon tool.", "warning");
        }

        setBIsSearching(true);
        setAoSearchResults([]);
        setAoSelectedIds([]);

        try {
            // 2. Build Query Params matching Python backend
            const queryParams = {
                bbox: sWktBbox,
                start_date: sStartDate,
                end_date: sEndDate,
                platform: sSatellitePlatform,
                product_type: sProductType,
                max_cloud_cover: parseFloat(sCloudCoverage) || 100.0
            };

            // 3. Call the real API!
            const results = await searchImages(queryParams);

            if (results && results.length > 0) {
                setAoSearchResults(results);
                showNotif(`Found ${results.length} images matching your criteria.`, "success");
            } else {
                setAoSearchResults([]);
                showNotif("No images found for this area and date range.", "info");
            }

        } catch (error) {
            console.error("Search Error:", error);
            showNotif("Failed to fetch images from the server. Check console.", "error");
        } finally {
            setBIsSearching(false);
        }
    };

    const handleToggleSelect = (id) => {
        if (aoSelectedIds.includes(id)) {
            setAoSelectedIds(aoSelectedIds.filter(itemId => itemId !== id));
        } else {
            setAoSelectedIds([...aoSelectedIds, id]);
        }
    };

    const handleImport = () => {
        if (aoSelectedIds.length === 0) return showNotif("Please select at least one image to import.", "warning");

        showNotif(`Successfully imported ${aoSelectedIds.length} images! Redirecting...`, "success");

        // Wait briefly so they see the success message
        setTimeout(() => {
            navigate(-1); // Go back to Editor
        }, 1500);
    };

    return (
        <div style={{display: 'flex', height: '100vh', width: '100%', overflow: 'hidden'}}>

            {/* FLOATING NOTIFICATION */}
            <AppNotification
                show={oNotification.show}
                message={oNotification.message}
                type={oNotification.type}
                onClose={() => setNotification(prev => ({ ...prev, show: false }))}
            />

            {/* --- LEFT PANEL (30%) --- */}
            <div style={{
                width: '30%',
                minWidth: '350px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: '#f4f6f8',
                borderRight: '1px solid #ddd',
                zIndex: 2,
                boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
            }}>

                {/* HEADER */}
                <div style={{padding: '15px 20px', background: 'white', borderBottom: '1px solid #ddd'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px'}}>
                        <button onClick={() => navigate(-1)} style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}>←
                        </button>
                        <h2 style={{margin: 0, fontSize: '18px', color: '#333'}}>🛰️ Add EO Images</h2>
                    </div>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div style={{flex: 1, overflowY: 'auto', padding: '20px'}}>

                    {/* 1. SEARCH FORM */}
                    <AppCard>
                        {/* --- SECTION 1: PROVIDES --- */}
                        <div style={{marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #eee'}}>
                            <h3 style={{...headerStyle, marginBottom: '15px'}}>Provides</h3>

                            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                                {/* Provider */}
                                <AppSelect
                                    sLabel="Provider"
                                    sValue={sProvider}
                                    fnOnChange={(e) => setSProvider(e.target.value)}
                                    aoOptions={["Copernicus", "USGS", "Planet"]}
                                    oStyle={{width: '100%'}}
                                />

                                {/* Product Name */}
                                <AppTextInput
                                    sLabel="Product Name"
                                    sPlaceholder="e.g. S2_MSI_L2A"
                                    sValue={sProductName}
                                    fnOnChange={(e) => setSProductName(e.target.value)}
                                />


                                {/* Dates */}
                                <div style={gridStyle}>
                                    <AppDateInput sLabel="From Date" sName="start" sValue={sStartDate}
                                                  fnOnChange={(e) => setSStartDate(e.target.value)}/>
                                    <AppDateInput sLabel="To Date" sName="end" sValue={sEndDate}
                                                  fnOnChange={(e) => setSEndDate(e.target.value)}/>
                                </div>
                            </div>
                        </div>

                        {/* --- SECTION 2: SELECT MISSION --- */}
                        <div>
                            <h3 style={{...headerStyle, marginBottom: '15px'}}>Select Mission</h3>

                            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                                {/* Mission Type & Platform */}
                                <div style={gridStyle}>
                                    <AppSelect
                                        sLabel="Mission Type"
                                        sValue={sMissionType}
                                        fnOnChange={(e) => setSMissionType(e.target.value)}
                                        aoOptions={["Optical", "SAR", "Thermal"]}
                                        oStyle={{width: '100%'}}
                                    />
                                    <AppSelect
                                        sLabel="Sat. Platform"
                                        sValue={sSatellitePlatform}
                                        fnOnChange={(e) => setSSatellitePlatform(e.target.value)}
                                        aoOptions={["Sentinel-2", "Sentinel-2C", "Sentinel-1", "Landsat 8"]}
                                        oStyle={{width: '100%'}}
                                    />
                                </div>

                                {/* Product Type */}
                                <AppSelect
                                    sLabel="Product Type"
                                    sValue={sProductType}
                                    fnOnChange={(e) => setSProductType(e.target.value)}
                                    aoOptions={["S2MSI1C", "L1C", "L2A"]}
                                    oStyle={{width: '100%'}}
                                />

                                {/* Cloud Coverage */}
                                <AppTextInput
                                    sLabel="Max Cloud Coverage (%)"
                                    sPlaceholder="e.g 20"
                                    sValue={sCloudCoverage}
                                    type="number"
                                    fnOnChange={(e) => setSCloudCoverage(e.target.value)}
                                />

                                <div style={{marginTop: '10px'}}>
                                    <AppButton sVariant="primary" oStyle={{width: '100%'}} fnOnClick={handleSearch} disabled={bIsSearching}>
                                        {bIsSearching ? "Searching..." : "🔍 Search Images"}
                                    </AppButton>
                                </div>
                            </div>
                        </div>
                    </AppCard>

                    {/* 2. RESULTS LIST */}
                    {aoSearchResults && (
                        <div style={{marginTop: '20px'}}>
                            <h3 style={{fontSize: '16px', color: '#444', marginBottom: '10px'}}>
                                Found {aoSearchResults.length} Images
                            </h3>

                            {aoSearchResults.length === 0 ? (
                                <div style={{textAlign: 'center', color: '#888', fontStyle: 'italic'}}>No images
                                    found.</div>
                            ) : (
                                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                                    {aoSearchResults.map((img, idx) => {
                                        const bIsAlreadyImported = aoAlreadyImportedIds.includes(img.id);
                                        const bIsSelected = aoSelectedIds.includes(img.id);

                                        // Alternating colors for visual variety since we don't have real thumbnails yet
                                        const thumbColor = idx % 2 === 0 ? "#1e3c72" : "#2a5298";

                                        return (
                                            <div key={img.id} style={{
                                                padding: '10px',
                                                borderRadius: '6px',
                                                border: bIsSelected ? '1px solid #007bff' : '1px solid #eee',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                opacity: bIsAlreadyImported ? 0.6 : 1,
                                                background: bIsAlreadyImported ? '#f9f9f9' : 'white'
                                            }}>
                                                <div style={{width: '30px', display: 'flex', justifyContent: 'center'}}>
                                                    {bIsAlreadyImported ? (
                                                        <span title="Already in project">✅</span>
                                                    ) : (
                                                        <input
                                                            type="checkbox"
                                                            checked={bIsSelected}
                                                            onChange={() => handleToggleSelect(img.id)}
                                                            style={{width: '18px', height: '18px', cursor: 'pointer'}}
                                                        />
                                                    )}
                                                </div>
                                                <div style={{
                                                    width: '50px',
                                                    height: '50px',
                                                    background: thumbColor,
                                                    borderRadius: '4px',
                                                    flexShrink: 0
                                                }}></div>
                                                <div style={{flex: 1, overflow: 'hidden'}}>
                                                    <div style={{
                                                        fontWeight: 'bold',
                                                        fontSize: '13px',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }} title={img.title}>{img.title}</div>

                                                    {/* Real API Data Rendered Here */}
                                                    <div style={{
                                                        fontSize: '12px',
                                                        color: '#666',
                                                        marginTop: '2px'
                                                    }}>📅 {img.date.split('T')[0]} • ☁️ {img.cloudCover.toFixed(1)}%</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* STICKY FOOTER ACTION */}
                {aoSelectedIds.length > 0 && (
                    <div style={{
                        padding: '20px',
                        background: 'white',
                        borderTop: '1px solid #ddd',
                        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px'
                        }}>
                            <span style={{fontWeight: 'bold', color: '#007bff'}}>{aoSelectedIds.length} Selected</span>
                            <span style={{
                                fontSize: '12px',
                                color: '#666'
                            }}>Ready to inject</span>
                        </div>
                        <AppButton sVariant="success" oStyle={{width: '100%'}} fnOnClick={handleImport}>
                            ⬇️ Import Selected
                        </AppButton>
                    </div>
                )}
            </div>

            {/* --- RIGHT PANEL (70%) - MAP --- */}
            <div style={{flex: 1, height: '100%', position: 'relative'}}>
                <MapboxMap
                    aoMarkers={[]}
                    oInitialView={{latitude: 45.0, longitude: 8.0, zoom: 6}} // Centered near the python example coords
                    bEnableDraw={true}
                    bEnableGeocoder={true}

                    // --- NEW: WIRING MAPBOX DRAW TO OUR AOI STATE ---
                    onDrawUpdate={handleDrawUpdate}
                    aoFeatures={aoFeatures} // Ensures the polygon stays on screen
                />
            </div>

        </div>
    );
};

// Styles
const headerStyle = {fontSize: '16px', fontWeight: 'bold', color: '#333'};
const gridStyle = {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'};

export default AddEoImages;
