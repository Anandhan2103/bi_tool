// src/pages/WorkspaceExplorer.js

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  Truck,
  ShoppingCart,
  Factory,
  Wifi,
  HeartPulse,
  Users,
  Plus,
  Package,
  Settings,
  Home,
  Database,
  BarChart3,
  LayoutGrid,
  Search,
  Globe,
  Lock,
  ChevronRight,
  Calendar,
  FileText,
  Trash2
} from "lucide-react";

import CreateWorkspaceModal from "../components/CreateWorkspaceModal";
import api from "../api/api";
import "../styles/workspaceExplorer.css";

const iconMap = {
  Home,
  DollarSign,
  Truck,
  ShoppingCart,
  Factory,
  Package,
  Wifi,
  HeartPulse,
  Users,
  Settings,
  Database,
  BarChart3,
  LayoutGrid,
  FileText
};

const WorkspaceExplorer = () => {
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  /* ================================
     LOAD WORKSPACES
  ================================= */

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        setLoading(true);

        const res = await api.get("/workspaces");

        const normalized = res.data.map((ws) => ({
          id: ws.id || ws._id,
          name: ws.name,
          description: ws.description || "",
          icon: ws.icon || "Settings",
          color: ws.color || "#4f46e5",
          isDefault: ws.type === "default",
          isGeneral: ws.type === "general",
          isCustom: ws.type === "custom",
          isSystem: ws.isSystem || false,
          createdAt: ws.created_at,
          stats: ws.stats || {
            datasets: 0,
            reports: 0,
            dashboards: 0
          }
        }));

        setWorkspaces(normalized);
      } catch (err) {
        console.error("Workspace loading failed", err);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaces();
  }, []);

  /* ================================
     FILTER WORKSPACES
  ================================= */

  const filteredWorkspaces = workspaces.filter((ws) => {
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      ws.name.toLowerCase().includes(q) ||
      ws.description.toLowerCase().includes(q);

    const matchesFilter =
      filter === "all" ||
      (filter === "default" && ws.isDefault) ||
      (filter === "custom" && ws.isCustom);

    return matchesSearch && matchesFilter;
  });

  const generalWorkspace = workspaces.find((w) => w.isGeneral);
  const defaultWorkspaces = filteredWorkspaces.filter(
    (w) => w.isDefault && !w.isGeneral
  );
  const customWorkspaces = filteredWorkspaces.filter((w) => w.isCustom);

  /* ================================
     CREATE WORKSPACE
  ================================= */

  const handleCreateWorkspace = async (data) => {
    try {
      const res = await api.post("/workspaces", data);

      const newWs = res.data;

      setWorkspaces((prev) => [...prev, newWs]);

      setShowModal(false);

      navigate(`/workspace/${newWs.id}`);
    } catch (err) {
      console.error("Create workspace failed", err);
    }
  };

  /* ================================
     DELETE WORKSPACE
  ================================= */

  const handleDeleteWorkspace = async (id, name) => {
    if (!window.confirm(`Delete "${name}" workspace?`)) return;

    try {
      await api.delete(`workspaces/${id}`);

      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      console.error("Delete workspace failed", err);
    }
  };

  /* ================================
     ICON HELPER
  ================================= */

  const getIcon = (name) => iconMap[name] || Settings;

  /* ================================
     LOADING
  ================================= */

  if (loading) {
    return (
      <div className="workspace-explorer-loading">
        <div className="loading-spinner"></div>
        <p>Loading workspaces...</p>
      </div>
    );
  }

  /* ================================
     RENDER
  ================================= */

  return (
    <div className="workspace-explorer-page">

      {/* HEADER */}

      <div className="workspace-explorer-header">
        <div className="header-content">
          <h1>Workspaces</h1>
          <p className="header-description">
            Organize datasets, reports and dashboards
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          <Plus size={18} />
          Create Workspace
        </button>
      </div>

      {/* SEARCH + FILTER */}

      <div className="workspace-controls">

        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>

          <button
            className={`filter-btn ${filter === "default" ? "active" : ""}`}
            onClick={() => setFilter("default")}
          >
            <Globe size={14} />
            Default
          </button>

          <button
            className={`filter-btn ${filter === "custom" ? "active" : ""}`}
            onClick={() => setFilter("custom")}
          >
            <Lock size={14} />
            Custom
          </button>
        </div>
      </div>

      {/* GENERAL WORKSPACE */}

      {generalWorkspace && (
        <div className="workspace-section">

          <h2 className="section-title">
            <Home size={18} />
            General Workspace
          </h2>

          <div className="workspace-grid">
            <WorkspaceCard
              ws={generalWorkspace}
              navigate={navigate}
              getIcon={getIcon}
            />
          </div>
        </div>
      )}

      {/* DEFAULT WORKSPACES */}

      {defaultWorkspaces.length > 0 && (
        <WorkspaceSection
          title="Default Workspaces"
          icon={<Globe size={18} />}
          data={defaultWorkspaces}
          navigate={navigate}
          getIcon={getIcon}
        />
      )}

      {/* CUSTOM WORKSPACES */}

      <WorkspaceSection
        title="Custom Workspaces"
        icon={<Lock size={18} />}
        data={customWorkspaces}
        navigate={navigate}
        getIcon={getIcon}
        onDelete={handleDeleteWorkspace}
        allowDelete
      />

      {/* CREATE WORKSPACE MODAL */}

      {showModal && (
        <CreateWorkspaceModal
          onClose={() => setShowModal(false)}
          onSave={handleCreateWorkspace}
        />
      )}
    </div>
  );
};


/* ===================================
   WORKSPACE SECTION COMPONENT
=================================== */

const WorkspaceSection = ({
  title,
  icon,
  data,
  navigate,
  getIcon,
  allowDelete,
  onDelete
}) => (
  <div className="workspace-section">

    <div className="section-header">
      <h2 className="section-title">
        {icon}
        {title}
      </h2>

      <span className="section-count">
        {data.length} workspaces
      </span>
    </div>

    <div className="workspace-grid">

      {data.map((ws) => (
        <WorkspaceCard
          key={ws.id}
          ws={ws}
          navigate={navigate}
          getIcon={getIcon}
          allowDelete={allowDelete}
          onDelete={onDelete}
        />
      ))}

    </div>

  </div>
);


/* ===================================
   WORKSPACE CARD COMPONENT
=================================== */

const WorkspaceCard = ({ ws, navigate, getIcon, allowDelete, onDelete }) => {

  const Icon = getIcon(ws.icon);

  return (
    <div
      className="workspace-card"
      onClick={() => navigate(`/workspace/${ws.id}`)}
    >

      <div
        className="workspace-icon"
        style={{
          backgroundColor: `${ws.color}15`
        }}
      >
        <Icon size={22} color={ws.color} />
      </div>

      <div className="workspace-content">

        <div className="workspace-title-row">
          <h3 className="workspace-name">{ws.name}</h3>
        </div>

        <p className="workspace-desc">{ws.description}</p>

        <div className="workspace-meta">

          <span className="meta-item">
            <Database size={12} />
            {ws.stats?.datasets || 0} datasets
          </span>

          <span className="meta-item">
            <BarChart3 size={12} />
            {ws.stats?.reports || 0} reports
          </span>

          <span className="meta-item">
            <LayoutGrid size={12} />
            {ws.stats?.dashboards || 0} dashboards
          </span>

        </div>
      </div>

      <div className="workspace-actions">

        <ChevronRight size={18} />

        {allowDelete && !ws.isSystem && (
          <button
            className="delete-workspace-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(ws.id, ws.name);
            }}
          >
            <Trash2 size={14} />
          </button>
        )}

      </div>

    </div>
  );
};

export default WorkspaceExplorer;