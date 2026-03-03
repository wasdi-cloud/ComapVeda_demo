import React from 'react';
import {BrowserRouter, Route, Routes} from 'react-router-dom';
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
import ProjectProperties from "./views/project-properties";
import ProjectPropertiesPage from "./views/project-properties";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* GROUP 1: Pages that HAVE the Navbar */}
                <Route element={<Layout />}>
                    <Route path="/" element={<HomePage/>}/>
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
                </Route>

                {/* GROUP 2: Pages that DO NOT have the Navbar (Login, Register) */}
                {/* Usually, you don't want the main app nav on the login screen */}
                <Route path="/login" element={<Login/>}/>
                <Route path="/register" element={<Register/>}/>
                <Route path="/forgot-password" element={<ForgotPassword/>}/>
                <Route path="/confirm-register" element={<ConfirmRegister/>}/>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
