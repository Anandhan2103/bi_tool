import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Download, 
  Edit2, 
  Share2, 
  BarChart3, 
  PieChart, 
  LineChart, 
  Table,
  Calendar,
  Folder,
  Eye,
  Filter
} from "lucide-react";

const VisualizationViewer = () => {
  const { vizId } = useParams();
  const navigate = useNavigate();
  const [visualization, setVisualization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const loadVisualization = () => {
      try {
        // Try to load from localStorage first
        const savedViz = JSON.parse(localStorage.getItem('nutmeg_visualizations') || '[]');
        const viz = savedViz.find(v => v.id === vizId);
        
        if (viz) {
          setVisualization(viz);
        } else {
          // Try workspace store
          const workspaces = JSON.parse(localStorage.getItem('workspaces') || '[]');
          for (const workspace of workspaces) {
            if (workspace.visualizations) {
              const viz = workspace.visualizations.find(v => v.id === vizId);
              if (viz) {
                setVisualization(viz);
                return;
              }
            }
          }
          setError("Visualization not found");
        }
      } catch (err) {
        console.error("Error loading visualization:", err);
        setError("Failed to load visualization");
      } finally {
        setLoading(false);
      }
    };
    
    loadVisualization();
  }, [vizId]);
  
  const getChartIcon = (chartType) => {
    switch (chartType) {
      case 'bar': return <BarChart3 size={24} />;
      case 'line': return <LineChart size={24} />;
      case 'pie': return <PieChart size={24} />;
      case 'table': return <Table size={24} />;
      default: return <BarChart3 size={24} />;
    }
  };
  
  const exportData = () => {
    if (!visualization?.data?.length) return;
    
    const csvContent = [
      Object.keys(visualization.data[0]).join(","),
      ...visualization.data.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' ? `"${value}"` : value
        ).join(",")
      )
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${visualization.name.replace(/\s+/g, '_')}_data.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  const renderChart = () => {
    if (!visualization) return null;
    
    const { chartType, xAxis, yAxis } = visualization.config;
    const data = visualization.data || [];
    
    if (chartType === 'table') {
      return (
        <div className="simple-table">
          <table>
            <thead>
              <tr>
                <th>{xAxis?.displayName || 'Category'}</th>
                {yAxis.map(y => (
                  <th key={y.id}>{y.displayName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx}>
                  <td>{row[xAxis?.name] || 'N/A'}</td>
                  {yAxis.map(y => (
                    <td key={y.id} className="numeric">
                      {typeof row[y.name] === 'number' 
                        ? row[y.name].toLocaleString() 
                        : row[y.name] || "0"
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    
    if (chartType === 'bar') {
      const maxVal = Math.max(...data.map(d => d[yAxis[0]?.name] || 0));
      return (
        <div className="simple-bar-chart">
          {data.map((item, idx) => {
            const value = item[yAxis[0]?.name] || 0;
            const percentage = maxVal > 0 ? (value / maxVal) * 100 : 0;
            return (
              <div key={idx} className="bar-row">
                <span className="bar-label">{item[xAxis?.name] || `Item ${idx + 1}`}</span>
                <div className="bar-container">
                  <div 
                    className="bar" 
                    style={{ width: `${percentage}%` }}
                    title={`${value.toLocaleString()}`}
                  >
                    <span className="bar-value">{value.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    
    if (chartType === 'pie') {
      const total = data.reduce((sum, item) => sum + (item[yAxis[0]?.name] || 0), 0);
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
      
      return (
        <div className="simple-pie-chart">
          <div className="pie-legend">
            {data.map((item, idx) => {
              const value = item[yAxis[0]?.name] || 0;
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return (
                <div key={idx} className="legend-item">
                  <div className="color-dot" style={{ backgroundColor: colors[idx % colors.length] }} />
                  <span className="legend-label">{item[xAxis?.name] || `Item ${idx + 1}`}</span>
                  <span className="legend-value">
                    {value.toLocaleString()} ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
          <div className="pie-visual">
            {data.map((item, idx) => {
              const value = item[yAxis[0]?.name] || 0;
              const percentage = total > 0 ? (value / total) * 100 : 0;
              const rotation = data.slice(0, idx).reduce((sum, item) => 
                sum + (item[yAxis[0]?.name] || 0) / total * 360, 0
              );
              
              return (
                <div 
                  key={idx}
                  className="pie-segment"
                  style={{
                    backgroundColor: colors[idx % colors.length],
                    transform: `rotate(${rotation}deg)`,
                    clipPath: `inset(0 0 0 0)`,
                    width: '200px',
                    height: '200px',
                    borderRadius: '50%',
                    position: 'absolute',
                    opacity: 0.8
                  }}
                />
              );
            })}
          </div>
        </div>
      );
    }
    
    return (
      <div className="chart-placeholder">
        <BarChart3 size={48} />
        <p>Chart preview not available for {chartType} chart</p>
      </div>
    );
  };
  
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  };
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading visualization...</p>
      </div>
    );
  }
  
  if (error || !visualization) {
    return (
      <div className="error-container">
        <h2>{error || "Visualization not found"}</h2>
        <p>The visualization you're looking for doesn't exist or has been deleted.</p>
        <button 
          onClick={() => navigate('/workspaces')}
          className="btn-primary"
        >
          <ArrowLeft size={16} />
          Back to Workspaces
        </button>
      </div>
    );
  }
  
  return (
    <div className="visualization-viewer">
      <div className="viewer-header">
        <div className="header-left">
          <button 
            onClick={() => navigate(-1)}
            className="btn-back"
          >
            <ArrowLeft size={20} />
            Back
          </button>
        </div>
        
        <div className="header-center">
          <h1>{visualization.name}</h1>
          <div className="header-subtitle">
            <span className="subtitle-item">
              <Calendar size={14} />
              Created {formatDate(visualization.createdAt)}
            </span>
            {visualization.workspaceName && (
              <span className="subtitle-item">
                <Folder size={14} />
                {visualization.workspaceName}
              </span>
            )}
          </div>
        </div>
        
        <div className="header-right">
          <div className="action-buttons">
            <button onClick={exportData} className="btn-secondary" title="Export Data">
              <Download size={18} />
            </button>
            <button 
              onClick={() => navigate(`/visual-builder?edit=${visualization.id}`)}
              className="btn-secondary"
              title="Edit"
            >
              <Edit2 size={18} />
            </button>
            <button className="btn-primary" title="Share">
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="viewer-content">
        <div className="viz-metadata">
          <div className="metadata-card">
            <h3>Chart Details</h3>
            <div className="metadata-grid">
              <div className="metadata-item">
                <span className="metadata-label">Chart Type:</span>
                <span className="metadata-value">
                  {visualization.config.chartType.charAt(0).toUpperCase() + 
                   visualization.config.chartType.slice(1)}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">X-Axis:</span>
                <span className="metadata-value">
                  {visualization.config.xAxis?.displayName || 'Not set'}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Y-Axis:</span>
                <span className="metadata-value">
                  {visualization.config.yAxis.map(y => y.displayName).join(", ")}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Aggregation:</span>
                <span className="metadata-value">
                  {visualization.config.aggregation}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Data Points:</span>
                <span className="metadata-value">
                  {(visualization.data || []).length}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Filters:</span>
                <span className="metadata-value">
                  {visualization.config.filters?.length || 0} applied
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="viz-preview">
          <div className="preview-header">
            <h2>Preview</h2>
            <div className="preview-actions">
              <span className="chart-type-badge">
                {getChartIcon(visualization.config.chartType)}
                {visualization.config.chartType.charAt(0).toUpperCase() + 
                 visualization.config.chartType.slice(1)} Chart
              </span>
            </div>
          </div>
          <div className="preview-content">
            {renderChart()}
          </div>
        </div>
        
        <div className="viz-data">
          <div className="data-header">
            <h2>Data Table</h2>
            <span className="data-count">
              {(visualization.data || []).length} rows
            </span>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{visualization.config.xAxis?.displayName || 'Category'}</th>
                  {visualization.config.yAxis.map(y => (
                    <th key={y.id}>{y.displayName}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(visualization.data || []).map((row, idx) => (
                  <tr key={idx}>
                    <td>{row[visualization.config.xAxis?.name] || 'N/A'}</td>
                    {visualization.config.yAxis.map(y => (
                      <td key={y.id} className="numeric">
                        {typeof row[y.name] === 'number' 
                          ? row[y.name].toLocaleString() 
                          : row[y.name] || "0"
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualizationViewer;