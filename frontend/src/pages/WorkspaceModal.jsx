// components/CreateWorkspaceModal.js
import React, { useState } from "react";
import { X, Folder, Hash, Type, FileText, Palette, Check } from "lucide-react";
import "../styles/createWorkspaceModal.css";

const CreateWorkspaceModal = ({ onClose, onSave }) => {
  const [workspaceName, setWorkspaceName] = useState("");
  const [description, setDescription] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [color, setColor] = useState("#4f46e5");
  const [icon, setIcon] = useState("Folder");
  const [errors, setErrors] = useState({});

  const colors = [
    "#4f46e5", // Indigo
    "#0891b2", // Cyan
    "#059669", // Emerald
    "#ea580c", // Orange
    "#dc2626", // Red
    "#9333ea", // Purple
    "#2563eb", // Blue
    "#ca8a04", // Yellow
    "#16a34a", // Green
    "#7c3aed", // Violet
  ];

  const icons = [
    { name: "Folder", value: "Folder" },
    { name: "Database", value: "Database" },
    { name: "BarChart3", value: "BarChart3" },
    { name: "LayoutGrid", value: "LayoutGrid" },
    { name: "Settings", value: "Settings" },
    { name: "FileText", value: "FileText" },
    { name: "Filter", value: "Filter" },
    { name: "Layers", value: "Layers" },
  ];

  const validateForm = () => {
    const newErrors = {};
    
    if (!workspaceName.trim()) {
      newErrors.name = "Workspace name is required";
    } else if (workspaceName.length > 50) {
      newErrors.name = "Name must be less than 50 characters";
    }
    
    if (!workspaceId.trim()) {
      newErrors.id = "Workspace ID is required";
    } else if (!/^[a-z0-9-]+$/.test(workspaceId)) {
      newErrors.id = "ID can only contain lowercase letters, numbers, and hyphens";
    } else if (workspaceId.length > 30) {
      newErrors.id = "ID must be less than 30 characters";
    }
    
    if (description.length > 200) {
      newErrors.description = "Description must be less than 200 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    onSave({
      name: workspaceName,
      id: workspaceId,
      description: description,
      color: color,
      icon: icon
    });
  };

  const generateIdFromName = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setWorkspaceName(name);
    
    // Auto-generate ID if not manually modified
    if (!workspaceId || workspaceId === generateIdFromName(workspaceName)) {
      setWorkspaceId(generateIdFromName(name));
    }
    
    // Clear error
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  const handleIdChange = (e) => {
    const id = e.target.value.toLowerCase();
    setWorkspaceId(id);
    
    // Clear error
    if (errors.id) {
      setErrors(prev => ({ ...prev, id: undefined }));
    }
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
    
    // Clear error
    if (errors.description) {
      setErrors(prev => ({ ...prev, description: undefined }));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="create-workspace-modal">
        <div className="modal-header">
          <h2>Create New Workspace</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>
              <Folder size={16} />
              Workspace Name *
            </label>
            <input
              type="text"
              placeholder="e.g., Marketing Analytics"
              value={workspaceName}
              onChange={handleNameChange}
              maxLength={50}
              className={errors.name ? 'error' : ''}
            />
            <div className="input-footer">
              <div className="char-count">{workspaceName.length}/50</div>
              {errors.name && <div className="error-message">{errors.name}</div>}
            </div>
          </div>

          <div className="form-group">
            <label>
              <Hash size={16} />
              Workspace ID *
            </label>
            <input
              type="text"
              placeholder="e.g., marketing-analytics"
              value={workspaceId}
              onChange={handleIdChange}
              maxLength={30}
              className={errors.id ? 'error' : ''}
            />
            <div className="input-footer">
              <div className="input-hint">
                Lowercase letters, numbers, and hyphens only
              </div>
              {errors.id && <div className="error-message">{errors.id}</div>}
            </div>
          </div>

          <div className="form-group">
            <label>
              <FileText size={16} />
              Description
            </label>
            <textarea
              placeholder="Describe what this workspace will be used for..."
              value={description}
              onChange={handleDescriptionChange}
              rows={3}
              maxLength={200}
              className={errors.description ? 'error' : ''}
            />
            <div className="input-footer">
              <div className="char-count">{description.length}/200</div>
              {errors.description && <div className="error-message">{errors.description}</div>}
            </div>
          </div>

          <div className="form-group">
            <label>
              <Palette size={16} />
              Color Theme
            </label>
            <div className="color-options">
              {colors.map((colorOption) => (
                <button
                  key={colorOption}
                  className={`color-option ${color === colorOption ? 'selected' : ''}`}
                  style={{ backgroundColor: colorOption }}
                  onClick={() => setColor(colorOption)}
                  title={colorOption}
                >
                  {color === colorOption && <Check size={12} color="white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Icon</label>
            <div className="icon-options">
              {icons.map((iconOption) => (
                <button
                  key={iconOption.value}
                  className={`icon-option ${icon === iconOption.value ? 'selected' : ''}`}
                  onClick={() => setIcon(iconOption.value)}
                  title={iconOption.name}
                >
                  <div className="icon-preview" style={{ color }}>
                    {iconOption.name}
                  </div>
                  <span className="icon-name">{iconOption.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group preview-group">
            <label>Workspace Preview</label>
            <div className="workspace-preview">
              <div 
                className="preview-icon" 
                style={{ backgroundColor: color }}
              >
                <Folder size={24} color="white" />
              </div>
              <div className="preview-content">
                <h3>{workspaceName || "Workspace Name"}</h3>
                <p>{description || "Workspace description will appear here"}</p>
                <div className="preview-meta">
                  <span className="preview-id">ID: {workspaceId || "workspace-id"}</span>
                  <span className="preview-tag custom">Custom</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={!workspaceName.trim() || !workspaceId.trim()}
          >
            Create Workspace
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkspaceModal;