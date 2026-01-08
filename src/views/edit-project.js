import { useState } from "react";
import LeafletMap from "../components/LeafletMap";

const EditProject = () => {
    const [images] = useState([
        { id: 1, name: "Sentinel-2 - 2023-10-01", date: "2023-10-01",annotator:"Jihed" },
        { id: 2, name: "Landsat-8 - 2023-09-15", date: "2023-09-15",annotator:"Jihed" },
        { id: 3, name: "Sentinel-2 - 2023-08-20", date: "2023-08-20",annotator:"Jihed" },
    ]);

    const [labelOpacity, setLabelOpacity] = useState(70);

    return (
        <div style={{
            position: 'fixed',   // Locks it to the viewport
            top: '80px',              // CHANGE THIS if you have a top menu (e.g. '50px')
            bottom: 0,           // Anchors to bottom (prevents vertical scroll)
            left: 0,
            right: 0,
            display: 'flex',     // Internal layout is flex
            overflow: 'hidden',  // Safety lock
            fontFamily: 'sans-serif',
            background: '#fff'
        }}>

            {/* PART 1: SIDEBAR (25%) */}
            <div style={{
                width: '25%',
                height: '100%',
                borderRight: '1px solid #ccc',
                display: 'flex',
                flexDirection: 'column',
                background: '#f9f9f9',
                flexShrink: 0
            }}>
                <div style={{ padding: '15px', borderBottom: '1px solid #ddd' }}>
                    <h3>Images ({images.length})</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button>Add Image</button>
                        <button>Styles</button>
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                    {images.map(img => (
                        <div key={img.id} style={{ padding: '10px', background: '#fff', border: '1px solid #ddd', marginBottom: '10px' }}>
                            {img.name}
                        </div>
                    ))}
                </div>
            </div>

            {/* PART 2: MAIN CONTENT (75%) */}
            <div style={{
                flex: 1,
                height: '100%',         // 3. Ensure this column is also strictly 100vh
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'      // 4. Ensure nothing escapes this column
            }}>

                {/* HEADER: FIXED HEIGHT */}
                <div style={{
                    padding: '15px',
                    borderBottom: '1px solid #ddd',
                    background: '#fff',
                    flexShrink: 0       // 5. Never shrink the header
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><strong>Project:</strong> High-Res | <strong>Owner:</strong> Jihed | <strong>Labels:</strong> 12</div>
                        <div>

                            <button style={{ marginLeft: '10px' }}>Properties</button>
                            <button style={{ marginLeft: '10px' }}>Collaborators</button>
                            <button style={{ marginLeft: '10px' }}>Export</button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', marginTop: '15px', alignItems: 'center', fontSize: '14px' }}>
                        <div>Opacity: <input type="range" value={labelOpacity} onChange={(e) => setLabelOpacity(e.target.value)} /></div>
                        <div>Styles: <input type="checkbox" /> Label</div>
                        <label><input type="checkbox" /> Validated</label>
                    </div>
                </div>

                {/* MAP WRAPPER: FILL REMAINING SPACE */}
                <div style={{
                    flex: 1,                // 6. Grow to fill space
                    position: 'relative',
                    width: '100%',
                    minHeight: 0            // 7. CRITICAL: Allow shrinking if table needs room
                }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
                        <LeafletMap
                            markers={[]}
                            initialView={{ latitude: 48.8566, longitude: 2.3522, zoom: 12 }}
                        />
                    </div>
                </div>

                {/* TABLE: FIXED HEIGHT AT BOTTOM */}
                <div style={{
                    height: '200px',        // 8. Fixed height for table area
                    borderTop: '2px solid #333',
                    padding: '10px',
                    background: '#fff',
                    flexShrink: 0,          // 9. Never shrink the table
                    overflowY: 'auto',      // 10. Scroll INSIDE table, not the page
                    zIndex: 20
                }}>
                    <strong>Attributes</strong>
                    <table style={{ width: '100%', marginTop: '10px', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                        <tr style={{ background: '#eee', textAlign: 'left' }}>
                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Name</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Type</th>
                        </tr>
                        </thead>
                        <tbody>
                        {/* Dummy rows to test internal scrolling */}
                        {[...Array(10)].map((_, i) => (
                            <tr key={i}>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>Land_Use_{i}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>String</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EditProject;
