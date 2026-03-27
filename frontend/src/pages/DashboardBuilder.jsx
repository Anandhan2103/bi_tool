// =========================================================
// DASHBOARD BUILDER – PRODUCTION GRADE
// Enterprise SaaS Edition - FULLY OPTIMIZED
// =========================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Layout,
  Trash2,
  Plus,
  Download,
  Database,
  Folder,
  Search,
  X,
  BarChart3,
  PieChart,
  LineChart,
  Table as TableIcon,
  Grid,
  Layers,
  Filter,
  FileText,
  ChevronDown
} from "lucide-react";
import api from "../api/api";
import ChartWidget from "../components/ChartWidget";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "../styles/dashboard-builder.css";

import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
const ResponsiveGridLayout = WidthProvider(Responsive);

// ===== ERROR BOUNDARY =====
class WidgetErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="widget-error">
          Failed to load widget
        </div>
      );
    }

    return this.props.children;
  }
}

const DashboardBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const workspaceId = queryParams.get("workspace");
  const mode = queryParams.get("mode") || "edit";

  // ===== REFS =====
  const canvasRef = useRef(null);

  // ===== STATE =====
  const [dashboardName, setDashboardName] = useState("New Dashboard");
  const [widgets, setWidgets] = useState([]);
  const [availableReports, setAvailableReports] = useState([]);
  const [workspaceInfo, setWorkspaceInfo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showReportPanel, setShowReportPanel] = useState(true);
  const [draggedReport, setDraggedReport] = useState(null);

  // Global filter state
  const [dashboardFilters, setDashboardFilters] = useState({});
  const [filterSchema, setFilterSchema] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([]);
  
  // View mode state
  const [viewMode, setViewMode] = useState(mode);
  
  // Workspace dropdown state
  const [wsOpen, setWsOpen] = useState(false);

  // Undo/Redo state
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Sticky header on scroll
  const [headerScrolled, setHeaderScrolled] = useState(false);

  // Toast state
  const [toasts, setToasts] = useState([]);

  // Unsaved changes detection
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Real last saved time
  const [lastSaved, setLastSaved] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);


  // ===== TOAST SYSTEM =====
  const showToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // ===== UNSAVED CHANGES PROTECTION =====
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // ===== LOCAL DRAFT RECOVERY =====
  useEffect(() => {
    if (!workspaceId) return;

    const draftKey = `dashboard_draft_${workspaceId}_${id || "new"}`;
    localStorage.setItem(draftKey, JSON.stringify({
      name: dashboardName,
      widgets,
      filterSchema
    }));
  }, [dashboardName, widgets, filterSchema, workspaceId, id]);

  // ===== EFFECTS =====

  // Update viewMode when mode changes
  useEffect(() => {
    const newMode = new URLSearchParams(location.search).get("mode") || "edit";
    setViewMode(newMode);
  }, [location.search]);

  // Handle click outside workspace dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".workspace-dropdown")) {
        setWsOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Sticky scroll effect with ref
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleScroll = () => {
      setHeaderScrolled(canvas.scrollTop > 10);
    };

    canvas.addEventListener("scroll", handleScroll);
    return () => canvas.removeEventListener("scroll", handleScroll);
  }, []);

  // ===== DATA LOADING =====
  const loadData = useCallback(async () => {
    try {
      // Load all workspaces (Now it runs even if no workspaceId is selected)
      const wsRes = await api.get("/workspaces");
      setWorkspaces(wsRes.data);

      if (!workspaceId) {
        setWorkspaceInfo(null);
        setAvailableReports([]);
        return;
      }

      // Load draft if exists
      const draftKey = `dashboard_draft_${workspaceId}_${id || "new"}`;
      const savedDraft = localStorage.getItem(draftKey);

      // Find active workspace
      const activeWorkspace = wsRes.data.find(
        (w) => String(w.id) === String(workspaceId)
      );
      setWorkspaceInfo(activeWorkspace || null);

      if (!activeWorkspace) return;

      // Load reports for workspace
      const reportRes = await api.get(`workspaces/${workspaceId}/reports`);

      setAvailableReports(
        Array.isArray(reportRes.data)
          ? reportRes.data
          : reportRes.data?.reports || []
      );

      // Load dataset metadata
      try {
        const datasetsRes = await api.get(`workspaces/${workspaceId}/datasets`);

        if (datasetsRes.data.length > 0) {
          const firstDataset = datasetsRes.data[0];
          const metaRes = await api.get(`datasets/${firstDataset.id}/metadata`);

          const formattedColumns = Object.keys(metaRes.data).map(col => ({
            name: col,
            dataset_id: firstDataset.id
          }));

          setAvailableColumns(formattedColumns);
        } else {
          setAvailableColumns([]);
        }
      } catch (err) {
        console.log("Metadata not found");
      }

      // Load existing dashboard
      if (id) {
        const dashRes = await api.get(`dashboards/${id}`);
        const dash = dashRes.data;

        setDashboardName(dash.name || "Untitled Dashboard");

        const rawLayout = dash.layout || dash.widgets || [];

        const dashboardWidgets = rawLayout.map((item, index) => ({
          i: item.i || `${item.report_id || item.reportId}_${index}`,
          x: item.x ?? 0,
          y: item.y ?? index * 4,
          w: item.w ?? 6,
          h: item.h ?? 4,
          report_id: String(item.report_id || item.reportId || ""),
          dataset_id: item.dataset_id || item.datasetId || null
        }));

        setWidgets(dashboardWidgets);
        setFilterSchema(dash.global_filters || []);
        setIsEditing(true);

        setHistory([dashboardWidgets]);
        setHistoryIndex(0);

        // Clear draft after loading saved dashboard
        localStorage.removeItem(draftKey);
      } else if (savedDraft && !id) {
        // Load draft for new dashboard
        let draft;
        try {
          draft = JSON.parse(savedDraft);
        } catch {
          localStorage.removeItem(draftKey);
          return;
        }
        setDashboardName(draft.name || "New Dashboard");
        setWidgets(draft.widgets || []);
        setFilterSchema(draft.filterSchema || []);
        setHasUnsavedChanges(true);
        showToast("Draft restored", "info");
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
      showToast("Failed to load dashboard", "error");
    }
  }, [id, workspaceId, showToast]);

  // ✅ FIX: Removed the `if (!workspaceId) return;` block so the workspaces API always fires on load
  useEffect(() => {
    loadData();
  }, [id, workspaceId, loadData]);

  // ===== HISTORY MANAGEMENT =====
  const pushToHistory = useCallback((newWidgets) => {
    setHistory(prevHistory => {
      const currentIndex = prevHistory.length - 1;
      const updated = prevHistory.slice(0, currentIndex + 1);
      updated.push(newWidgets);

      if (updated.length > 50) {
        updated.shift();
      }

      setHistoryIndex(updated.length - 1);
      return updated;
    });
  }, []);

  // ===== ACTIONS =====
  const saveDashboard = useCallback(async () => {
    if (saving) return;
    if (!dashboardName.trim()) return;
    if (!workspaceId) {
      showToast("Please select a workspace first", "warning");
      return;
    }

    setSaving(true);

    try {
      if (isEditing) {
        await api.put(`dashboards/${id}`, {
          name: dashboardName,
          layout: widgets.map(w => ({
            i: w.i,
            x: w.x,
            y: w.y,
            w: w.w,
            h: w.h,
            report_id: w.report_id,
            dataset_id: w.dataset_id
          })),
          global_filters: filterSchema || []
        });

        setHasUnsavedChanges(false);
        setLastSaved(new Date());
        showToast("Dashboard saved successfully", "success");

        const draftKey = `dashboard_draft_${workspaceId}_${id}`;
        localStorage.removeItem(draftKey);

      } else {
        const res = await api.post(`workspaces/${workspaceId}/dashboards`, {
          name: dashboardName,
          layout: widgets.map(w => ({
            i: w.i,
            x: w.x,
            y: w.y,
            w: w.w,
            h: w.h,
            report_id: w.report_id,
            dataset_id: w.dataset_id
          })),
          global_filters: filterSchema || []
        });

        navigate(`/builder/${res.data.id}?workspace=${workspaceId}&mode=edit`, {
          replace: true
        });

        setIsEditing(true);
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
        showToast("Dashboard created successfully", "success");
      }

    } catch (err) {
      console.error("Save failed:", err);
      showToast("Failed to save dashboard", "error");
    } finally {
      setSaving(false);
    }
  }, [saving, dashboardName, workspaceId, isEditing, id, widgets, filterSchema, navigate, showToast]);

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveDashboard();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [saveDashboard]);

  const deleteDashboard = async () => {
    if (!isEditing || !id) return;
    
    if (window.confirm(`Are you sure you want to delete "${dashboardName}"?`)) {
      try {
        await api.delete(`dashboards/${id}`);
        showToast("Dashboard deleted", "success");
        navigate(`/workspace/${workspaceId}?tab=dashboards`);
      } catch (err) {
        console.error("Delete failed:", err);
        showToast("Failed to delete dashboard", "error");
      }
    }
  };

  const exportDashboard = () => {
    const dashboardData = {
      name: dashboardName,
      layout: widgets,
      global_filters: filterSchema,
      workspace_id: workspaceId,
      exportedAt: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(dashboardData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const fileName = `${dashboardName.replace(/\s+/g, '_')}_dashboard.json`;
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', fileName);
    link.click();
    
    showToast("Dashboard exported successfully", "success");
  };

  const exportPNG = async () => {
  try {

    const node = canvasRef.current;

    const dataUrl = await htmlToImage.toPng(node, {
      pixelRatio: 2,
      backgroundColor: "#ffffff"
    });

    const link = document.createElement("a");
    link.download = `${dashboardName}.png`;
    link.href = dataUrl;
    link.click();

    showToast("PNG exported", "success");

  } catch (err) {
    showToast("PNG export failed", "error");
  }
};

const exportPDF = async () => {
  try {

    const node = canvasRef.current;

    const dataUrl = await htmlToImage.toPng(node, {
      pixelRatio: 2
    });

    const pdf = new jsPDF("landscape", "px", [
      node.scrollWidth,
      node.scrollHeight
    ]);

    pdf.addImage(
      dataUrl,
      "PNG",
      0,
      0,
      node.scrollWidth,
      node.scrollHeight
    );

    pdf.save(`${dashboardName}.pdf`);

    showToast("PDF exported", "success");

  } catch (err) {
    showToast("PDF export failed", "error");
  }
};

  const addReport = useCallback((report) => {
    if (saving) return;
    if (viewMode !== "edit") return;
    
    const alreadyExists = widgets.some(w => w.report_id === report.id);
    if (alreadyExists) {
      showToast("This report is already added", "warning");
      return;
    }
    
    const widgetId = `${report.id}_${Date.now()}`;
    const maxY = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);

    const newWidget = {
      i: widgetId,
      report_id: report.id,
      dataset_id: report.dataset_id,
      x: 0,
      y: maxY,
      w: 6,
      h: 4
    };

    const updated = [...widgets, newWidget];
    setWidgets(updated);
    pushToHistory(updated);
    setHasUnsavedChanges(true);
    showToast(`"${report.name}" added to dashboard`, "success");
  }, [viewMode, widgets, pushToHistory, showToast, saving]);

  const removeWidget = useCallback((widgetId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (viewMode !== "edit") return;

    if (window.confirm("Remove this widget from dashboard?")) {
      const updated = widgets.filter(w => w.i !== widgetId);
      setWidgets(updated);
      pushToHistory(updated);
      setHasUnsavedChanges(true);
      showToast("Widget removed", "info");
    }
  }, [viewMode, widgets, pushToHistory, showToast]);

  // ===== DRAG & DROP =====
  const handleDragStart = (e, report) => {
    if (viewMode !== "edit") return;

    setDraggedReport(report);
    e.dataTransfer.setData("text/plain", report.id);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e) => {
    if (viewMode !== "edit") return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    if (viewMode !== "edit") return;
    e.preventDefault();
    if (!draggedReport) return;
    
    addReport(draggedReport);
    setDraggedReport(null);
  };

  // ===== LAYOUT HANDLERS =====
  const handleLayoutStop = useCallback((layout) => {
    if (viewMode !== "edit") return;
    
    const widgetMap = {};
    widgets.forEach(w => {
      widgetMap[w.i] = w;
    });

    const updated = layout.map(item => ({
      ...item,
      report_id: widgetMap[item.i]?.report_id || item.report_id,
      dataset_id: widgetMap[item.i]?.dataset_id || item.dataset_id
    }));
    setWidgets(updated);
    pushToHistory(updated);
    setHasUnsavedChanges(true);
  }, [viewMode, widgets, pushToHistory]);

  // ===== UNDO/REDO =====
  const handleUndo = () => {
    if (viewMode !== "edit") return;
    if (historyIndex > 0) {
      setWidgets(history[historyIndex - 1]);
      setHistoryIndex(historyIndex - 1);
      setHasUnsavedChanges(true);
    }
  };

  const handleRedo = () => {
    if (viewMode !== "edit") return;
    if (historyIndex < history.length - 1) {
      setWidgets(history[historyIndex + 1]);
      setHistoryIndex(historyIndex + 1);
      setHasUnsavedChanges(true);
    }
  };

  // ===== FILTERS =====
  const updateFilterValue = (column, value) => {
    setDashboardFilters(prev => ({
      ...prev,
      [column]: value
    }));
    setHasUnsavedChanges(true);
  };

  const clearFilters = () => {
    setDashboardFilters({});
    setHasUnsavedChanges(true);
  };

  const addFilterToSchema = async () => {
    if (viewMode !== "edit") return;
    if (!workspaceInfo || availableColumns.length === 0) {
      showToast("No columns available for filtering", "warning");
      return;
    }

    try {
      const column = availableColumns[0];
      
      const valueRes = await api.get(
        `/api/datasets/${column.dataset_id}/distinct/${column.name}`
      );

      const newFilter = {
        column: column.name,
        dataset_id: column.dataset_id,
        type: "multi",
        values: valueRes.data || []
      };

      setFilterSchema(prev => [...prev, newFilter]);
      setHasUnsavedChanges(true);
      showToast("Filter added successfully", "success");
    } catch (err) {
      console.error("Filter load error:", err);
      showToast("Failed to load filter values", "error");
    }
  };

  const removeFilterFromSchema = (index) => {
    if (viewMode !== "edit") return;
    setFilterSchema(prev => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  // ===== UTILITIES =====
  const getReportIcon = (report) => {
    const type = report.type || report.config?.chartType;
    const icons = {
      'bar': <BarChart3 size={16} />,
      'line': <LineChart size={16} />,
      'pie': <PieChart size={16} />,
      'table': <TableIcon size={16} />,
      'default': <Database size={16} />
    };
    return icons[type] || icons.default;
  };

  const getReportColor = (report) => {
    const type = report.type || report.config?.chartType;
    const colors = {
      'bar': '#3b82f6',
      'line': '#10b981',
      'pie': '#8b5cf6',
      'table': '#f59e0b',
      'default': '#64748b'
    };
    return colors[type] || colors.default;
  };

  const filteredReports = Array.isArray(availableReports)
    ? availableReports
    : [];

  const reportMap = useMemo(() => {
    const map = {};
    availableReports.forEach(r => {
      map[String(r.id)] = r;
    });
    return map;
  }, [availableReports]);

  // ===== RENDER =====
  return (
    <div className="dashboard-builder">
      {/* HEADER */}
      <header className="db-header">
        <div className="vb-header-left">
          <button
            className="btn-back-modern"
            onClick={() =>
              workspaceId
                ? navigate(`/workspace/${workspaceId}?tab=dashboards`)
                : navigate("/")
            }
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 className="vb-title">Dashboard Builder</h1>
          {viewMode === "view" && (
            <span className="view-mode-badge">👁 View Mode</span>
          )}
        </div>

        <div className="vb-header-center">
          <div className="workspace-selector-header">
            <select
              className="header-select"
              value={workspaceId || ""}
              onChange={(e) => {
                if (viewMode === "edit") {
                  const newWorkspaceId = e.target.value;
                  setWidgets([]);
                  setFilterSchema([]);
                  setDashboardFilters({});
                  setAvailableReports([]);
                  setAvailableColumns([]);
                  setHistory([]);
                  setHistoryIndex(-1);
                  setHasUnsavedChanges(false);
                  navigate(`/builder?workspace=${newWorkspaceId}&mode=edit`);
                }
              }}
              disabled={viewMode === "view"}
            >
              <option value="">Select Workspace</option>
              {workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="select-arrow" />
          </div>
        </div>

        <div className="vb-header-right">
          <div className="report-name-wrapper">
            <FileText size={16} className="input-icon" />
            <input
              type="text"
              className="report-name-input"
              value={dashboardName}
              onChange={(e) => {
                if (viewMode === "edit") {
                  setDashboardName(e.target.value);
                  setHasUnsavedChanges(true);
                }
              }}
              placeholder="edit and save your dashboard name"
              disabled={viewMode === "view" || !workspaceId}
            />
          </div>

          <div className="header-actions">
            <div className="mode-switch">
              <span className={`mode-label ${viewMode === "edit" ? "active" : ""}`}>
                Edit
              </span>

              <label className="switch">
                <input
                  type="checkbox"
                  checked={viewMode === "view"}
                  onChange={() => {
                    if (!workspaceId || !id) return;
                    const newMode = viewMode === "edit" ? "view" : "edit";
                    navigate(
                      `/builder/${id}?workspace=${workspaceId}&mode=${newMode}`,
                      { replace: true }
                    );
                  }}
                  disabled={!workspaceId}
                />
                <span className="slider"></span>
              </label>

              <span className={`mode-label ${viewMode === "view" ? "active" : ""}`}>
                View
              </span>
            </div>

            {viewMode === "edit" && (
              <div className="history-actions-modern">
                <button
                  className="btn-action btn-secondary"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0 || !workspaceId}
                  title="Undo"
                >
                  ↩ Undo
                </button>

                <button
                  className="btn-action btn-secondary"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1 || !workspaceId}
                  title="Redo"
                >
                  ↪ Redo
                </button>
              </div>
            )}

            {viewMode === "edit" && (
              <button
                className="btn-save-modern"
                onClick={saveDashboard}
                disabled={saving || !workspaceId || !hasUnsavedChanges}
              >
                {saving ? (
                  <>
                    <div className="spinner"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save
                  </>
                )}
              </button>
            )}

           <div className="export-wrapper">

  <button
    className="btn-export-modern"
    onClick={() => setExportOpen(!exportOpen)}
  >
    <Download size={16} />
    Export
  </button>

  {exportOpen && (
    <div className="export-dropdown">

      <button onClick={exportPNG}>
        Export PNG
      </button>

      <button onClick={exportPDF}>
        Export PDF
      </button>

      <button onClick={exportDashboard}>
        Export JSON
      </button>

    </div>
  )}

</div>
          </div>
        </div>
      </header>

      {/* FILTER BAR */}
      {workspaceId && (filterSchema.length > 0 || Object.keys(dashboardFilters).length > 0) && (
        <div className="dashboard-filter-bar">
          <div className="filter-bar-header">
            <Filter size={16} />
            <span>Dashboard Filters</span>
          </div>
          
          <div className="filter-controls">
            {filterSchema.length === 0 && (
              <span className="no-filters-text">No filters configured</span>
            )}

            {filterSchema.map((filter, index) => (
              <div key={index} className="filter-item">
                <select
                  multiple
                  value={dashboardFilters[filter.column] || []}
                  onChange={(e) => {
                    const values = Array.from(
                      e.target.selectedOptions,
                      option => option.value
                    );
                    updateFilterValue(filter.column, values);
                  }}
                  className="filter-select"
                  disabled={viewMode === "view"}
                >
                  {filter.values?.map(v => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>

                {viewMode === "edit" && (
                  <button 
                    className="filter-remove-btn"
                    onClick={() => removeFilterFromSchema(index)}
                    title="Remove filter"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {viewMode === "edit" && (
            <div className="filter-actions">
              {Object.keys(dashboardFilters).length > 0 && (
                <button
                  className="clear-filters-btn"
                  onClick={clearFilters}
                >
                  Clear All
                </button>
              )}
              <button
                className="add-filter-btn"
                onClick={addFilterToSchema}
                title="Add filter"
              >
                <Plus size={14} />
                Add Filter
              </button>
            </div>
          )}
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div className="builder-main">
        {workspaceId && (
          <aside
            className={`reports-sidebar ${
              showReportPanel && viewMode === "edit"
                ? "open"
                : "collapsed"
            }`}
          >
            <div className="reports-list">
              {filteredReports.length === 0 ? (
                <div className="no-reports">
                  <Database size={32} />
                  <p>No reports found</p>
                </div>
              ) : (
                filteredReports.map(report => (
                  <div
                    key={report.id}
                    className="report-card"
                    draggable={viewMode === "edit"}
                    onDragStart={(e) => handleDragStart(e, report)}
                    onClick={() => addReport(report)}
                  >
                    <div
                      className="report-icon"
                      style={{
                        backgroundColor: getReportColor(report) + '15',
                        color: getReportColor(report)
                      }}
                    >
                      {getReportIcon(report)}
                    </div>
                    <div className="report-details">
                      <h5 className="report-title">{report.name}</h5>
                      <p className="report-description">
                        {report.description || `${report.type || 'Chart'} report`}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}

        {/* CANVAS */}
        <main
          ref={canvasRef}
          className={`builder-canvas ${viewMode === "view" ? "view-mode" : ""} ${
            !workspaceId ? "no-workspace" : ""
          }`}
          onDragOver={viewMode === "edit" && workspaceId ? handleDragOver : null}
          onDrop={viewMode === "edit" && workspaceId ? handleDrop : null}
        >
          {!workspaceId ? (
            <div className="empty-state">
              <div className="empty-state-content">
                <div className="empty-state-icon">
                  <Folder size={48} />
                </div>
                <h3>Select a Workspace to Start</h3>
                <p className="empty-state-description">
                  Choose a workspace from the dropdown above to begin building your dashboard
                </p>
              </div>
            </div>
          ) : widgets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-content">
                <div className="empty-state-icon">
                  <Layout size={48} />
                </div>
                <h3>{viewMode === "edit" ? "Start Building" : "Empty Dashboard"}</h3>
                <p className="empty-state-description">
                  {viewMode === "edit"
                    ? "Drag reports from the sidebar or click to add them to your canvas"
                    : "This dashboard has no widgets yet"}
                </p>
                {viewMode === "edit" && (
                  <button
                    className="btn-primary"
                    onClick={() => setShowReportPanel(true)}
                  >
                    Open Report Panel
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="canvas-header">
                <div className="canvas-stats">
                  <span className="stat">
                    <Layers size={14} />
                    {widgets.length} widgets
                  </span>
                </div>
              </div>

              <div className="grid-wrapper">
                <ResponsiveGridLayout
                  className="layout"
                  layouts={{ lg: widgets }}
                  cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                  rowHeight={100}
                  onDragStop={viewMode === "edit" && workspaceId ? handleLayoutStop : undefined}
                  onResizeStop={viewMode === "edit" && workspaceId ? handleLayoutStop : undefined}
                  isDraggable={viewMode === "edit" && !saving}
                  isResizable={viewMode === "edit" && !saving}
                  draggableCancel=".widget-remove-btn"
                  margin={[16, 16]}
                  containerPadding={[16, 16]}
                  useCSSTransforms={true}
                >
                  {widgets.map(item => (
                    <div key={item.i} className="grid-item">
                      <div className={`widget-container ${viewMode === "view" ? "view-mode" : ""}`}>
                        <div className="widget-header">
                          <span className="widget-title">
                            {reportMap[String(item.report_id)]?.name || 'Report'}
                          </span>
                          {viewMode === "edit" && (
                            <button
                              className="widget-remove-btn"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => removeWidget(item.i, e)}
                              title="Remove widget"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <div className="widget-content">
                          <WidgetErrorBoundary>
                            <ChartWidget
                              reportId={item.report_id}
                              filters={dashboardFilters}
                            />
                          </WidgetErrorBoundary>
                        </div>
                      </div>
                    </div>
                  ))}
                </ResponsiveGridLayout>
              </div>
            </>
          )}
        </main>
      </div>

      {/* TOAST CONTAINER */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <div className="toast-content">{t.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardBuilder;