import React from 'react';
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import EditProject from './views/edit-project';
import Login from "./views/login";
import Register from "./views/register";
import HomePage from "./views/homepage";
import TestPage from "./views/test-page";
import ConfirmRegister from "./views/confirm-register";
import ForgotPassword from "./views/forget-password";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* 1. The Landing Page */}
                <Route path="/" element={<HomePage/>}/>

                {/* 2. Authentication Pages */}
                <Route path="/login" element={<Login/>}/>
                <Route path="/register" element={<Register/>}/>

                {/* 3. The Main App (Dashboard) */}
                <Route path="/edit-project" element={<EditProject/>}/>

                {/* Optional: Test Page */}
                <Route path="/test" element={<TestPage/>}/>
                <Route path="/forgot-password" element={<ForgotPassword/>}/>
                <Route path="/confirm-register" element={<ConfirmRegister/>}/>

            </Routes>
        </BrowserRouter>
    );
}

export default App;
