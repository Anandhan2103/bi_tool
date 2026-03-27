// utils/workspaceStore.js

// Storage keys
export const WORKSPACE_STORAGE_KEYS = {
  CUSTOM_WORKSPACES: 'nutmeg_custom_workspaces',
  DATASETS: 'nutmeg_datasets',
  REPORTS: 'nutmeg_reports',
  DASHBOARDS: 'nutmeg_dashboards',
  VISUALIZATIONS: 'nutmeg_visualizations'
};

// Default workspaces configuration
export const DEFAULT_WORKSPACES = [
  {
    id: "sales",
    name: "Sales",
    description: "Revenue & pipeline analytics",
    icon: "DollarSign",
    color: "#4f46e5",
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "logistics",
    name: "Logistics",
    description: "Supply chain & delivery metrics",
    icon: "Truck",
    color: "#0891b2",
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "retail",
    name: "Retail",
    description: "Store & customer insights",
    icon: "ShoppingCart",
    color: "#059669",
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "manufacturing",
    name: "Manufacturing",
    description: "Production & quality KPIs",
    icon: "Factory",
    color: "#ea580c",
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "production",
    name: "Production",
    description: "Production efficiency & quality control",
    icon: "Package",
    color: "#dc2626",
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "telecom",
    name: "Telecom",
    description: "Network & usage analytics",
    icon: "Wifi",
    color: "#2563eb",
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "healthcare",
    name: "Healthcare",
    description: "Patient & operational analytics",
    icon: "HeartPulse",
    color: "#dc2626",
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "employee",
    name: "Employee Productivity",
    description: "Performance & efficiency metrics",
    icon: "Users",
    color: "#9333ea",
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "general",
    name: "General Workspace",
    description: "General purpose workspace for all your data",
    icon: "Home",
    color: "#6b7280",
    isDefault: true,
    isGeneral: true,
    createdAt: new Date().toISOString()
  }
];

// Initialize storage
export const initializeStorage = () => {
  try {
    // Initialize custom workspaces if not exists
    if (!localStorage.getItem(WORKSPACE_STORAGE_KEYS.CUSTOM_WORKSPACES)) {
      localStorage.setItem(WORKSPACE_STORAGE_KEYS.CUSTOM_WORKSPACES, JSON.stringify([]));
    }
    
    // Initialize datasets if not exists
    if (!localStorage.getItem(WORKSPACE_STORAGE_KEYS.DATASETS)) {
      localStorage.setItem(WORKSPACE_STORAGE_KEYS.DATASETS, JSON.stringify([]));
    }
    
    // Initialize reports if not exists
    if (!localStorage.getItem(WORKSPACE_STORAGE_KEYS.REPORTS)) {
      localStorage.setItem(WORKSPACE_STORAGE_KEYS.REPORTS, JSON.stringify([]));
    }
    
    // Initialize dashboards if not exists
    if (!localStorage.getItem(WORKSPACE_STORAGE_KEYS.DASHBOARDS)) {
      localStorage.setItem(WORKSPACE_STORAGE_KEYS.DASHBOARDS, JSON.stringify([]));
    }
    
    // Initialize visualizations if not exists
    if (!localStorage.getItem(WORKSPACE_STORAGE_KEYS.VISUALIZATIONS)) {
      localStorage.setItem(WORKSPACE_STORAGE_KEYS.VISUALIZATIONS, JSON.stringify([]));
    }
    
    return true;
  } catch (error) {
    console.error("Error initializing storage:", error);
    return false;
  }
};

// Get all workspaces (default + custom)
export const getWorkspaces = () => {
  try {
    initializeStorage();
    
    // Get custom workspaces
    const customWorkspaces = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.CUSTOM_WORKSPACES) || '[]');
    
    // Combine with default workspaces
    return [...DEFAULT_WORKSPACES, ...customWorkspaces];
  } catch (error) {
    console.error("Error getting workspaces:", error);
    return DEFAULT_WORKSPACES;
  }
};

// Get workspace by ID
export const getWorkspace = (workspaceId) => {
  try {
    const workspaces = getWorkspaces();
    const workspace = workspaces.find(ws => ws.id === workspaceId);
    
    if (!workspace) {
      // Return general workspace as fallback
      return workspaces.find(ws => ws.id === 'general') || DEFAULT_WORKSPACES.find(ws => ws.id === 'general');
    }
    
    return workspace;
  } catch (error) {
    console.error("Error getting workspace:", error);
    return null;
  }
};

// Create new custom workspace
export const createWorkspace = (workspaceData) => {
  try {
    initializeStorage();
    
    const workspaces = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.CUSTOM_WORKSPACES) || '[]');
    
    // Generate ID if not provided
    const workspaceId = workspaceData.id || 
      workspaceData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // Check if workspace already exists
    const exists = workspaces.some(ws => ws.id === workspaceId) || 
                  DEFAULT_WORKSPACES.some(ws => ws.id === workspaceId);
    
    if (exists) {
      throw new Error("Workspace already exists");
    }
    
    const newWorkspace = {
      ...workspaceData,
      id: workspaceId,
      name: workspaceData.name,
      description: workspaceData.description || 'Custom workspace',
      icon: workspaceData.icon || 'Settings',
      color: workspaceData.color || '#4f46e5',
      isDefault: false,
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    workspaces.push(newWorkspace);
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.CUSTOM_WORKSPACES, JSON.stringify(workspaces));
    
    return newWorkspace;
  } catch (error) {
    console.error("Error creating workspace:", error);
    throw error;
  }
};

// Update workspace
export const updateWorkspace = (workspaceId, updates) => {
  try {
    const workspaces = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.CUSTOM_WORKSPACES) || '[]');
    const workspaceIndex = workspaces.findIndex(ws => ws.id === workspaceId);
    
    if (workspaceIndex === -1) {
      throw new Error("Workspace not found");
    }
    
    workspaces[workspaceIndex] = {
      ...workspaces[workspaceIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.CUSTOM_WORKSPACES, JSON.stringify(workspaces));
    
    return workspaces[workspaceIndex];
  } catch (error) {
    console.error("Error updating workspace:", error);
    throw error;
  }
};

// Delete workspace
export const deleteWorkspace = (workspaceId) => {
  try {
    // Prevent deletion of default workspaces
    const isDefault = DEFAULT_WORKSPACES.some(ws => ws.id === workspaceId);
    if (isDefault) {
      throw new Error("Default workspaces cannot be deleted");
    }
    
    // Get custom workspaces
    const workspaces = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.CUSTOM_WORKSPACES) || '[]');
    const workspaceIndex = workspaces.findIndex(ws => ws.id === workspaceId);
    
    if (workspaceIndex === -1) {
      throw new Error("Workspace not found");
    }
    
    // Remove workspace from custom workspaces
    workspaces.splice(workspaceIndex, 1);
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.CUSTOM_WORKSPACES, JSON.stringify(workspaces));
    
    // Delete all associated data
    deleteWorkspaceData(workspaceId);
    
    return true;
  } catch (error) {
    console.error("Error deleting workspace:", error);
    throw error;
  }
};

// Delete all data for a workspace
const deleteWorkspaceData = (workspaceId) => {
  try {
    // Delete datasets
    const allDatasets = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.DATASETS) || '[]');
    const updatedDatasets = allDatasets.filter(ds => ds.workspaceId !== workspaceId);
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.DATASETS, JSON.stringify(updatedDatasets));
    
    // Delete reports
    const allReports = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.REPORTS) || '[]');
    const updatedReports = allReports.filter(report => report.workspaceId !== workspaceId);
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.REPORTS, JSON.stringify(updatedReports));
    
    // Delete dashboards
    const allDashboards = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.DASHBOARDS) || '[]');
    const updatedDashboards = allDashboards.filter(db => db.workspaceId !== workspaceId);
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.DASHBOARDS, JSON.stringify(updatedDashboards));
    
    // Delete visualizations
    const allVisualizations = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.VISUALIZATIONS) || '[]');
    const updatedVisualizations = allVisualizations.filter(viz => viz.workspaceId !== workspaceId);
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.VISUALIZATIONS, JSON.stringify(updatedVisualizations));
    
    return true;
  } catch (error) {
    console.error("Error deleting workspace data:", error);
    throw error;
  }
};

// Get datasets for a workspace
export const getWorkspaceDatasets = (workspaceId) => {
  try {
    initializeStorage();
    const allDatasets = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.DATASETS) || '[]');
    return allDatasets.filter(ds => ds.workspaceId === workspaceId);
  } catch (error) {
    console.error("Error getting workspace datasets:", error);
    return [];
  }
};

// Get reports for a workspace
export const getWorkspaceReports = (workspaceId) => {
  try {
    initializeStorage();
    const allReports = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.REPORTS) || '[]');
    return allReports.filter(report => report.workspaceId === workspaceId);
  } catch (error) {
    console.error("Error getting workspace reports:", error);
    return [];
  }
};

// Get dashboards for a workspace
export const getWorkspaceDashboards = (workspaceId) => {
  try {
    initializeStorage();
    const allDashboards = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.DASHBOARDS) || '[]');
    return allDashboards.filter(db => db.workspaceId === workspaceId);
  } catch (error) {
    console.error("Error getting workspace dashboards:", error);
    return [];
  }
};

// Get visualizations for a workspace
export const getWorkspaceVisualizations = (workspaceId) => {
  try {
    initializeStorage();
    const allVisualizations = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.VISUALIZATIONS) || '[]');
    return allVisualizations.filter(viz => viz.workspaceId === workspaceId);
  } catch (error) {
    console.error("Error getting workspace visualizations:", error);
    return [];
  }
};

// Add dataset to workspace
export const addDatasetToWorkspace = (workspaceId, dataset) => {
  try {
    initializeStorage();
    
    const allDatasets = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.DATASETS) || '[]');
    
    const newDataset = {
      ...dataset,
      id: `dataset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workspaceId,
      uploadedAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      createdBy: "User",
      updatedAt: new Date().toISOString()
    };
    
    allDatasets.push(newDataset);
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.DATASETS, JSON.stringify(allDatasets));
    
    return newDataset;
  } catch (error) {
    console.error("Error adding dataset:", error);
    throw error;
  }
};

// Add report to workspace
export const addReportToWorkspace = (workspaceId, report) => {
  try {
    initializeStorage();
    
    const allReports = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.REPORTS) || '[]');
    
    const newReport = {
      ...report,
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workspaceId,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "User"
    };
    
    allReports.push(newReport);
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.REPORTS, JSON.stringify(allReports));
    
    // Also save to visualizations
    const allVisualizations = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.VISUALIZATIONS) || '[]');
    allVisualizations.push({
      ...newReport,
      type: 'report'
    });
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.VISUALIZATIONS, JSON.stringify(allVisualizations));
    
    return newReport;
  } catch (error) {
    console.error("Error adding report:", error);
    throw error;
  }
};

// Add dashboard to workspace
export const addDashboardToWorkspace = (workspaceId, dashboard) => {
  try {
    initializeStorage();
    
    const allDashboards = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.DASHBOARDS) || '[]');
    
    const newDashboard = {
      ...dashboard,
      id: `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workspaceId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "User"
    };
    
    allDashboards.push(newDashboard);
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.DASHBOARDS, JSON.stringify(allDashboards));
    
    return newDashboard;
  } catch (error) {
    console.error("Error adding dashboard:", error);
    throw error;
  }
};

// Update dataset
export const updateDataset = (datasetId, updates) => {
  try {
    const allDatasets = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.DATASETS) || '[]');
    const datasetIndex = allDatasets.findIndex(ds => ds.id === datasetId);
    
    if (datasetIndex === -1) {
      throw new Error("Dataset not found");
    }
    
    allDatasets[datasetIndex] = {
      ...allDatasets[datasetIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.DATASETS, JSON.stringify(allDatasets));
    
    return allDatasets[datasetIndex];
  } catch (error) {
    console.error("Error updating dataset:", error);
    throw error;
  }
};

// Update report
export const updateReport = (reportId, updates) => {
  try {
    const allReports = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.REPORTS) || '[]');
    const reportIndex = allReports.findIndex(r => r.id === reportId);
    
    if (reportIndex === -1) {
      throw new Error("Report not found");
    }
    
    allReports[reportIndex] = {
      ...allReports[reportIndex],
      ...updates,
      lastModified: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.REPORTS, JSON.stringify(allReports));
    
    return allReports[reportIndex];
  } catch (error) {
    console.error("Error updating report:", error);
    throw error;
  }
};

// Update dashboard
export const updateDashboard = (dashboardId, updates) => {
  try {
    const allDashboards = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.DASHBOARDS) || '[]');
    const dashboardIndex = allDashboards.findIndex(db => db.id === dashboardId);
    
    if (dashboardIndex === -1) {
      throw new Error("Dashboard not found");
    }
    
    allDashboards[dashboardIndex] = {
      ...allDashboards[dashboardIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.DASHBOARDS, JSON.stringify(allDashboards));
    
    return allDashboards[dashboardIndex];
  } catch (error) {
    console.error("Error updating dashboard:", error);
    throw error;
  }
};

// Delete dataset
export const deleteDataset = (datasetId) => {
  try {
    const allDatasets = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.DATASETS) || '[]');
    const updatedDatasets = allDatasets.filter(ds => ds.id !== datasetId);
    
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.DATASETS, JSON.stringify(updatedDatasets));
    
    return true;
  } catch (error) {
    console.error("Error deleting dataset:", error);
    throw error;
  }
};

// Delete report
export const deleteReport = (reportId) => {
  try {
    const allReports = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.REPORTS) || '[]');
    const updatedReports = allReports.filter(r => r.id !== reportId);
    
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.REPORTS, JSON.stringify(updatedReports));
    
    // Also delete from visualizations
    const allVisualizations = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.VISUALIZATIONS) || '[]');
    const updatedVisualizations = allVisualizations.filter(viz => viz.id !== reportId);
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.VISUALIZATIONS, JSON.stringify(updatedVisualizations));
    
    return true;
  } catch (error) {
    console.error("Error deleting report:", error);
    throw error;
  }
};

// Delete dashboard
export const deleteDashboard = (dashboardId) => {
  try {
    const allDashboards = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.DASHBOARDS) || '[]');
    const updatedDashboards = allDashboards.filter(db => db.id !== dashboardId);
    
    localStorage.setItem(WORKSPACE_STORAGE_KEYS.DASHBOARDS, JSON.stringify(updatedDashboards));
    
    return true;
  } catch (error) {
    console.error("Error deleting dashboard:", error);
    throw error;
  }
};

// Get workspace statistics
export const getWorkspaceStats = (workspaceId) => {
  try {
    const datasets = getWorkspaceDatasets(workspaceId);
    const reports = getWorkspaceReports(workspaceId);
    const dashboards = getWorkspaceDashboards(workspaceId);
    
    const totalSize = datasets.reduce((acc, ds) => acc + (ds.size || 0), 0);
    const lastActivity = Math.max(
      ...datasets.map(d => new Date(d.updatedAt || d.uploadedAt).getTime()),
      ...reports.map(r => new Date(r.updatedAt || r.createdAt).getTime()),
      ...dashboards.map(db => new Date(db.updatedAt || db.createdAt).getTime()),
      0
    );
    
    return {
      datasets: datasets.length,
      reports: reports.length,
      dashboards: dashboards.length,
      totalSize,
      lastActivity: lastActivity > 0 ? new Date(lastActivity) : null
    };
  } catch (error) {
    console.error("Error getting workspace stats:", error);
    return {
      datasets: 0,
      reports: 0,
      dashboards: 0,
      totalSize: 0,
      lastActivity: null
    };
  }
};

// Get all datasets across all workspaces
export const getAllDatasets = () => {
  try {
    initializeStorage();
    return JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.DATASETS) || '[]');
  } catch (error) {
    console.error("Error getting all datasets:", error);
    return [];
  }
};

// Get all reports across all workspaces
export const getAllReports = () => {
  try {
    initializeStorage();
    return JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.REPORTS) || '[]');
  } catch (error) {
    console.error("Error getting all reports:", error);
    return [];
  }
};

// Get all dashboards across all workspaces
export const getAllDashboards = () => {
  try {
    initializeStorage();
    return JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEYS.DASHBOARDS) || '[]');
  } catch (error) {
    console.error("Error getting all dashboards:", error);
    return [];
  }
};

// Search across workspace content
export const searchWorkspaceContent = (workspaceId, query) => {
  try {
    const datasets = getWorkspaceDatasets(workspaceId);
    const reports = getWorkspaceReports(workspaceId);
    const dashboards = getWorkspaceDashboards(workspaceId);
    
    const lowerQuery = query.toLowerCase();
    
    const filteredDatasets = datasets.filter(ds => 
      ds.name.toLowerCase().includes(lowerQuery) ||
      ds.description.toLowerCase().includes(lowerQuery) ||
      ds.type.toLowerCase().includes(lowerQuery)
    );
    
    const filteredReports = reports.filter(r => 
      r.name.toLowerCase().includes(lowerQuery) ||
      r.description.toLowerCase().includes(lowerQuery) ||
      r.dataset.toLowerCase().includes(lowerQuery) ||
      (r.type && r.type.toLowerCase().includes(lowerQuery))
    );
    
    const filteredDashboards = dashboards.filter(db => 
      db.name.toLowerCase().includes(lowerQuery) ||
      db.description.toLowerCase().includes(lowerQuery)
    );
    
    return {
      datasets: filteredDatasets,
      reports: filteredReports,
      dashboards: filteredDashboards,
      total: filteredDatasets.length + filteredReports.length + filteredDashboards.length
    };
  } catch (error) {
    console.error("Error searching workspace content:", error);
    return {
      datasets: [],
      reports: [],
      dashboards: [],
      total: 0
    };
  }
};

// Get recent activity for workspace
export const getRecentActivity = (workspaceId, limit = 10) => {
  try {
    const datasets = getWorkspaceDatasets(workspaceId);
    const reports = getWorkspaceReports(workspaceId);
    const dashboards = getWorkspaceDashboards(workspaceId);
    
    // Combine all activities
    const activities = [
      ...datasets.map(ds => ({
        type: 'dataset',
        id: ds.id,
        name: ds.name,
        description: 'Dataset uploaded',
        timestamp: new Date(ds.uploadedAt),
        icon: 'Database',
        color: '#4f46e5'
      })),
      ...reports.map(r => ({
        type: 'report',
        id: r.id,
        name: r.name,
        description: 'Report created',
        timestamp: new Date(r.createdAt),
        icon: 'BarChart3',
        color: '#059669'
      })),
      ...reports.filter(r => r.lastModified && r.lastModified !== r.createdAt).map(r => ({
        type: 'report',
        id: r.id,
        name: r.name,
        description: 'Report updated',
        timestamp: new Date(r.lastModified),
        icon: 'Edit',
        color: '#ca8a04'
      })),
      ...dashboards.map(db => ({
        type: 'dashboard',
        id: db.id,
        name: db.name,
        description: 'Dashboard created',
        timestamp: new Date(db.createdAt),
        icon: 'LayoutGrid',
        color: '#0891b2'
      })),
      ...dashboards.filter(db => db.updatedAt && db.updatedAt !== db.createdAt).map(db => ({
        type: 'dashboard',
        id: db.id,
        name: db.name,
        description: 'Dashboard updated',
        timestamp: new Date(db.updatedAt),
        icon: 'Edit',
        color: '#ca8a04'
      }))
    ];
    
    // Sort by timestamp (newest first)
    activities.sort((a, b) => b.timestamp - a.timestamp);
    
    // Return limited results
    return activities.slice(0, limit);
  } catch (error) {
    console.error("Error getting recent activity:", error);
    return [];
  }
};

// Get workspace storage usage
export const getWorkspaceStorageUsage = (workspaceId) => {
  try {
    const datasets = getWorkspaceDatasets(workspaceId);
    const reports = getWorkspaceReports(workspaceId);
    const dashboards = getWorkspaceDashboards(workspaceId);
    
    const datasetSize = datasets.reduce((acc, ds) => acc + (ds.size || 0), 0);
    const reportSize = reports.reduce((acc, r) => acc + (r.size || 0), 0);
    const dashboardSize = dashboards.reduce((acc, db) => acc + (db.size || 0), 0);
    
    const totalSize = datasetSize + reportSize + dashboardSize;
    
    // Convert to MB for display
    const toMB = (bytes) => (bytes / (1024 * 1024)).toFixed(2);
    
    return {
      datasets: toMB(datasetSize),
      reports: toMB(reportSize),
      dashboards: toMB(dashboardSize),
      total: toMB(totalSize),
      totalBytes: totalSize
    };
  } catch (error) {
    console.error("Error getting storage usage:", error);
    return {
      datasets: '0',
      reports: '0',
      dashboards: '0',
      total: '0',
      totalBytes: 0
    };
  }
};