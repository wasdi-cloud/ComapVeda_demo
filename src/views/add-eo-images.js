import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';

// REUSABLE COMPONENTS
import MapboxMap from '../components/MapboxMap';
import AppCard from '../components/app-card';
import AppDateInput from '../components/app-date-input';
import AppSelect from '../components/app-dropdown-input';
import AppButton from '../components/app-button';
import AppTextInput from '../components/app-text-input'; // Needed for Cloud/Product Name

const AddEoImages = () => {
    const navigate = useNavigate();

    // --- 1. MOCK DATA ---
    const aoAlreadyImportedIds = [2];

    // --- 2. SEARCH FORM STATE ---
    // Section A: Provides
    const [sProvider, setSProvider] = useState("Copernicus");
    const [sProductName, setSProductName] = useState("");
    const [bUseCrontab, setBUseCrontab] = useState(false);
    const [sStartDate, setSStartDate] = useState("2023-01-01");
    const [sEndDate, setSEndDate] = useState("2023-01-31");

    // Section B: Mission
    const [sMissionType, setSMissionType] = useState("Optical");
    const [sSatellitePlatform, setSSatellitePlatform] = useState("Sentinel-2");
    const [sProductType, setSProductType] = useState("L2A");
    const [sCloudCoverage, setSCloudCoverage] = useState(""); // Text input now

    const [oAoiGeometry, setOAoiGeometry] = useState(null);

    // --- 3. RESULTS & SELECTION ---
    const [bIsSearching, setBIsSearching] = useState(false);
    const [aoSearchResults, setAoSearchResults] = useState(null);
    const [aoSelectedIds, setAoSelectedIds] = useState([]);

    // --- HANDLERS ---
    const handleSearch = (e) => {
        e.preventDefault();
        setBIsSearching(true);
        setAoSearchResults([]);
        setAoSelectedIds([]);

        // Simulate API call
        setTimeout(() => {
            const mockResults = [
                {id: 1, name: "S2B_MSIL2A_20230115_T31UDQ", date: "2023-01-15", cloud: 2.5, thumbColor: "#1e3c72"},
                {id: 2, name: "S2A_MSIL2A_20230110_T31UDQ", date: "2023-01-10", cloud: 8.1, thumbColor: "#2a5298"},
                {id: 3, name: "S2B_MSIL2A_20230105_T31UDQ", date: "2023-01-05", cloud: 0.1, thumbColor: "#1e3c72"},
                {id: 4, name: "S2A_MSIL2A_20230101_T31UDQ", date: "2023-01-01", cloud: 12.4, thumbColor: "#2a5298"},
            ];
            setAoSearchResults(mockResults);
            setBIsSearching(false);
        }, 1000);
    };

    const handleToggleSelect = (id) => {
        if (aoSelectedIds.includes(id)) {
            setAoSelectedIds(aoSelectedIds.filter(itemId => itemId !== id));
        } else {
            setAoSelectedIds([...aoSelectedIds, id]);
        }
    };

    const handleImport = () => {
        if (aoSelectedIds.length === 0) return alert("Please select at least one image.");
        alert(`Importing ${aoSelectedIds.length} images...`);
        navigate('/edit-project');
    };

    return (
        <div style={{display: 'flex', height: '100vh', width: '100%', overflow: 'hidden'}}>

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
                        <button onClick={() => navigate('/edit-project')} style={{
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

                                {/* Use Crontab Button (Toggle) */}
                                <div style={{display: 'flex', justifyContent: 'flex-start'}}>
                                    <AppButton
                                        sVariant={bUseCrontab ? "success" : "outline"}
                                        fnOnClick={() => setBUseCrontab(!bUseCrontab)}
                                        oStyle={{fontSize: '12px', padding: '8px 15px'}}
                                    >
                                        {bUseCrontab ? "✅ Crontab Active" : "⏱️ Use Crontab"}
                                    </AppButton>
                                </div>

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
                                        aoOptions={["Sentinel-2", "Sentinel-1", "Landsat 8"]}
                                        oStyle={{width: '100%'}}
                                    />
                                </div>

                                {/* Product Type */}
                                <AppSelect
                                    sLabel="Product Type"
                                    sValue={sProductType}
                                    fnOnChange={(e) => setSProductType(e.target.value)}
                                    aoOptions={["L1C (Top of Atmosphere)", "L2A (Bottom of Atmosphere)"]}
                                    oStyle={{width: '100%'}}
                                />

                                {/* Cloud Coverage (Text Input) */}
                                <AppTextInput
                                    sLabel="Cloud Coverage"
                                    sPlaceholder="e.g 0 to 9.4"
                                    sValue={sCloudCoverage}
                                    fnOnChange={(e) => setSCloudCoverage(e.target.value)}
                                />

                                <div style={{marginTop: '10px'}}>
                                    <AppButton sVariant="primary" oStyle={{width: '100%'}} fnOnClick={handleSearch}>
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
                                    {aoSearchResults.map(img => {
                                        const bIsAlreadyImported = aoAlreadyImportedIds.includes(img.id);
                                        const bIsSelected = aoSelectedIds.includes(img.id);

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
                                                    background: img.thumbColor,
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
                                                    }}>{img.name}</div>
                                                    <div style={{
                                                        fontSize: '12px',
                                                        color: '#666',
                                                        marginTop: '2px'
                                                    }}>📅 {img.date} • ☁️ {img.cloud}%
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
                            }}>Est. Size: {aoSelectedIds.length * 800} MB</span>
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
                    oInitialView={{latitude: 48.8566, longitude: 2.3522, zoom: 8}}
                    bEnableDraw={true}
                    bEnableGeocoder={true}
                />
            </div>

        </div>
    );
};

// Styles
const headerStyle = {fontSize: '16px', fontWeight: 'bold', color: '#333'};
const gridStyle = {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'};

export default AddEoImages;
