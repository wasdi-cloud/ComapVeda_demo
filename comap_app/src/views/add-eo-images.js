import React, {useState} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import * as turf from '@turf/turf';

// REUSABLE COMPONENTS
import MapboxMap from '../components/MapboxMap';
import AppCard from '../components/app-card';
import AppDateInput from '../components/app-date-input';
import AppSelect from '../components/app-dropdown-input';
import AppButton from '../components/app-button';
import AppTextInput from '../components/app-text-input';

// CONTEXT + HOOK
import { useNotifications } from '../contexts/NotificationContext';
import { useProject } from '../contexts/ProjectContext';

// SERVICES
import { searchImages, importImage } from '../services/images-service';

// IMPORT YOUR GIF:
import spinningEarthGif from '../assets/spinning-earth.gif';

const AddEoImages = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sHoveredFootprint, setHoveredFootprint] = useState(null);

    const sProjectId = location.state?.projectId || null;

    const { addNotification } = useNotifications();

    // --- UX UPGRADE: GRAB GLOBAL IMPORTING STATE ---
    const { setCurrentProjectId, isImporting, setIsImporting } = useProject();

    React.useEffect(() => {
        if (sProjectId) {
            setCurrentProjectId(sProjectId);
        }
    }, [sProjectId, setCurrentProjectId]);

    const aoAlreadyImportedIds = [];

    // --- SEARCH FORM STATE ---
    const [sProvider, setSProvider] = useState("Copernicus");
    const [sProductName, setSProductName] = useState("");
    const [sStartDate, setSStartDate] = useState("2026-03-01");
    const [sEndDate, setSEndDate] = useState("2026-03-31");
    const [sSatellitePlatform, setSSatellitePlatform] = useState("Sentinel-2");
    const [sProductType, setSProductType] = useState("L1C");
    const [sCloudCoverage, setSCloudCoverage] = useState("20");

    const [aoFeatures, setAoFeatures] = useState([]);

    // --- RESULTS & SELECTION ---
    const [bIsSearching, setBIsSearching] = useState(false);
    const [aoSearchResults, setAoSearchResults] = useState(null);
    const [aoSelectedIds, setAoSelectedIds] = useState([]);

    // --- HANDLERS ---
    const handleDrawUpdate = (featureCollection) => {
        if (featureCollection && featureCollection.features) {
            setAoFeatures(featureCollection.features);
        }
    };

    const getBboxWkt = () => {
        if (!aoFeatures || aoFeatures.length === 0) return null;
        const box = turf.bbox(aoFeatures[0]);
        const [minX, minY, maxX, maxY] = box;
        return `POLYGON((${minX} ${minY}, ${minX} ${maxY}, ${maxX} ${maxY}, ${maxX} ${minY}, ${minX} ${minY}))`;
    };

    const handleSearch = async (e) => {
        e.preventDefault();

        const sWktBbox = getBboxWkt();
        if (!sWktBbox) {
            return addNotification("Please draw an Area of Interest (AOI) on the map first.", "warning");
        }

        setBIsSearching(true);
        setAoSearchResults([]);
        setAoSelectedIds([]);

        try {
            const isoStartDate = new Date(`${sStartDate}T00:00:00Z`).toISOString();
            const isoEndDate = new Date(`${sEndDate}T23:59:59Z`).toISOString();

            const queryParams = {
                bbox: sWktBbox,
                start_date: isoStartDate,
                end_date: isoEndDate,
                platform: sSatellitePlatform,
                product_level: sProductType,
                max_cloud_cover: parseFloat(sCloudCoverage) || 100.0
            };

            const results = await searchImages(queryParams);

            if (results && results.length > 0) {
                setAoSearchResults(results);
                addNotification(`Found ${results.length} images matching your criteria.`, "success");
            } else {
                setAoSearchResults([]);
                addNotification("No images found for this area and date range.", "info");
            }

        } catch (error) {
            console.error("Search Error:", error);
            addNotification("Failed to fetch images from the server.", "error");
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

    const handleImport = async () => {
        if (aoSelectedIds.length === 0) return addNotification("Please select at least one image.", "warning");
        if (!sProjectId) return addNotification("Project ID is missing!", "error");

        // 1. Lock the UI globally!
        setIsImporting(true);

        try {
            for (const sImageId of aoSelectedIds) {
                const oFullImage = aoSearchResults.find(img => img.id === sImageId);
                const oPayload = {
                    projectId: sProjectId,
                    platform: oFullImage.platform,
                    imageUrl: oFullImage.link,
                    imageName: oFullImage.title
                };
                await importImage(oPayload);
            }

            addNotification(`Import started for ${aoSelectedIds.length} image(s). Processing in background...`, "info");

            // NOTE: We DO NOT call setIsImporting(false) here!
            // The backend returns immediately, but the conversion is still happening.
            // The WebSocket will flip this to false when it finishes!

        } catch (error) {
            console.error("Import Error:", error);
            addNotification("Failed to start import. Check console.", "error");

            // Only unlock if the API call itself crashed
            setIsImporting(false);
        }
    };

    return (
        <div style={{display: 'flex', height: 'calc(100vh - 64px)', width: '100%', overflow: 'hidden'}}>

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

                {/* 1. FIXED HEADER */}
                <div style={{flexShrink: 0, padding: '15px 20px', background: 'white', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                        <button
                            onClick={() => navigate(-1)}
                            title="Go Back"
                            style={{
                                border: '1px solid #ccc', background: '#fff', color: '#333',
                                cursor: 'pointer', fontSize: '13px', padding: '6px 12px',
                                borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px',
                                fontWeight: 'bold', transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#f0f0f0'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#fff'}
                        >
                            <span style={{ fontSize: '16px' }}>←</span> Back
                        </button>

                        <h2 style={{margin: 0, fontSize: '18px', color: '#333'}}>🛰️ Add EO Images</h2>
                    </div>
                </div>

                {/* 2. DYNAMIC CONTENT AREA */}
                {isImporting ? (
                    // --- THE IMPORTING LOCK SCREEN ---
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px', textAlign: 'center' }}>
                        <img
                            src={spinningEarthGif}
                            alt="Importing..."
                            style={{ width: '150px', height: '150px', borderRadius: '50%', mixBlendMode: 'multiply' }}
                        />
                        <h3 style={{ color: '#333', marginTop: '20px', marginBottom: '10px' }}>Injecting Images</h3>
                        <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
                            We are downloading and converting the satellite imagery into Cloud Optimized GeoTIFFs.
                        </p>

                        {/* UX FIX: Guide them to the back button instead of letting them break the lock! */}
                        <div style={{ background: '#e6f2ff', padding: '12px 20px', borderRadius: '6px', marginTop: '20px', border: '1px solid #b8daff' }}>
                            <p style={{ color: '#0056b3', fontSize: '13px', fontWeight: 'bold', margin: 0 }}>
                                💡 Tip: You can safely use the "← Back" button to return to your project.
                            </p>
                            <p style={{ color: '#0056b3', fontSize: '12px', margin: '5px 0 0 0' }}>
                                We will notify you when the images are ready!
                            </p>
                        </div>
                    </div>
                ) : (
                    // --- THE NORMAL SEARCH INTERFACE ---
                    <div style={{flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px'}}>

                        {/* COMPACT SEARCH FORM */}
                        <AppCard oStyle={{ padding: '15px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <AppSelect sLabel="Provider" sValue={sProvider} fnOnChange={(e) => setSProvider(e.target.value)} aoOptions={["Copernicus"]} oStyle={{width: '100%'}} />
                                <AppSelect sLabel="Platform" sValue={sSatellitePlatform} fnOnChange={(e) => setSSatellitePlatform(e.target.value)} aoOptions={["Sentinel-2"]} oStyle={{width: '100%'}} />

                                <div style={{ gridColumn: 'span 2' }}>
                                    <AppTextInput sLabel="Product Name (Optional)" sPlaceholder="e.g. S2_MSI_L2A" sValue={sProductName} fnOnChange={(e) => setSProductName(e.target.value)} oStyle={{width: '100%'}} />
                                </div>

                                <AppDateInput sLabel="From Date" sName="start" sValue={sStartDate} fnOnChange={(e) => setSStartDate(e.target.value)}/>
                                <AppDateInput sLabel="To Date" sName="end" sValue={sEndDate} fnOnChange={(e) => setSEndDate(e.target.value)}/>

                                <AppSelect sLabel="Level" sValue={sProductType} fnOnChange={(e) => setSProductType(e.target.value)} aoOptions={["L1C", "L2A"]} oStyle={{width: '100%'}} />
                                <AppTextInput sLabel="Max Cloud %" sPlaceholder="20" sValue={sCloudCoverage} type="number" fnOnChange={(e) => setSCloudCoverage(e.target.value)} oStyle={{width: '100%'}} />
                            </div>

                            <AppButton sVariant="primary" oStyle={{width: '100%', marginTop: '15px'}} fnOnClick={handleSearch} disabled={bIsSearching}>
                                {bIsSearching ? "Searching..." : "🔍 Search Images"}
                            </AppButton>
                        </AppCard>

                        {/* RESULTS LIST */}
                        {bIsSearching ? (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <img src={spinningEarthGif} alt="Searching..." style={{ width: '150px', height: '150px', borderRadius: '50%', mixBlendMode: 'multiply' }} />
                                <p style={{ color: '#666', marginTop: '20px', fontWeight: 'bold', fontSize: '16px' }}>Scanning satellite archives...</p>
                            </div>
                        ) : aoSearchResults && (
                            <div>
                                <h3 style={{fontSize: '14px', color: '#444', margin: '0 0 10px 0'}}>
                                    Results ({aoSearchResults.length})
                                </h3>

                                {aoSearchResults.length === 0 ? (
                                    <div style={{textAlign: 'center', color: '#888', fontStyle: 'italic', padding: '20px 0'}}>No images found for this area.</div>
                                ) : (
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}} onMouseLeave={() => setHoveredFootprint(null)}>
                                        {aoSearchResults.map((img, idx) => {
                                            const bIsAlreadyImported = aoAlreadyImportedIds.includes(img.id);
                                            const bIsSelected = aoSelectedIds.includes(img.id);
                                            const thumbColor = idx % 2 === 0 ? "#1e3c72" : "#2a5298";

                                            return (
                                                <div key={img.id}
                                                     onMouseEnter={() => setHoveredFootprint(img.footprint)}
                                                     onClick={() => { if (!bIsAlreadyImported) handleToggleSelect(img.id); }}
                                                     style={{
                                                         padding: '8px',
                                                         borderRadius: '6px',
                                                         border: bIsSelected ? '2px solid #007bff' : '1px solid #eee',
                                                         background: bIsAlreadyImported ? '#f9f9f9' : (bIsSelected ? '#f0f8ff' : 'white'),
                                                         display: 'flex',
                                                         alignItems: 'center',
                                                         gap: '10px',
                                                         opacity: bIsAlreadyImported ? 0.6 : 1,
                                                         cursor: bIsAlreadyImported ? 'not-allowed' : 'pointer',
                                                         transition: 'all 0.2s ease-in-out'
                                                     }}>

                                                    <div style={{width: '24px', display: 'flex', justifyContent: 'center'}}>
                                                        {bIsAlreadyImported ? (
                                                            <span title="Already in project">✅</span>
                                                        ) : (
                                                            <input type="checkbox" checked={bIsSelected} onChange={() => {}} style={{ pointerEvents: 'none' }} />
                                                        )}
                                                    </div>

                                                    <div style={{ width: '40px', height: '40px', background: thumbColor, borderRadius: '4px', flexShrink: 0 }}></div>

                                                    <div style={{flex: 1, overflow: 'hidden'}}>
                                                        <div style={{ fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={img.title}>
                                                            {img.title}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                                                            📅 {img.date.split('T')[0]} • ☁️ {img.cloudCover.toFixed(1)}%
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 3. FIXED FOOTER (IMPORT BUTTON - HIDDEN DURING IMPORT) */}
                {!isImporting && aoSelectedIds.length > 0 && (
                    <div style={{
                        flexShrink: 0,
                        padding: '15px 20px',
                        background: 'white',
                        borderTop: '1px solid #ddd',
                        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{fontWeight: 'bold', color: '#007bff'}}>{aoSelectedIds.length} Selected</span>
                            <span style={{ fontSize: '12px', color: '#666' }}>Ready to inject</span>
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
                    oInitialView={{latitude: 45.0, longitude: 8.0, zoom: 6}}
                    bEnableDraw={true}
                    bEnableGeocoder={true}
                    sHoveredFootprint={sHoveredFootprint}
                    bPreventPolygonIntersection={true}
                    bPreventSelfIntersection={true}
                    onDrawUpdate={handleDrawUpdate}
                    aoFeatures={aoFeatures}
                />
            </div>

        </div>
    );
};

export default AddEoImages;
