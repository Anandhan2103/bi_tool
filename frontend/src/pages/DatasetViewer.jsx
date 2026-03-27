// src/pages/DatasetViewer.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  Download,
  BarChart3,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  FileText,
  Database,
  Calendar,
  User,
  Hash,
  Type,
  Check,
  X,
  Copy,
  ExternalLink,
  Settings,
  MoreVertical,
  RefreshCw,
  Info,
  TrendingUp,
  Percent
} from "lucide-react";
import { 
  getWorkspaceDatasets, 
  getWorkspace,
  getDatasetData 
} from "../utils/workspaceStore";
import { formatFileSize, formatDate, analyzeColumn } from "../utils/dataUtils";
import "../styles/datasetViewer.css";

const DatasetViewer = () => {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const workspaceId = queryParams.get('workspace') || 'general';
  
  const [dataset, setDataset] = useState(null);
  const [workspaceInfo, setWorkspaceInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(50);
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [datasetData, setDatasetData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [columnStats, setColumnStats] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDatasetData();
  }, [datasetId, workspaceId]);

  const loadDatasetData = async () => {
    setLoading(true);
    try {
      // Load workspace info
      const workspace = getWorkspace(workspaceId);
      setWorkspaceInfo(workspace);
      
      // Load dataset
      const datasets = getWorkspaceDatasets(workspaceId);
      const foundDataset = datasets.find(ds => ds.id === datasetId);
      
      if (!foundDataset) {
        setError("Dataset not found");
        return;
      }
      
      setDataset(foundDataset);
      
      // Load actual dataset data
      const data = await getDatasetData(workspaceId, datasetId);
      setDatasetData(data);
      
      // Extract columns from first row or use dataset schema
      if (data.length > 0) {
        const firstRow = data[0];
        const extractedColumns = Object.keys(firstRow).map(key => {
          const values = data.map(row => row[key]);
          const analysis = analyzeColumn(values);
          
          return {
            key,
            label: formatColumnName(key),
            type: analysis.type,
            uniqueCount: analysis.uniqueCount,
            sampleValues: analysis.sampleValues,
            stats: analysis.stats
          };
        });
        
        setColumns(extractedColumns);
        
        // Calculate column statistics
        const stats = {};
        extractedColumns.forEach(col => {
          stats[col.key] = col.stats;
        });
        setColumnStats(stats);
      } else if (foundDataset.schema) {
        // Use schema from dataset if no data
        const schemaColumns = foundDataset.schema.map(field => ({
          key: field.name,
          label: formatColumnName(field.name),
          type: field.type || 'string',
          uniqueCount: 0,
          sampleValues: [],
          stats: {}
        }));
        setColumns(schemaColumns);
      }
      
    } catch (error) {
      console.error("Error loading dataset:", error);
      setError("Failed to load dataset");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDatasetData();
    } finally {
      setRefreshing(false);
    }
  };

  const formatColumnName = (name) => {
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Filter data based on search
  const filteredData = datasetData.filter(row => 
    Object.values(row).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;
    
    if (sortConfig.direction === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleRowSelect = (id) => {
    setSelectedRows(prev =>
      prev.includes(id)
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === paginatedData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedData.map(row => row.id || row._id || row.rowId));
    }
  };

  const handleCreateReport = () => {
    if (dataset) {
      navigate(`/visual-builder?workspace=${workspaceId}&dataset=${dataset.id}`, {
        state: {
          datasetData: datasetData,
          columns: columns,
          workspaceKey: workspaceId,
          datasetName: dataset.name
        }
      });
    }
  };

  const handleDownloadData = () => {
    if (datasetData.length === 0) {
      alert("No data to download");
      return;
    }

    const csvContent = [
      columns.map(col => col.label).join(','),
      ...datasetData.map(row => 
        columns.map(col => {
          const value = row[col.key];
          // Escape quotes and wrap in quotes if contains commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportSelected = () => {
    if (selectedRows.length === 0) {
      alert("No rows selected");
      return;
    }

    const selectedData = datasetData.filter(row => 
      selectedRows.includes(row.id || row._id || row.rowId)
    );

    const csvContent = [
      columns.map(col => col.label).join(','),
      ...selectedData.map(row => 
        columns.map(col => {
          const value = row[col.key];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_selected_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'number':
      case 'integer':
      case 'float':
        return <Hash size={14} />;
      case 'date':
      case 'datetime':
        return <Calendar size={14} />;
      case 'boolean':
        return <Check size={14} />;
      default:
        return <Type size={14} />;
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'number':
      case 'integer':
      case 'float':
        return '#3b82f6';
      case 'date':
      case 'datetime':
        return '#10b981';
      case 'boolean':
        return '#8b5cf6';
      default:
        return '#64748b';
    }
  };

  const formatValue = (value, type) => {
    if (value == null) return '—';
    
    switch(type) {
      case 'number':
      case 'integer':
      case 'float':
        return new Intl.NumberFormat().format(value);
      case 'date':
        return formatDate(value, { year: 'numeric', month: 'short', day: 'numeric' });
      case 'datetime':
        return formatDate(value, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      default:
        return String(value);
    }
  };

  if (loading) {
    return (
      <div className="dataset-viewer-loading">
        <div className="loading-spinner"></div>
        <p>Loading dataset...</p>
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="dataset-viewer-error">
        <X size={48} />
        <h3>Dataset Not Found</h3>
        <p>{error || "The requested dataset could not be loaded."}</p>
        <button 
          className="btn btn-primary"
          onClick={() => navigate(`/workspace/${workspaceId}`)}
        >
          <ArrowLeft size={16} />
          Back to Workspace
        </button>
      </div>
    );
  }

  return (
    <div className="dataset-viewer">
      {/* Header */}
      <header className="dataset-header">
        <div className="header-left">
          <button 
            className="btn-back"
            onClick={() => navigate(`/workspace/${workspaceId}`)}
          >
            <ArrowLeft size={18} />
            Back to Workspace
          </button>
          
          <div className="dataset-info">
            <div className="dataset-icon">
              <Database size={24} />
            </div>
            <div>
              <h1>{dataset.name}</h1>
              <div className="dataset-meta">
                <span className="meta-item">
                  <Database size={14} />
                  {workspaceInfo?.name || "Workspace"}
                </span>
                {dataset.uploadedAt && (
                  <span className="meta-item">
                    <Calendar size={14} />
                    Uploaded: {formatDate(dataset.uploadedAt, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
                {dataset.type && (
                  <span className="meta-item">
                    <FileText size={14} />
                    {dataset.type}
                  </span>
                )}
                {dataset.size && (
                  <span className="meta-item">
                    <Hash size={14} />
                    {formatFileSize(dataset.size)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="btn btn-icon"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh Data"
          >
            <RefreshCw size={16} className={refreshing ? "spin" : ""} />
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleDownloadData}
            disabled={datasetData.length === 0}
          >
            <Download size={16} />
            Download CSV
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleCreateReport}
            disabled={datasetData.length === 0}
          >
            <BarChart3 size={16} />
            Create Report
          </button>
        </div>
      </header>

      {/* Dataset Stats */}
      <div className="dataset-stats">
        <div className="stat-card">
          <div className="stat-icon primary">
            <Hash size={20} />
          </div>
          <div className="stat-content">
            <h3>{datasetData.length.toLocaleString()}</h3>
            <p>Total Rows</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon secondary">
            <Type size={20} />
          </div>
          <div className="stat-content">
            <h3>{columns.length}</h3>
            <p>Columns</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon success">
            <TrendingUp size={20} />
          </div>
          <div className="stat-content">
            <h3>{Object.values(columnStats).filter(stats => stats.type === 'number').length}</h3>
            <p>Numeric Columns</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon warning">
            <Percent size={20} />
          </div>
          <div className="stat-content">
            <h3>
              {datasetData.length > 0 
                ? ((new Set(datasetData.map(row => row[columns[0]?.key] || '')).size / datasetData.length) * 100).toFixed(1)
                : '0'
              }%
            </h3>
            <p>Unique in First Column</p>
          </div>
        </div>
      </div>

      {/* Data Preview */}
      <div className="data-preview-section">
        <div className="section-header">
          <h2>Data Preview</h2>
          <div className="controls">
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search in dataset..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  className="clear-search"
                  onClick={() => setSearchTerm('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {datasetData.length > 0 && (
              <div className="pagination-controls">
                <span className="pagination-info">
                  Showing {startIndex + 1}-{Math.min(endIndex, sortedData.length)} of {sortedData.length} rows
                </span>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  ←
                </button>
                <span className="page-number">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>

        {datasetData.length > 0 ? (
          <>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="select-cell">
                      <input
                        type="checkbox"
                        checked={selectedRows.length === paginatedData.length && paginatedData.length > 0}
                        onChange={handleSelectAll}
                        data-indeterminate={selectedRows.length > 0 && selectedRows.length < paginatedData.length}
                      />
                    </th>
                    {columns.slice(0, 10).map(column => (
                      <th 
                        key={column.key}
                        onClick={() => handleSort(column.key)}
                        className={`sortable ${sortConfig.key === column.key ? 'active' : ''}`}
                      >
                        <div className="column-header">
                          <div className="column-header-info">
                            <span className="column-icon" style={{ color: getTypeColor(column.type) }}>
                              {getTypeIcon(column.type)}
                            </span>
                            <span className="column-title">{column.label}</span>
                          </div>
                          {sortConfig.key === column.key && (
                            <span className="sort-indicator">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                    {columns.length > 10 && (
                      <th className="more-columns">
                        +{columns.length - 10} more
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, index) => (
                    <tr key={row.id || row._id || index} 
                        className={selectedRows.includes(row.id || row._id || index) ? 'selected' : ''}>
                      <td className="select-cell">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(row.id || row._id || index)}
                          onChange={() => handleRowSelect(row.id || row._id || index)}
                        />
                      </td>
                      {columns.slice(0, 10).map(column => (
                        <td key={column.key} className={`cell-${column.type}`}>
                          {formatValue(row[column.key], column.type)}
                        </td>
                      ))}
                      {columns.length > 10 && (
                        <td className="more-data">
                          ...
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {sortedData.length === 0 && (
              <div className="empty-data">
                <Search size={48} />
                <h3>No data found</h3>
                <p>Try adjusting your search terms</p>
              </div>
            )}
          </>
        ) : (
          <div className="no-data-message">
            <Info size={48} />
            <h3>No Data Available</h3>
            <p>This dataset doesn't contain any data rows.</p>
            <button 
              className="btn btn-secondary"
              onClick={handleRefresh}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Column Information */}
      {columns.length > 0 && (
        <div className="columns-section">
          <div className="section-header">
            <h2>Column Information</h2>
            <div className="section-subtitle">
              {datasetData.length > 0 
                ? `Analyzed ${datasetData.length} rows` 
                : 'Based on dataset schema'}
            </div>
          </div>
          <div className="columns-grid">
            {columns.map(column => {
              const stats = columnStats[column.key] || column.stats || {};
              
              return (
                <div key={column.key} className="column-card">
                  <div className="column-header">
                    <div className="column-title-section">
                      <span className="column-icon" style={{ color: getTypeColor(column.type) }}>
                        {getTypeIcon(column.type)}
                      </span>
                      <span className="column-name">{column.label}</span>
                    </div>
                    <span className={`column-type ${column.type}`} style={{ backgroundColor: getTypeColor(column.type) + '20' }}>
                      {column.type.charAt(0).toUpperCase() + column.type.slice(1)}
                    </span>
                  </div>
                  <div className="column-stats">
                    <div className="stat-item">
                      <span className="stat-label">Unique Values:</span>
                      <span className="stat-value">{stats.uniqueCount || column.uniqueCount || 0}</span>
                    </div>
                    
                    {stats.type === 'number' && stats.mean != null && (
                      <>
                        <div className="stat-item">
                          <span className="stat-label">Mean:</span>
                          <span className="stat-value">{stats.mean?.toFixed(2)}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Min:</span>
                          <span className="stat-value">{stats.min?.toLocaleString()}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Max:</span>
                          <span className="stat-value">{stats.max?.toLocaleString()}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Std Dev:</span>
                          <span className="stat-value">{stats.stdDev?.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    
                    {stats.sampleValues && stats.sampleValues.length > 0 && (
                      <div className="stat-item full-width">
                        <span className="stat-label">Sample Values:</span>
                        <div className="sample-values">
                          {stats.sampleValues.map((value, idx) => (
                            <span key={idx} className="sample-value">
                              {String(value).length > 20 
                                ? String(value).substring(0, 20) + '...'
                                : value
                              }
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {column.sampleValues && column.sampleValues.length > 0 && !stats.sampleValues && (
                      <div className="stat-item full-width">
                        <span className="stat-label">Sample Values:</span>
                        <div className="sample-values">
                          {column.sampleValues.map((value, idx) => (
                            <span key={idx} className="sample-value">
                              {String(value).length > 20 
                                ? String(value).substring(0, 20) + '...'
                                : value
                              }
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions Footer */}
      <div className="actions-footer">
        <div className="selected-info">
          {selectedRows.length > 0 && (
            <>
              <span className="selected-count">
                <Check size={14} />
                {selectedRows.length} rows selected
              </span>
              <button 
                className="btn btn-sm btn-secondary"
                onClick={handleExportSelected}
              >
                <Download size={14} />
                Export Selected
              </button>
              <button 
                className="btn btn-sm btn-secondary"
                onClick={() => setSelectedRows([])}
              >
                <X size={14} />
                Clear Selection
              </button>
            </>
          )}
        </div>
        <div className="action-buttons">
          <button 
            className="btn btn-secondary"
            onClick={() => navigate(`/workspace/${workspaceId}`)}
          >
            <ArrowLeft size={16} />
            Back to Workspace
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleCreateReport}
            disabled={datasetData.length === 0}
          >
            <BarChart3 size={16} />
            Create Visualization
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatasetViewer;