import React from 'react';
import {BrowserRouter as Router, Link, Route, Routes} from 'react-router-dom';
import TestPage from './views/test-page';
import EditProject from './views/edit-project';

function App() {
    return (
        <Router>
            <div className="App">
                {/* Simple Navigation Bar */}
                <nav style={{padding: '20px', background: '#f4f4f4', marginBottom: '20px'}}>
                    <Link to="/" style={{marginRight: '20px'}}>Edit Project</Link>
                    <Link to="/solo">Test Maps</Link>
                </nav>

                {/* Route Definitions */}
                <Routes>
                    <Route path="/" element={<EditProject/>}/>
                    <Route path="/solo" element={<TestPage/>}/>
                </Routes>
            </div>
        </Router>
    );
}

export default App;
