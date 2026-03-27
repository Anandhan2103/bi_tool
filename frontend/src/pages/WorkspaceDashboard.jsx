import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft,
  Database, 
  Upload, 
  FileText,
  BarChart3,
  Filter,
  Download,
  Trash2,
  BarChart,
  Users,
  Calendar,
  Eye,
  AlertCircle,
  Home,
  Folder,
  Settings,
  Activity,
  Briefcase
} from "lucide-react";
import { 
  getWorkspaceData, 
  deleteWorkspaceData,
  updateFileAccess,
  deleteWorkspace,
  getWorkspaceInfo as getWorkspaceInfoAPI
} from "../utils/workspaceStore";
import "../styles/workspaceDashboard.css";

// Icon mapping for workspaces
const WORKSPACE_ICONS = {
  sales: BarChart,
  logistics: Database,
  retail: Users,
  manufacturing: Filter,
  production: Filter,
  telecom: Activity,
  healthcare: Users,
  employee: Users,
  general: Home,
  default: Folder
};

// Color mapping for workspaces
const WORKSPACE_COLORS = {
  sales: "#4f46e5",
  logistics: "#0891b2",
  retail: "#059669",
  manufacturing: "#ea580c",
  production: "#ea580c",
  telecom: "#2563eb",
  healthcare: "#dc2626",
  employee: "#9333ea",
  general: "#6b7280",
  custom: "#6b7280"
};

const WorkspaceDashboard = () => {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [workspaceInfo, setWorkspaceInfo] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Load workspace info and files on mount
  useEffect(() => {
    loadWorkspace();
  }, [workspaceId]);

  const loadWorkspace = async () => {
    setIsLoading(true);
    try {
      const actualWorkspaceId = workspaceId || "general";
      
      // Get workspace info
      const info = getWorkspaceInfoAPI(actualWorkspaceId);
      if (!info) {
        navigate('/workspaces');
        return;
      }
      
      // Set workspace info with icon and color
      const Icon = WORKSPACE_ICONS[actualWorkspaceId] || WORKSPACE_ICONS.default;
      const color = WORKSPACE_COLORS[actualWorkspaceId] || WORKSPACE_COLORS.custom;
      
      setWorkspaceInfo({
        ...info,
        icon: Icon,
        color: color
      });
      
      // Load workspace files
      const workspaceFiles = getWorkspaceData(actualWorkspaceId);
      setFiles(workspaceFiles || []);
      
    } catch (error) {
      console.error("Error loading workspace:", error);
      alert("Error loading workspace. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadClick = () => {
    const actualWorkspaceId = workspaceId || "general";
    navigate(`/data?workspace=${actualWorkspaceId}`);
  };

  const handleDeleteFile = async (fileId, fileName) => {
    if (window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      try {
        const actualWorkspaceId = workspaceId || "general";
        const success = deleteWorkspaceData(actualWorkspaceId, fileId);
        
        if (success) {
          setFiles(prev => prev.filter(file => file.id !== fileId));
        } else {
          alert("Failed to delete file. Please try again.");
        }
      } catch (error) {
        console.error("Error deleting file:", error);
        alert("Error deleting file. Please try again.");
      }
    }
  };

  const handleDeleteWorkspace = async () => {
    const actualWorkspaceId = workspaceId || "general";
    
    if (actualWorkspaceId === "general") {
      alert("General workspace cannot be deleted.");
      return;
    }

    if (workspaceInfo?.isDefault) {
      alert("Default workspaces cannot be deleted. You can only delete custom workspaces.");
      return;
    }

    const confirmation = window.confirm(
      `Are you absolutely sure you want to delete the "${workspaceInfo?.name}" workspace?\n\n` +
      `This will delete all ${files.length} file(s) and cannot be undone.`
    );

    if (confirmation) {
      try {
        await deleteWorkspace(actualWorkspaceId);
        navigate('/workspaces');
      } catch (error) {
        alert(error.message || "Error deleting workspace. Please try again.");
      }
    }
  };

  const handleExploreData = (file) => {
    const actualWorkspaceId = workspaceId || "general";
    updateFileAccess(actualWorkspaceId, file.id);
    navigate(`/visual-builder?workspace=${actualWorkspaceId}&file=${file.id}`);
  };

  const handleCreateDashboard = () => {
    const actualWorkspaceId = workspaceId || "general";
    navigate(`/builder?workspace=${actualWorkspaceId}`);
  };

  const handleViewFile = (file) => {
    const actualWorkspaceId = workspaceId || "general";
    updateFileAccess(actualWorkspaceId, file.id);
    
    // Create a blob URL for file preview
    if (file.fileData) {
      const blob = new Blob([file.fileData], { type: file.type });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else {
      alert(`Previewing ${file.name}\n\nFile details:\n- Size: ${formatFileSize(file.size)}\n- Type: ${file.type}\n- Uploaded: ${formatDate(file.uploadedAt)}`);
    }
  };

  const handleDownloadFile = (file) => {
    if (file.fileData) {
      const blob = new Blob([file.fileData], { type: file.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      alert(`Download functionality for ${file.name} would be implemented here.`);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric' 
      });
    } catch (error) {
      return '--';
    }
  };

  const totalFileSize = files.reduce((sum, file) => sum + (file?.size || 0), 0);
  const fileCount = files.length;
  const accessedFilesCount = files.filter(f => f?.lastAccessed).length;
  const latestUpload = files.length > 0 
    ? files.reduce((latest, file) => 
        new Date(file.uploadedAt) > new Date(latest.uploadedAt) ? file : latest
      )
    : null;

  if (isLoading) {
    return (
      <div className="workspace-loading">
        <div className="loading-spinner"></div>
        <p>Loading workspace...</p>
      </div>
    );
  }

  if (!workspaceInfo) {
    return (
      <div className="workspace-error">
        <AlertCircle size={48} />
        <h3>Workspace Not Found</h3>
        <p>The requested workspace could not be loaded.</p>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/workspaces')}
        >
          Go to Workspaces
        </button>
      </div>
    );
  }

  const Icon = workspaceInfo.icon;
  const isGeneralWorkspace = workspaceInfo.id === "general";
  const isDeletable = !workspaceInfo.isDefault && workspaceInfo.isCustom;

  return (
    <div className="workspace-dashboard-page">
      
      {/* BACK BUTTON */}
      <div className="back-button-container">
        <button 
          className="btn-back"
          onClick={() => navigate('/workspaces')}
        >
          <ArrowLeft size={18} />
          Back to Workspaces
        </button>
      </div>

      {/* WORKSPACE HEADER */}
      <div className="workspace-header">
        <div className="workspace-header-left">
          <div className="workspace-badge" style={{ backgroundColor: workspaceInfo.color }}>
            <Icon size={20} color="white" />
          </div>
          
          <div className="workspace-header-content">
            <div className="workspace-title-row">
              <h1 className={isGeneralWorkspace ? "general-workspace-title" : ""}>
                {isGeneralWorkspace ? "General Workspace" : `${workspaceInfo.name} Workspace`}
              </h1>
              {isGeneralWorkspace ? (
                <span className="workspace-general-badge">General</span>
              ) : workspaceInfo.isCustom ? (
                <span className="workspace-custom-badge">Custom</span>
              ) : (
                <span className="workspace-default-badge">Default</span>
              )}
            </div>
            <p className="workspace-description">{workspaceInfo.description}</p>
            {workspaceInfo.createdAt && workspaceInfo.isCustom && (
              <p className="workspace-created-date">
                Created: {formatDate(workspaceInfo.createdAt)}
              </p>
            )}
          </div>
        </div>
        
        <div className="workspace-header-actions">
          {isDeletable && (
            <button 
              className="btn btn-danger"
              onClick={handleDeleteWorkspace}
            >
              <Trash2 size={18} />
              Delete Workspace
            </button>
          )}
          <button 
            className="btn btn-secondary"
            onClick={handleCreateDashboard}
          >
            <BarChart3 size={18} />
            Create Dashboard
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleUploadClick}
          >
            <Upload size={18} />
            Upload Data
          </button>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="workspace-stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: `${workspaceInfo.color}15` }}>
            <Database size={20} color={workspaceInfo.color} />
          </div>
          <div className="stat-content">
            <h3>{fileCount}</h3>
            <p>Datasets</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: `${workspaceInfo.color}15` }}>
            <FileText size={20} color={workspaceInfo.color} />
          </div>
          <div className="stat-content">
            <h3>{formatFileSize(totalFileSize)}</h3>
            <p>Total Size</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: `${workspaceInfo.color}15` }}>
            <Calendar size={20} color={workspaceInfo.color} />
          </div>
          <div className="stat-content">
            <h3>{latestUpload ? formatDate(latestUpload.uploadedAt) : '--'}</h3>
            <p>Last Upload</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: `${workspaceInfo.color}15` }}>
            <Eye size={20} color={workspaceInfo.color} />
          </div>
          <div className="stat-content">
            <h3>{accessedFilesCount}</h3>
            <p>Accessed Files</p>
          </div>
        </div>
      </div>

      {/* DATASETS SECTION */}
      <div className="datasets-section">
        <div className="section-header">
          <h2>Datasets</h2>
          {fileCount > 0 && (
            <span className="dataset-count">{fileCount} datasets</span>
          )}
        </div>

        {files.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ color: workspaceInfo.color }}>
              <Database size={48} />
            </div>
            <h3>No datasets yet</h3>
            <p>Upload data files to start analyzing in this workspace</p>
            <button 
              className="btn btn-primary"
              onClick={handleUploadClick}
            >
              <Upload size={18} />
              Upload Your First Dataset
            </button>
          </div>
        ) : (
          <div className="datasets-grid">
            {files.map((file) => {
              if (!file) return null;
              
              const displayName = file.name && file.name.length > 30 
                ? file.name.substring(0, 27) + '...' 
                : file.name || 'Unnamed File';
                
              return (
                <div key={file.id} className="dataset-card">
                  <div className="dataset-card-header">
                    <div className="dataset-icon" style={{ backgroundColor: `${workspaceInfo.color}15` }}>
                      <FileText size={20} color={workspaceInfo.color} />
                    </div>
                    <div className="dataset-info">
                      <h4 title={file.name}>{displayName}</h4>
                      <p>{formatFileSize(file.size)} • Uploaded {formatDate(file.uploadedAt)}</p>
                      {file.lastAccessed && (
                        <p className="dataset-access">Last accessed: {formatDate(file.lastAccessed)}</p>
                      )}
                    </div>
                    <div className="dataset-actions">
                      <button 
                        className="icon-btn"
                        onClick={() => handleViewFile(file)}
                        title="Preview"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        className="icon-btn"
                        onClick={() => handleExploreData(file)}
                        title="Explore"
                      >
                        <BarChart3 size={16} />
                      </button>
                      <button 
                        className="icon-btn"
                        title="Download"
                        onClick={() => handleDownloadFile(file)}
                      >
                        <Download size={16} />
                      </button>
                      <button 
                        className="icon-btn danger"
                        onClick={() => handleDeleteFile(file.id, file.name)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="dataset-card-footer">
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => handleExploreData(file)}
                    >
                      <BarChart3 size={14} />
                      Visualize
                    </button>
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => navigate(`/builder?workspace=${workspaceId || "general"}&dataset=${file.id}`)}
                    >
                      Add to Dashboard
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RECENT ACTIVITY */}
      {files.length > 0 && (
        <div className="recent-activity">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            {files
              .filter(file => file)
              .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))
              .slice(0, 5)
              .map((file) => (
                <div key={file.id} className="activity-item">
                  <div className="activity-icon" style={{ backgroundColor: `${workspaceInfo.color}15` }}>
                    <Upload size={16} color={workspaceInfo.color} />
                  </div>
                  <div className="activity-content">
                    <p>
                      <strong>{file.name || "File"}</strong> was uploaded
                    </p>
                    <span className="activity-time">
                      {formatDate(file.uploadedAt)} • {formatFileSize(file.size)}
                    </span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* DELETE WORKSPACE WARNING */}
      {isDeletable && files.length > 0 && (
        <div className="workspace-warning">
          <div className="warning-content">
            <AlertCircle size={20} />
            <div>
              <h4>Custom Workspace</h4>
              <p>
                This is a custom workspace. Deleting it will remove all {fileCount} dataset(s) 
                totaling {formatFileSize(totalFileSize)}. This action cannot be undone. sample waste
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceDashboard;