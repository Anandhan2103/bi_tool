// UploadData.jsx - SIMPLE CLEAN VERSION
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Database,
  ArrowLeft,
  Folder,
  FileUp,
  X,
  ChevronDown,
  CheckCircle,
  Sparkles,
  Building,
  PlusCircle,
  RefreshCw,
  Cloud,
  Server,
  Shield,
  BarChart3,
  Eye,
  Download,
  HardDrive
} from 'lucide-react';

import api from '../api/api';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';
import '../styles/upload-data.css';

const UploadData = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [uploadResponses, setUploadResponses] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  
  // Workspace states
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load workspaces
  const loadWorkspaces = async () => {
    try {
      setLoadingWorkspaces(true);
      
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await api.get("/workspaces");
      const workspacesData = response.data || [];
      
      if (workspacesData.length > 0) {
        setWorkspaces(workspacesData);
        
        // Check URL for workspace_id
        const searchParams = new URLSearchParams(location.search);
        const workspaceId = searchParams.get('workspace_id');
        
        if (workspaceId) {
          const workspaceFromUrl = workspacesData.find(w => w.id === workspaceId);
          if (workspaceFromUrl) {
            setSelectedWorkspace(workspaceFromUrl);
          }
        } else {
          const generalWorkspace = workspacesData.find(w => w.isGeneral);
          setSelectedWorkspace(generalWorkspace || workspacesData[0]);
        }
      }
    } catch (error) {
      console.error('Error loading workspaces:', error);
      setFileError('Unable to load workspaces. Please try again.');
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, [location.search]);

  const handleFileChange = async (e) => {
    setFileError('');
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const validFiles = [];
      const errors = [];

      for (const selectedFile of newFiles) {
        if (selectedFile.size > 100 * 1024 * 1024) {
          errors.push(`${selectedFile.name}: File size must be less than 100MB`);
          continue;
        }
        
        const validTypes = ['.csv', '.xlsx', '.xls', '.json'];
        const fileExtension = '.' + selectedFile.name.split('.').pop().toLowerCase();
        
        if (!validTypes.includes(fileExtension)) {
          errors.push(`${selectedFile.name}: Unsupported file type. Use CSV, Excel, or JSON`);
          continue;
        }

        const isDuplicate = files.some(f => f.name === selectedFile.name);
        if (isDuplicate) {
          errors.push(`${selectedFile.name}: File with same name already selected`);
          continue;
        }

        validFiles.push(selectedFile);
      }

      if (errors.length > 0) {
        setFileError(errors.join('; '));
      }

      if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles]);
      }
    }
  };

  const removeFile = (fileName) => {
    setFiles(prev => prev.filter(file => file.name !== fileName));
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      setFileError('Please select files to upload');
      return;
    }
    
    if (!selectedWorkspace) {
      setFileError('Please select a workspace first');
      return;
    }
    
    setUploading(true);
    setFileError('');
    setUploadProgress({});

    const uploadedResults = [];
    const allResponses = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { progress: 0, status: 'uploading' }
        }));

        const formData = new FormData();
        formData.append('file', file);
        formData.append('workspace_id', selectedWorkspace.id);

        const response = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || file.size)
            );
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: { progress, status: "uploading" }
            }));
          }
        });

        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { progress: 100, status: 'completed' }
        }));

        uploadedResults.push(file.name);
        allResponses.push(response.data);
      }

      setUploadResponses(allResponses);
      setUploadedFiles(uploadedResults);
      setShowSuccess(true);
      
      // Store uploaded datasets
      localStorage.setItem('last_uploaded_datasets', JSON.stringify(allResponses));

    } catch (err) {
      console.error('Upload error:', err);
      setFileError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFiles([]);
    setUploadedFiles([]);
    setFileError('');
    setUploadResponses([]);
    setUploadProgress({});
    setShowSuccess(false);
  };

  const handleBack = () => {
    if (selectedWorkspace?.id) {
      navigate(`/workspace/${selectedWorkspace.id}`);
    } else {
      navigate('/workspaces');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      const validFiles = [];
      const errors = [];
      
      for (const droppedFile of droppedFiles) {
        if (droppedFile.size > 100 * 1024 * 1024) {
          errors.push(`${droppedFile.name}: File size must be less than 100MB`);
          continue;
        }
        
        const validTypes = ['.csv', '.xlsx', '.xls', '.json'];
        const fileExtension = '.' + droppedFile.name.split('.').pop().toLowerCase();
        
        if (!validTypes.includes(fileExtension)) {
          errors.push(`${droppedFile.name}: Unsupported file type. Use CSV, Excel, or JSON`);
          continue;
        }

        const isDuplicate = files.some(f => f.name === droppedFile.name);
        if (isDuplicate) {
          errors.push(`${droppedFile.name}: File with same name already selected`);
          continue;
        }

        validFiles.push(droppedFile);
      }

      if (errors.length > 0) {
        setFileError(errors.join('; '));
      }

      if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles]);
      }
    }
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    const iconColors = {
      csv: '#10b981',
      xlsx: '#0ea5e9',
      json: '#f59e0b',
      xls: '#0ea5e9'
    };
    return iconColors[extension] || '#6b7280';
  };

  const getWorkspaceIcon = (workspace) => {
    if (!workspace) return <Folder size={18} />;
    if (workspace.isGeneral) return <Building size={18} />;
    return <Folder size={18} />;
  };

  const getWorkspaceColor = (workspace) => {
    if (!workspace) return { bg: '#f3f4f6', color: '#6b7280' };
    if (workspace.isGeneral) return { bg: '#d1fae5', color: '#065f46' };
    return { bg: '#e0e7ff', color: '#4f46e5' };
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleCreateWorkspace = async (workspaceData) => {
    try {
      const response = await api.post("/workspaces", workspaceData);
      const newWorkspace = response.data;
      setWorkspaces(prev => [...prev, newWorkspace]);
      setSelectedWorkspace(newWorkspace);
      setShowCreateModal(false);
      setFileError('');
    } catch (error) {
      setFileError('Failed to create workspace. Please try again.');
    }
  };

  return (
    <div className="upload-page-simple">
      {/* HEADER */}
      <div className="upload-header">
        <div className="header-left">
          <button className="back-btn" onClick={handleBack}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Upload Dataset</h1>
            <p>Add your datasets for analysis</p>
          </div>
        </div>
        
        {/* WORKSPACE SELECTOR */}
        <div className="workspace-selector-simple">
          <div className="selector-label">
            <Folder size={16} />
            <span>Workspace:</span>
          </div>
          
          <div className="dropdown-container">
            <button 
              className="workspace-toggle"
              onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
              disabled={files.length > 0}
            >
              <div className="selected-workspace">
                {loadingWorkspaces ? (
                  <span>Loading...</span>
                ) : selectedWorkspace ? (
                  <>
                    <div className="workspace-indicator" style={{ 
                      backgroundColor: getWorkspaceColor(selectedWorkspace).color
                    }} />
                    <span>{selectedWorkspace.name}</span>
                    {selectedWorkspace.isGeneral && (
                      <span className="general-tag">Default</span>
                    )}
                  </>
                ) : (
                  <span>Select workspace</span>
                )}
                <ChevronDown size={16} />
              </div>
            </button>

            {showWorkspaceDropdown && (
              <div className="dropdown-menu">
                <div className="menu-section">
                  <div className="section-title">Workspaces</div>
                  {workspaces.map(workspace => (
                    <button
                      key={workspace.id}
                      className={`workspace-item ${selectedWorkspace?.id === workspace.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedWorkspace(workspace);
                        setShowWorkspaceDropdown(false);
                      }}
                    >
                      <div className="item-icon" style={{ 
                        backgroundColor: getWorkspaceColor(workspace).bg,
                        color: getWorkspaceColor(workspace).color 
                      }}>
                        {getWorkspaceIcon(workspace)}
                      </div>
                      <div className="item-info">
                        <div className="item-name">{workspace.name}</div>
                        <div className="item-desc">
                          {workspace.isGeneral ? 'Default workspace' : 'Custom workspace'}
                        </div>
                      </div>
                      {selectedWorkspace?.id === workspace.id && (
                        <CheckCircle size={16} className="check" />
                      )}
                    </button>
                  ))}
                </div>
                
                <div className="menu-section">
                  <button
                    className="workspace-item create"
                    onClick={() => {
                      setShowWorkspaceDropdown(false);
                      setShowCreateModal(true);
                    }}
                  >
                    <div className="item-icon">
                      <PlusCircle size={18} />
                    </div>
                    <div className="item-info">
                      <div className="item-name">Create New</div>
                      <div className="item-desc">Add a new workspace</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="upload-content">
        {/* LEFT SIDE - UPLOAD AREA */}
        <div className="upload-area">
          {/* DROPZONE */}
          {!showSuccess && (
            <div 
              className="dropzone"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="dropzone-icon">
                <Upload size={40} />
              </div>
              <h3>Drag and drop files here</h3>
              <p className="subtitle">Or choose a file</p>
              <div className="file-info">
                <p>Accepted formats: CSV, Excel, JSON</p>
                <p>Maximum file size: 100MB</p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls,.json"
                onChange={handleFileChange}
                multiple
              />
              
              <button className="choose-btn">
                Choose Files
              </button>
            </div>
          )}

          {/* ERROR MESSAGE */}
          {fileError && (
            <div className="error-message">
              <AlertCircle size={18} />
              <div>
                <strong>Error</strong>
                <p>{fileError}</p>
              </div>
            </div>
          )}

          {/* SELECTED FILES */}
          {files.length > 0 && !showSuccess && (
            <div className="files-section">
              <div className="files-header">
                <h3>Selected Files ({files.length})</h3>
                <button className="clear-btn" onClick={resetUpload}>
                  Clear all
                </button>
              </div>
              
              <div className="files-list">
                {files.map((file, index) => {
                  const progress = uploadProgress[file.name]?.progress || 0;
                  
                  return (
                    <div key={index} className="file-item">
                      <div className="file-info">
                        <div className="file-header">
                          <FileText size={18} color={getFileIcon(file.name)} />
                          <span className="file-name">{file.name}</span>
                          <span className="file-size">{formatFileSize(file.size)}</span>
                        </div>
                        
                        {uploadProgress[file.name] && (
                          <div className="progress-container">
                            <div className="progress-bar">
                              <div 
                                className="progress-fill"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="progress-text">{progress}%</span>
                          </div>
                        )}
                      </div>
                      
                      <button
                        className="remove-btn"
                        onClick={() => removeFile(file.name)}
                        disabled={uploading}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
              
              {/* UPLOAD BUTTONS */}
              <div className="upload-buttons">
                <button 
                  className="cancel-btn"
                  onClick={resetUpload}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button 
                  className="upload-btn"
                  onClick={uploadFiles}
                  disabled={uploading || files.length === 0 || !selectedWorkspace}
                >
                  {uploading ? (
                    <>
                      <RefreshCw size={16} className="spinning" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FileUp size={16} />
                      Upload Files
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS MESSAGE - Payment Style */}
          {showSuccess && (
            <div className="success-container">
              <div className="success-icon">
                <CheckCircle2 size={48} />
              </div>
              
              <div className="success-content">
                <h2>Upload Successful!</h2>
                <p className="success-message">
                  {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} uploaded to {selectedWorkspace?.name}
                </p>
                
                <div className="uploaded-files">
                  {uploadResponses.map((response, index) => (
                    <div key={index} className="uploaded-file">
                      <div className="file-type">
                        <FileText size={16} color={getFileIcon(response.name)} />
                        <span>{response.name.split('.').pop().toUpperCase()}</span>
                      </div>
                      <div className="file-details">
                        <strong>{response.name}</strong>
                        <span>{formatFileSize(response.size)} • Uploaded</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="success-buttons">
                  <button 
                    className="primary-btn"
                    onClick={() => {
                      if (uploadResponses.length === 1) {
                        navigate(`/visual-builder?datasetId=${uploadResponses[0].id}`);
                      } else if (selectedWorkspace?.id) {
                        navigate(`/workspace/${selectedWorkspace.id}`);
                      }
                    }}
                  >
                    <Sparkles size={16} />
                    {uploadResponses.length === 1 ? 'Open in Visual Builder' : 'View in Workspace'}
                  </button>
                  <button 
                    className="secondary-btn"
                    onClick={resetUpload}
                  >
                    <Upload size={16} />
                    Upload More Files
                  </button>
                </div>
                
                <div className="success-note">
                  <CheckCircle size={14} />
                  <span>Your files are now ready for analysis</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDE - DATABASE CONNECTORS */}
        <div className="connectors-sidebar">
          <div className="connectors-header">
            <Database size={20} />
            <div>
              <h3>Database Connectors</h3>
              <p>Connect to external data sources</p>
            </div>
          </div>
          
          <div className="connectors-list">
            {[
              { name: 'MySQL', color: '#00758F', icon: <Database size={16} />, status: 'Available' },
              { name: 'PostgreSQL', color: '#336791', icon: <Database size={16} />, status: 'Available' },
              { name: 'Snowflake', color: '#29B5E8', icon: <Cloud size={16} />, status: 'Enterprise' },
              { name: 'BigQuery', color: '#4285F4', icon: <Cloud size={16} />, status: 'Enterprise' },
              { name: 'MongoDB', color: '#47A248', icon: <Database size={16} />, status: 'Available' },
              { name: 'SQL Server', color: '#CC2927', icon: <Server size={16} />, status: 'Available' }
            ].map((db, index) => (
              <div key={index} className="connector-item">
                <div className="connector-icon" style={{ color: db.color }}>
                  {db.icon}
                </div>
                <div className="connector-details">
                  <span className="connector-name">{db.name}</span>
                  <span className={`connector-status ${db.status === 'Enterprise' ? 'enterprise' : 'available'}`}>
                    {db.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="connectors-footer">
            <Shield size={14} />
            <span>All connections are secured with TLS encryption</span>
          </div>
        </div>
      </div>

      {/* CREATE WORKSPACE MODAL */}
      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateWorkspace}
        />
      )}
    </div>
  );
};

export default UploadData;