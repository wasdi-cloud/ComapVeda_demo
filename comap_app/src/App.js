import React from 'react';
import { BrowserRouter, Route, Routes, Navigate, Outlet } from 'react-router-dom';

// VIEWS
import EditProject from './views/edit-project';
import Login from "./views/login";
import Register from "./views/register";
import HomePage from "./views/homepage";
import ConfirmRegister from "./views/confirm-register";
import ForgotPassword from "./views/forget-password";
import NewProjectRequest from "./views/new-project-request";
import ApproveProject from "./views/approve-project";
import LabelTemplatesLibrary from "./views/label-template-library";
import NewLabelTemplate from "./views/create-label-template";
import ProjectCollaborators from "./views/project-collaborators";
import AddEoImages from "./views/add-eo-images";
import EditImageStyle from "./views/edit-image-style";
import ExportProject from "./views/export-project";
import Layout from "./views/layout";
import ProjectRequests from "./views/project-requests";
import ProjectPropertiesPage from "./views/project-properties";

// AUTH IMPORT
import { isAuthenticated } from './services/session';
import Profile from "./views/profile"; // <-- Import your auth check

// --- 1. CREATE THE PROTECTED ROUTE WRAPPER ---
const ProtectedRoute = () => {
    // If the user has a token, render the child routes (<Outlet />).
    // Otherwise, redirect them to the login page.
    return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* All pages use the Navbar Layout */}
                <Route element={<Layout />}>

                    {/* --- PUBLIC ROUTES --- */}
                    {/* Anyone can access these pages */}
                    <Route path="/" element={<HomePage/>}/>
                    <Route path="/login" element={<Login/>}/>
                    <Route path="/register" element={<Register/>}/>
                    <Route path="/forgot-password" element={<ForgotPassword/>}/>
                    <Route path="/confirm-register" element={<ConfirmRegister/>}/>

                    {/* --- PROTECTED ROUTES --- */}
                    {/* Only logged-in users can pass through this wrapper */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/edit-project" element={<EditProject/>}/>
                        <Route path="/new-project" element={<NewProjectRequest/>}/>
                        <Route path="/approve-project/:projectId" element={<ApproveProject/>}/>
                        <Route path="/label-templates" element={<LabelTemplatesLibrary/>}/>
                        <Route path="/create-label-template" element={<NewLabelTemplate/>}/>
                        <Route path="/project-collabs" element={<ProjectCollaborators/>}/>
                        <Route path="/add-eo" element={<AddEoImages/>}/>
                        <Route path="/image-styling" element={<EditImageStyle/>}/>
                        <Route path="/export-project" element={<ExportProject/>}/>
                        <Route path="/project-requests" element={<ProjectRequests/>}/>
                        <Route path="/project-properties" element={<ProjectPropertiesPage/>}/>
                        <Route path="/profile" element={<Profile/>}/>
                    </Route>

                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
