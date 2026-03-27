// src/App.jsx
import React from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import SideLayout from "./pages/layouts/SideLayout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import DashboardBuilder from "./pages/DashboardBuilder";
import UploadData from "./pages/UploadData";
import Settings from "./pages/settings/Settings";

import VisualGallery from "./pages/VisualGallery";
import VisualBuilder from "./pages/visual-builder/VisualBuilder";
import WorkspaceExplorer from "./pages/WorkspaceExplorer";
import Workspace from "./pages/Workspace";

import DatasetView from "./pages/DatasetView";
import DatasetEdit from "./pages/DatasetEdit";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? <SideLayout>{children}</SideLayout> : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? <Navigate to="/home" replace /> : children;
};

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        
        {/* Protected Routes with Layout */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/workspaces" element={<ProtectedRoute><WorkspaceExplorer /></ProtectedRoute>} />
        <Route path="/workspace/:id" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
        
        {/* Visualization Routes */}
        <Route path="/visual-builder" element={<ProtectedRoute><VisualBuilder /></ProtectedRoute>} />
        
        {/* Dashboard Routes */}
        <Route path="/dashboards/:id" element={<ProtectedRoute><DashboardBuilder /></ProtectedRoute>} />
        <Route path="/builder" element={<ProtectedRoute><DashboardBuilder /></ProtectedRoute>} />
        <Route path="/builder/:id" element={<ProtectedRoute><DashboardBuilder /></ProtectedRoute>} />
        
        {/* Data & Settings Routes */}
        <Route path="/upload" element={<ProtectedRoute><UploadData /></ProtectedRoute>} />
        <Route path="/gallery" element={<ProtectedRoute><VisualGallery /></ProtectedRoute>} />
        <Route path="/settings/*" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        <Route path="/dataset/:id" element={<DatasetView />} />
        <Route path="/dataset/:id/edit" element={<DatasetEdit />} />

        {/* Catch-all Route */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Router>
  );
};

export default App;