// src/pages/VisualBuilder.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useDrag, useDrop } from "react-dnd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  RotateCcw,
  RotateCw,
  Save,
  Download,
  PlusCircle,
  ArrowLeft,
  ChevronDown,
  LayoutGrid,
  FileText,
  Image as ImageIcon,
  BarChart,
  LineChart,
  PieChart,
  MousePointer2,
  Table as TableIcon,
  Search,
  MoreVertical,
  X,
  TrendingUp,
  Activity,
  Box,
  Layers,
  Map as MapIcon,
  Disc,
  Filter
} from "lucide-react";

import api from "../../api/api";
import "../../styles/visual-builder.css";
import { recommendCharts } from "../../utils/chartRecommendation";
import ChartWidget from "../../components/ChartWidget";

// ================= DRAGGABLE FIELD COMPONENT WITH DISABLED STATE =================
const DraggableField = ({ name, type, isSelected, disabled, isReadOnly }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type,
    item: { name, type },
    canDrag: !disabled && !isReadOnly,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    })
  }));

  return (
    <div
      ref={!isReadOnly && !disabled ? drag : null}
      className={`vb-field ${type.toLowerCase()} ${isDragging ? "dragging" : ""} ${isSelected ? "active" : ""} ${disabled ? "disabled" : ""}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {name}
    </div>
  );
};

// ================= DROP ZONE COMPONENT =================
const AxisDropZone = ({ label, accept, value, onDrop, onClear, disabled }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept,
    drop: (item) => {
      if (disabled || !onDrop) return;
      onDrop(item.name);
    },
    canDrop: () => !disabled && !!onDrop,
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop()
    })
  }));

  const isActive = isOver && canDrop;

  return (
    <div className="axis-drop">
      <span>{label}</span>
      <div
        ref={!disabled ? drop : null}
        className={`drop-zone ${value ? "has-value" : ""} ${isActive ? "drop-hover" : ""} ${canDrop ? "drop-ready" : ""} ${disabled ? "disabled" : ""}`}
        onClick={(e) => {
          if (value && onClear && !disabled && !e.target.closest('.clear-btn')) {
            onClear();
          }
        }}
      >
        {value || `Drop ${accept === "DIMENSION" ? "dimension" : "measure"} here`}
        {value && onClear && !disabled && (
          <button
            className="clear-btn"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          >
            ×
          </button>
        )}
        {isActive && <div className="drop-hint">Release to drop</div>}
      </div>
    </div>
  );
};

// ================= DATASET DROPDOWN WITH PAGINATION =================
const DatasetDropdown = ({ datasets, selectedDataset, onSelect, workspaceSelected, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredDatasets = datasets.filter(ds =>
    ds.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredDatasets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDatasets = filteredDatasets.slice(startIndex, startIndex + itemsPerPage);

  const selectedDatasetObj = datasets.find(ds => ds.id === selectedDataset);

  return (
    <div className="dataset-dropdown-container" ref={dropdownRef}>
      <div
        className={`dataset-selector ${!workspaceSelected ? 'disabled' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && workspaceSelected && setIsOpen(!isOpen)}
      >
        <span className="dataset-selector-label">
          {selectedDatasetObj ? selectedDatasetObj.name : "Select dataset"}
        </span>
        <span className="dropdown-arrow">▼</span>
      </div>

      {isOpen && workspaceSelected && !disabled && (
        <div className="dataset-dropdown-panel">
          <div className="dataset-search">
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              autoFocus
            />
          </div>

          <div className="dataset-list">
            {paginatedDatasets.length > 0 ? (
              paginatedDatasets.map(ds => (
                <div
                  key={ds.id}
                  className={`dataset-item ${selectedDataset === ds.id ? 'active' : ''}`}
                  onClick={() => {
                    onSelect(ds.id, ds.name);
                    setIsOpen(false);
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                >
                  <div className="dataset-item-name">{ds.name}</div>
                  <div className="dataset-item-stats">
                    {ds.row_count?.toLocaleString()} rows
                  </div>
                </div>
              ))
            ) : (
              <div className="dataset-empty">No datasets found</div>
            )}
          </div>

          {filteredDatasets.length > itemsPerPage && (
            <div className="dataset-pagination">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ←
              </button>
              <span className="pagination-info">
                {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredDatasets.length)} of {filteredDatasets.length}
              </span>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function VisualBuilder() {
  const navigate = useNavigate();
  const location = useLocation();

  // ================= STATE =================
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [selectedDatasetName, setSelectedDatasetName] = useState("");

  const [dimensions, setDimensions] = useState([]);
  const [measures, setMeasures] = useState([]);

  const [xAxis, setXAxis] = useState(null);
  const [yAxis, setYAxis] = useState([]);
  const [series, setSeries] = useState(null);

  const [aggregation, setAggregation] = useState("SUM");
  const [chartType, setChartType] = useState(null);

  const [previewData, setPreviewData] = useState(null);

  const [reportName, setReportName] = useState("save your report");
  const [reportId, setReportId] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  // View mode state
  const [viewMode, setViewMode] = useState("edit");

  const chartWidgetRef = useRef(null);
  const chartScrollRef = useRef(null);
  const previewTimeoutRef = useRef(null);
  const isReadOnly = viewMode === "view";


  // History management
  const [history, setHistory] = useState([]);
  const historyIndexRef = useRef(-1);
  const isRestoringRef = useRef(false);

  // ================= EFFECTS =================

  // ✅ FIXED: Single initialization effect (removed duplicate)
  useEffect(() => {
    const init = async () => {
      await loadWorkspaces();

      const urlParams = new URLSearchParams(location.search);
      const reportIdFromUrl = urlParams.get("reportId");
      const workspaceIdFromUrl = urlParams.get("workspace");
      const datasetIdFromUrl = urlParams.get("datasetId");
      const modeFromUrl = urlParams.get("mode") || "edit";

      setViewMode(modeFromUrl);

      if (workspaceIdFromUrl) {
        setSelectedWorkspace(workspaceIdFromUrl);
      }

      if (reportIdFromUrl) {
        setReportId(reportIdFromUrl);
      }

      if (datasetIdFromUrl && !reportIdFromUrl) {
        setSelectedDataset(datasetIdFromUrl);
      }
    };

    init();
  }, []);


  // ✅ Load datasets when workspace changes
  useEffect(() => {
    if (!selectedWorkspace) {
      resetData(true);
      return;
    }

    loadDatasets(true); // always preserve state
  }, [selectedWorkspace]);

  // ✅ Load report only when reportId changes
  useEffect(() => {
    if (!reportId) return;

    loadReport(reportId);
  }, [reportId]);



  // Auto-load dataset metadata if datasetId is present
  useEffect(() => {
    if (!reportId && selectedDataset && selectedWorkspace) {
      loadMetadata(selectedDataset);

      const dataset = datasets.find(ds => ds.id === selectedDataset);
      if (dataset) {
        setSelectedDatasetName(dataset.name);
      }
    }
  }, [selectedDataset, selectedWorkspace, datasets]);

  // Reset Series when X-axis changes
  useEffect(() => {
    setSeries(null);
  }, [xAxis]);

  // Chart recommendations and auto-selection
  const recommendedCharts = recommendCharts({
    xAxis,
    yAxis,
    dimensions
  });

  // Auto-select best chart type
  useEffect(() => {
    // Do not auto override if report is loaded
    if (reportId) return;

    // Only auto-select if chartType is not already chosen
    if (!chartType && recommendedCharts.length > 0) {
      setChartType(recommendedCharts[0].type);
    }

  }, [recommendedCharts, chartType, reportId]);



  // Auto preview
  useEffect(() => {
    if (viewMode !== "edit") return;
    if (!selectedDataset || !xAxis || yAxis.length === 0 || !chartType) {
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setPreviewLoading(true);

        const res = await api.post("/visualize/preview", {
          workspace_id: selectedWorkspace,
          dataset_id: selectedDataset,
          chart_type: chartType,
          x: xAxis,
          y: yAxis,
          series,
          aggregation
        });

        const raw = res.data;

        if (raw?.data) {
          const chartData = raw.data;

          if (chartData.labels && chartData.series) {
            setPreviewData(chartData);
            return;
          }

         if (Array.isArray(chartData)) {
  const labels = [...new Set(chartData.map(row => row[xAxis]))];

  // ✅ If user selected SERIES (dimension)
  if (series) {
    const grouped = {};

    chartData.forEach(row => {
      const seriesKey = row[series];
      const label = row[xAxis];
      const value = row[yAxis[0]];

      if (!grouped[seriesKey]) {
        grouped[seriesKey] = {};
      }

      grouped[seriesKey][label] = value;
    });

    const seriesData = Object.keys(grouped).map(key => ({
      name: key,
      data: labels.map(label => grouped[key][label] || 0)
    }));

    setPreviewData({
      labels,
      series: seriesData
    });

  } else {
    // fallback (existing logic)
    const seriesData = yAxis.map(measure => ({
      name: measure,
      data: chartData.map(row => row[measure])
    }));

    setPreviewData({
      labels,
      series: seriesData
    });
  }

  return;
}
        }

        console.error("Unexpected backend format:", raw);
        setPreviewData(null);

      } catch (error) {
        console.error("Auto preview failed:", error);
        setPreviewData(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeout);

  }, [
    selectedDataset,
    xAxis,
    yAxis,
    chartType,
    aggregation,
    series,
    selectedWorkspace,
    viewMode
  ]);

  // ================= HISTORY MANAGEMENT =================
  const saveToHistory = useCallback(() => {
    if (viewMode !== "edit") return;

const snapshot = {
  selectedWorkspace,
  selectedDataset,
  xAxis,
  yAxis,
  series,
  aggregation,
  chartType,
  previewData,
  timestamp: Date.now()
};
    setHistory(prev => {
      const newHistory = [...prev.slice(0, historyIndexRef.current + 1), snapshot];
      historyIndexRef.current = newHistory.length - 1;
      return newHistory.slice(-20);
    });
  }, [selectedWorkspace, selectedDataset, xAxis, yAxis, aggregation, chartType, previewData, viewMode]);

const handleUndo = () => {
  if (viewMode !== "edit") return;

  if (historyIndexRef.current > 0) {
    historyIndexRef.current--;

    const snapshot = history[historyIndexRef.current];

    isRestoringRef.current = true;

    setSelectedWorkspace(snapshot.selectedWorkspace);
    setSelectedDataset(snapshot.selectedDataset);
    setXAxis(snapshot.xAxis);
    setYAxis(snapshot.yAxis);
    setSeries(snapshot.series);
    setAggregation(snapshot.aggregation);
    setChartType(snapshot.chartType);
    setPreviewData(snapshot.previewData || null);
  }
};

const handleRedo = () => {
  if (viewMode !== "edit") return;

  if (historyIndexRef.current < history.length - 1) {
    historyIndexRef.current++;

    const snapshot = history[historyIndexRef.current];

    isRestoringRef.current = true;

    setSelectedWorkspace(snapshot.selectedWorkspace);
    setSelectedDataset(snapshot.selectedDataset);
    setXAxis(snapshot.xAxis);
    setYAxis(snapshot.yAxis);
    setSeries(snapshot.series);
    setAggregation(snapshot.aggregation);
    setChartType(snapshot.chartType);
    setPreviewData(snapshot.previewData || null);
  }
};

useEffect(() => {
  if (viewMode !== "edit") return;

  if (isRestoringRef.current) {
    isRestoringRef.current = false;
    return;
  }

  saveToHistory();

}, [
  selectedWorkspace,
  selectedDataset,
  xAxis,
  yAxis,
  series,
  aggregation,
  chartType
]);
  // ================= API FUNCTIONS =================
  const loadWorkspaces = async () => {
    try {
      const res = await api.get("/workspaces");
      setWorkspaces(res.data);
    } catch (error) {
      console.error("Failed to load workspaces:", error);
      alert("Failed to load workspaces. Please try again.");
    }
  };

  const loadDatasets = async (preserveState = false) => {
    try {
      const res = await api.get(`workspaces/${selectedWorkspace}/datasets`);
      setDatasets(res.data);

      if (!preserveState) {
        setSelectedDatasetName("");
        setXAxis(null);
        setYAxis([]);
        setSeries(null);
        setPreviewData(null);
      }

    } catch (error) {
      console.error("Failed to load datasets:", error);
      alert("Failed to load datasets. Please try again.");
    }
  };

  const loadMetadata = async (datasetId) => {
    try {
      setDimensions([]);
      setMeasures([]);

      const res = await api.get(`datasets/${datasetId}/metadata`);

      const dims = [];
      const meas = [];

      const raw = res.data;

      const metadataArray = Array.isArray(raw)
        ? raw.map(col => ({
            name: col.name,
            role: col.role,
            sample_values: col.sample_values
          }))
        : Object.keys(raw || {}).map(name => ({
            name,
            role: raw[name]?.role,
            sample_values: raw[name]?.sample_values
          }));

      metadataArray.forEach(col => {
        if (!col.name || !col.role) return;

        const role = String(col.role).toLowerCase();

        if (role === "dimension") {
          dims.push(col.name);
        }

        if (role === "measure") {
          const hasValidValue =
            Array.isArray(col.sample_values) &&
            col.sample_values.some(
              v =>
                v !== null &&
                v !== undefined &&
                v !== "" &&
                !Number.isNaN(Number(v))
            );

          if (hasValidValue) {
            meas.push(col.name);
          }
        }
      });

      setDimensions(dims);
      setMeasures(meas);

    } catch (err) {
      console.error("Metadata load failed:", err);
      setDimensions([]);
      setMeasures([]);
    }
  };

  const loadReport = async (idParam) => {
    const idToUse = idParam || reportId;
    if (!idToUse) return;

    try {
      const res = await api.get(`reports/${idToUse}`);
      const report = res.data;

      setReportName(report.name);
      setChartType(report.chart_type);
      setSelectedDataset(report.dataset_id);
      await loadMetadata(report.dataset_id);

      if (report.config) {
        setXAxis(report.config.x || null);
        setYAxis(report.config.y || []);
        setSeries(report.config.series || null);
        setAggregation(report.config.aggregation || "SUM");
      }
      if (report.preview_data) {
        setPreviewData(report.preview_data);
      }
    } catch (error) {
      console.error("Failed to load report:", error);
      alert("Failed to load report.");
    }
  };

  const handlePreview = async () => {
    if (!selectedDataset || !xAxis || yAxis.length === 0 || !chartType) {
      return;
    }

    try {
      setPreviewLoading(true);

      let endpoint = "/visualize/preview";

      if (["scatter", "bubble"].includes(chartType)) {
        endpoint = "/visualize/scatter";
      }

      if (["treemap", "sunburst"].includes(chartType)) {
        endpoint = "/visualize/hierarchy";
      }

      let requestData = {
        workspace_id: selectedWorkspace,
        dataset_id: selectedDataset,
        chart_type: chartType,
        x: xAxis,
        y: yAxis,
        series,
        aggregation
      };

      if (chartType === "treemap" || chartType === "sunburst") {
        requestData = {
          workspace_id: selectedWorkspace,
          dataset_id: selectedDataset,
          chart_type: chartType,
          dimensions: [xAxis, series].filter(Boolean),
          measure: yAxis[0],
          aggregation
        };
      }

      const res = await api.post(endpoint, requestData);
      setPreviewData(res.data);

      setTimeout(() => {
        saveToHistory();
      }, 0);

    } catch (error) {
      console.error("Failed to generate preview:", error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExportPNG = async () => {
    if (!chartWidgetRef.current) {
      alert("Chart not ready");
      return;
    }

    if (!reportId) {
      alert("Please save the report first");
      return;
    }

    if (!chartWidgetRef.current?.getImage) {
      alert("Chart not ready");
      return;
    }

    try {
      const image = chartWidgetRef.current.getImage();
      const res = await api.post(
        `reports/${reportId}/export/png`,
        { image },
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${reportName}.png`);
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PNG export failed:", error);
      alert("Failed to export image");
    }
  };

  const handleExportExcel = () => {
    if (!previewData || !previewData.labels?.length) {
      alert("No data to export");
      return;
    }

    const rows = previewData.labels.map((label, index) => {
      const row = { [xAxis]: label };

      previewData.series.forEach(s => {
        row[s.name] = s.data[index];
      });

      return row;
    });

    const headers = Object.keys(rows[0]);

    const csvRows = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(header => {
          const val = row[header];
          return typeof val === 'string'
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${reportName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = async () => {
    if (viewMode !== "edit") return;
    if (!selectedWorkspace || !selectedDataset || !xAxis || yAxis.length === 0) {
      alert("Please complete all selections before saving.");
      return;
    }

    try {
      const payload = {
        name: reportName,
        dataset_id: selectedDataset,
        chart_type: chartType,
        config: {
          x: xAxis,
          y: yAxis,
          series,
          aggregation
        },
        preview_data: previewData
      };

      if (reportId) {
        await api.put(`reports/${reportId}`, payload);
        await loadReport(reportId);
        alert("Report updated successfully");
      } else {
        const res = await api.post(`workspaces/${selectedWorkspace}/reports`, payload);
        setReportId(res.data.id);
        alert("Report saved successfully");
      }
    } catch (error) {
      console.error("Failed to save report:", error);
      alert("Failed to save report. Please try again.");
    }
  };

  const toggleMode = async () => {
    const newMode = viewMode === "edit" ? "view" : "edit";
    setViewMode(newMode);

    if (newMode === "view" && reportId) {
      try {
        const res = await api.post("/reports/run", {
          report_id: reportId,
          filters: {}
        });

        setChartType(res.data.config.chartType);
        setPreviewData(res.data.data);
      } catch (err) {
        console.error("Run report failed:", err);
      }
    }

    if (newMode === "edit" && reportId) {
      await loadReport(reportId);
    }
  };


  const handleBack = () => {
    if (selectedWorkspace) {
      navigate(`/workspace/${selectedWorkspace}?tab=reports`);
    } else {
      navigate('/workspaces');
    }
  };

  const handleDatasetSelect = (datasetId, datasetName) => {
    if (viewMode !== "edit") return;

    setSelectedDataset(datasetId);
    setSelectedDatasetName(datasetName);
    setDimensions([]);
    setMeasures([]);
    setXAxis(null);
    setYAxis([]);
    setSeries(null);
    setPreviewData(null);
    loadMetadata(datasetId);
  };

  const scrollToChart = () => {
  if (chartScrollRef.current) {
    chartScrollRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
};

  const resetData = (clearSchema = true) => {
    if (viewMode !== "edit") return;

    setSelectedDataset(null);
    setSelectedDatasetName("");

    if (clearSchema) {
      setDimensions([]);
      setMeasures([]);
    }

    setXAxis(null);
    setYAxis([]);
    setSeries(null);
    setPreviewData(null);
  };

  const [showAllCharts, setShowAllCharts] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // ================= RENDER =================
  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className="vb-container"
        style={isReadOnly ? { userSelect: "none" } : {}}
      >
        <header className="vb-header">
          {/* LEFT: BACK BUTTON AND TITLE */}
          <div className="vb-header-left">
            <button className="btn-back-modern" onClick={handleBack}>
              <ArrowLeft size={16} />
              Back
            </button>
            <h1 className="vb-title">Visual Builder</h1>
            {viewMode === "view" && (
              <span className="view-mode-badge">👁 View Mode</span>
            )}
          </div>

          {/* CENTER: WORKSPACE SELECTOR */}
          <div className="vb-header-center">
            <div className="workspace-selector-header">
              <select
                className="header-select"
                value={selectedWorkspace || ""}
                onChange={(e) => viewMode === "edit" && setSelectedWorkspace(e.target.value)}
                disabled={isReadOnly}
              >
                <option value="">Select Workspace</option>
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="select-arrow" />
            </div>
          </div>

          {/* RIGHT: REPORT NAME + ACTION BUTTONS */}
          <div className="vb-header-right">
            {/* Input is placed first so it sits to the left of the buttons */}
            <div className="report-name-wrapper">
              <FileText size={16} className="input-icon" />
              <input
                type="text"
                className="report-name-input"
                value={reportName}
                onChange={(e) => viewMode === "edit" && setReportName(e.target.value)}
                placeholder="save your report"
                disabled={isReadOnly}
              />
            </div>

            {/* Buttons are placed last so they hit the extreme right corner */}
            <div className="header-actions">
              <div className="mode-switch">
                <span className={`mode-label ${viewMode === "edit" ? "active" : ""}`}>
                  Edit
                </span>

                <label className="switch">
                  <input
                    type="checkbox"
                    checked={viewMode === "view"}
                    onChange={toggleMode}
                    disabled={!selectedWorkspace}
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
                    disabled={historyIndexRef.current <= 0 || !selectedWorkspace}
                    title="Undo"
                  >
                    ↩ Undo
                  </button>

                  <button
                    className="btn-action btn-secondary"
                    onClick={handleRedo}
                    disabled={
                      historyIndexRef.current >= history.length - 1 ||
                      !selectedWorkspace
                    }
                    title="Redo"
                  >
                    ↪ Redo
                  </button>
                </div>
              )}

              {viewMode === "edit" && (
                <button className="btn-save-modern" onClick={handleSave}>
                  <Save size={16} />
                  Save
                </button>
              )}

              <div className="export-wrapper">
                <button
                  className="btn-export-modern"
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                >
                  <Download size={16} />
                  Export
                  <ChevronDown size={14} />
                </button>

                {exportDropdownOpen && (
                  <div className="export-modern-dropdown">
                    <button onClick={() => { handleExportPNG(); setExportDropdownOpen(false); }}>
                      Export PNG
                    </button>
                    <button onClick={() => { handleExportExcel(); setExportDropdownOpen(false); }}>
                      Export CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="vb-content">
          <section className="vb-section chart-library-section glossy-card">
           <div className="section-header">
  <span className="section-label">CHART LIBRARY</span>
  <div className="section-divider"></div>

  {viewMode === "edit" && (
    <button
      className="text-btn"
      onClick={() => setShowAllCharts(!showAllCharts)}
    >
      {showAllCharts ? "Show Less" : "Show All"}
    </button>
  )}
</div>
            <div className={`chart-type-grid ${showAllCharts ? "expanded" : "collapsed"}`}>
              {recommendedCharts.slice(0, showAllCharts || viewMode === "view" ? undefined : 7).map(chart => {
                const getIcon = (type) => {
                  if (type.includes('bar')) return <BarChart size={20} />;
                  if (type.includes('line')) return <LineChart size={20} />;
                  if (type.includes('area')) return <TrendingUp size={20} />;
                  if (type.includes('pie') || type.includes('donut')) return <PieChart size={20} />;
                  if (type.includes('scatter') || type.includes('bubble')) return <MousePointer2 size={20} />;
                  if (type.includes('table')) return <TableIcon size={20} />;
                  if (type.includes('kpi')) return <Activity size={20} />;
                  if (type.includes('treemap') || type.includes('sunburst')) return <Layers size={20} />;
                  if (type.includes('map')) return <MapIcon size={20} />;
                  return <BarChart size={20} />;
                };

                return (
                  <button
                    key={chart.type}
                    className={`chart-type-item ${chartType === chart.type ? "active" : ""}`}
                    onClick={() => {
  if (viewMode !== "edit") return;

  setChartType(chart.type);

  // small delay ensures DOM updates before scroll
  setTimeout(() => {
    scrollToChart();
  }, 100);
}}
                    disabled={isReadOnly}

                  >
                    <div className="chart-icon-placeholder">
                      {getIcon(chart.type)}
                    </div>
                    <span className="chart-label">{chart.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="vb-row data-fields-row">

  {/* =========================
      DATA SOURCE
  ========================= */}
  <div className="vb-card data-source-card glossy-card">

    <div className="card-header">
      <span className="card-title">DATA SOURCE</span>
    </div>

    <div className="card-body">

      <div className="data-info-grid">

        <div className="info-item">
          <span className="info-label">Workspace:</span>
          <span className="info-value">
            {workspaces?.find(w => w.id === selectedWorkspace)?.name || "Not selected"}
          </span>
        </div>

        <div className="info-item">
          <span className="info-label">Dataset:</span>
          <span className="info-value">
            {selectedDatasetName || "Not selected"}
          </span>
        </div>

      </div>

      <div className="dataset-picker-container">
        <DatasetDropdown
          datasets={datasets}
          selectedDataset={selectedDataset}
          onSelect={handleDatasetSelect}
          workspaceSelected={!!selectedWorkspace}
          disabled={isReadOnly}
        />
      </div>

    </div>

  </div>


  {/* =========================
      DIMENSIONS
  ========================= */}
  <div className="vb-card fields-card glossy-card">

    <div className="card-header">
      <span className="card-title">DIMENSIONS</span>
      <span className="badge">{dimensions?.length || 0}</span>
    </div>

    <div className="card-body scrollable">

      {dimensions?.length > 0 ? (

        dimensions.map(d => (
          <DraggableField
            key={d}
            name={d}
            type="DIMENSION"
            isSelected={xAxis === d}
            disabled={isReadOnly}
            isReadOnly={isReadOnly}
          />
        ))

      ) : (

        <div className="empty-hint">
          Select a dataset first
        </div>

      )}

    </div>

  </div>


  {/* =========================
      MEASURES
  ========================= */}
  <div className="vb-card fields-card glossy-card">

    <div className="card-header">
      <span className="card-title">MEASURES</span>
      <span className="badge">{measures?.length || 0}</span>
    </div>

    <div className="card-body scrollable">

      {measures?.length > 0 ? (

        measures.map(m => (
          <DraggableField
            key={m}
            name={m}
            type="MEASURE"
            isSelected={yAxis?.includes(m)}
            disabled={isReadOnly}
            isReadOnly={isReadOnly}
          />
        ))

      ) : (

        <div className="empty-hint">
          Select a dataset first
        </div>

      )}

    </div>

  </div>

</div>

          <section className="vb-section encoding-section glossy-card">
            <div className="encoding-grid">
              <div className="encoding-zone-wrapper">
                <span className="encoding-label">X AXIS</span>
                <AxisDropZone
                  label=""
                  accept="DIMENSION"
                  value={xAxis}
                  onDrop={isReadOnly ? undefined : setXAxis}
                  onClear={isReadOnly ? undefined : () => setXAxis(null)}
                  disabled={isReadOnly}
                />
              </div>
              <div className="encoding-zone-wrapper">
                <span className="encoding-label">Y AXIS</span>
                <AxisDropZone
                  label=""
                  accept="MEASURE"
                  value={yAxis.length ? yAxis.join(", ") : null}
                  onDrop={
                    isReadOnly
                      ? undefined
                      : (field) =>
                          setYAxis((prev) =>
                            prev.includes(field) ? prev : [...prev, field]
                          )
                  }
                  onClear={isReadOnly ? undefined : () => setYAxis([])}
                  disabled={isReadOnly}
                />
              </div>
              <div className="encoding-zone-wrapper">
                <span className="encoding-label">SERIES</span>
                <AxisDropZone
                  label=""
                  accept="DIMENSION"
                  value={series}
                  onDrop={isReadOnly ? undefined : setSeries}
                  onClear={isReadOnly ? undefined : () => setSeries(null)}
                  disabled={isReadOnly}
                />
              </div>
              <div className="encoding-controls">
                <div className="control-item">
                  <span className="encoding-label">AGGREGATION</span>
                  <div className="select-wrapper">
                    <select
                      className="inline-select"
                      value={aggregation}
                      onChange={e => !isReadOnly && setAggregation(e.target.value)}
                      disabled={isReadOnly}
                    >

                      <option value="SUM">SUM</option>
                      <option value="AVG">AVG</option>
                      <option value="COUNT">COUNT</option>
                      <option value="MIN">MIN</option>
                      <option value="MAX">MAX</option>
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
              className="vb-section canvas-section"
              ref={chartScrollRef}
            >
            <div className="vb-card canvas-card glossy-card">
              <div className="card-body canvas-body">
                {previewLoading ? (
                  <div className="canvas-loading">
                    <div className="spinner"></div>
                    <span>Generating visualization...</span>
                  </div>
                ) : chartType && previewData ? (
                  <div className="chart-preview-container">
                    <ChartWidget
                      ref={chartWidgetRef}
                      chartType={chartType}
                      data={previewData}
                      reportId={viewMode === "view" ? reportId : null}
                      height="100%"
                    />
                  </div>
                ) : (
                  <div className="canvas-placeholder-modern">
                    <LayoutGrid size={60} strokeWidth={1} />
                    <h3>Build Your Visualization</h3>
                    <p>Select workspace → dataset → drag dimensions & measures</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </DndProvider>
  );
}