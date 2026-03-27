// src/pages/ReportViewer.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  Download,
  BarChart3,
  PieChart,
  LineChart,
  Table as TableIcon,
  Edit,
  Share2,
  Copy,
  ExternalLink,
  Settings,
  MoreVertical,
  Filter,
  Calendar,
  User,
  Database,
  ChevronRight,
  RefreshCw,
  Maximize2,
  Printer,
  FileText
} from "lucide-react";
import { getWorkspaceReports, getWorkspace } from "../utils/workspaceStore";
import { formatDate } from "../utils/dataUtils";
import "../styles/reportViewer.css";

const ReportViewer = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const workspaceId = queryParams.get('workspace') || 'general';
  
  const [report, setReport] = useState(null);
  const [workspaceInfo, setWorkspaceInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [dataView, setDataView] = useState('chart'); // 'chart' or 'table'

  useEffect(() => {
    loadReportData();
  }, [reportId, workspaceId]);

  const loadReportData = () => {
    setLoading(true);
    try {
      // Load workspace info
      const workspace = getWorkspace(workspaceId);
      setWorkspaceInfo(workspace);
      
      // Load report
      const reports = getWorkspaceReports(workspaceId);
      const foundReport = reports.find(r => r.id === reportId);
      
      if (!foundReport) {
        setError("Report not found");
        return;
      }
      
      setReport(foundReport);
      
    } catch (error) {
      console.error("Error loading report:", error);
      setError("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  // Sample chart data
  const chartData = [
    { month: 'Jan', sales: 4000, profit: 2400 },
    { month: 'Feb', sales: 3000, profit: 1398 },
    { month: 'Mar', sales: 2000, profit: 9800 },
    { month: 'Apr', sales: 2780, profit: 3908 },
    { month: 'May', sales: 1890, profit: 4800 },
    { month: 'Jun', sales: 2390, profit: 3800 },
    { month: 'Jul', sales: 3490, profit: 4300 },
  ];

  const handleEditReport = () => {
    if (report) {
      navigate(`/visual-builder?workspace=${workspaceId}&report=${report.id}`);
    }
  };

  const handleDownloadReport = () => {
    // In a real app, this would generate a PDF or image
    alert("Report download would be generated here");
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleShareReport = () => {
    // In a real app, this would generate a shareable link
    const shareUrl = `${window.location.origin}/report/${reportId}?workspace=${workspaceId}`;
    navigator.clipboard.writeText(shareUrl);
    alert("Report link copied to clipboard!");
  };

  const renderChart = () => {
    if (!report) return null;
    
    const chartType = report.type || report.config?.chartType || 'bar';
    
    switch (chartType) {
      case 'bar':
        return (
          <div className="chart-container bar-chart">
            <h3>Bar Chart: Sales vs Profit</h3>
            <div className="chart-bars">
              {chartData.map((item, index) => (
                <div key={index} className="chart-bar-group">
                  <div className="bar-label">{item.month}</div>
                  <div className="bars">
                    <div 
                      className="bar sales" 
                      style={{ height: `${item.sales / 50}px` }}
                      title={`Sales: $${item.sales}`}
                    >
                      <span className="bar-value">${item.sales}</span>
                    </div>
                    <div 
                      className="bar profit" 
                      style={{ height: `${item.profit / 50}px` }}
                      title={`Profit: $${item.profit}`}
                    >
                      <span className="bar-value">${item.profit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-color sales"></div>
                <span>Sales</span>
              </div>
              <div className="legend-item">
                <div className="legend-color profit"></div>
                <span>Profit</span>
              </div>
            </div>
          </div>
        );
        
      case 'line':
        return (
          <div className="chart-container line-chart">
            <h3>Line Chart: Monthly Trend</h3>
            <div className="chart-lines">
              <div className="line sales">
                {chartData.map((item, index) => (
                  <div 
                    key={index}
                    className="data-point"
                    style={{ 
                      left: `${(index / (chartData.length - 1)) * 100}%`,
                      bottom: `${(item.sales / 5000) * 100}%`
                    }}
                    title={`${item.month}: $${item.sales}`}
                  ></div>
                ))}
              </div>
              <div className="line profit">
                {chartData.map((item, index) => (
                  <div 
                    key={index}
                    className="data-point"
                    style={{ 
                      left: `${(index / (chartData.length - 1)) * 100}%`,
                      bottom: `${(item.profit / 10000) * 100}%`
                    }}
                    title={`${item.month}: $${item.profit}`}
                  ></div>
                ))}
              </div>
            </div>
            <div className="x-axis">
              {chartData.map(item => (
                <div key={item.month} className="x-label">{item.month}</div>
              ))}
            </div>
          </div>
        );
        
      case 'pie':
        return (
          <div className="chart-container pie-chart">
            <h3>Pie Chart: Sales Distribution</h3>
            <div className="pie-chart-visual">
              <div className="pie-segment" style={{ '--percentage': '30%', '--color': '#4f46e5' }}></div>
              <div className="pie-segment" style={{ '--percentage': '25%', '--color': '#0891b2' }}></div>
              <div className="pie-segment" style={{ '--percentage': '20%', '--color': '#059669' }}></div>
              <div className="pie-segment" style={{ '--percentage': '15%', '--color': '#ea580c' }}></div>
              <div className="pie-segment" style={{ '--percentage': '10%', '--color': '#dc2626' }}></div>
            </div>
            <div className="pie-legend">
              {['Electronics', 'Clothing', 'Home & Garden', 'Books', 'Other'].map((category, index) => (
                <div key={index} className="legend-item">
                  <div 
                    className="legend-color" 
                    style={{ 
                      backgroundColor: ['#4f46e5', '#0891b2', '#059669', '#ea580c', '#dc2626'][index] 
                    }}
                  ></div>
                  <span>{category}</span>
                  <span className="percentage">
                    {['30%', '25%', '20%', '15%', '10%'][index]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'table':
        return (
          <div className="chart-container table-chart">
            <h3>Data Table</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Sales ($)</th>
                  <th>Profit ($)</th>
                  <th>Profit Margin</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((item, index) => (
                  <tr key={index}>
                    <td>{item.month}</td>
                    <td>${item.sales.toLocaleString()}</td>
                    <td>${item.profit.toLocaleString()}</td>
                    <td>{((item.profit / item.sales) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        
      default:
        return (
          <div className="chart-container default-chart">
            <h3>Chart Preview</h3>
            <div className="chart-placeholder">
              {chartType === 'bar' && <BarChart3 size={48} />}
              {chartType === 'line' && <LineChart size={48} />}
              {chartType === 'pie' && <PieChart size={48} />}
              {chartType === 'table' && <TableIcon size={48} />}
              <p>{chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart</p>
            </div>
          </div>
        );
    }
  };

  const renderDataTable = () => {
    return (
      <div className="data-table-container">
        <h3>Underlying Data</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Sales ($)</th>
              <th>Profit ($)</th>
              <th>Profit Margin</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((item, index) => (
              <tr key={index}>
                <td>{item.month}</td>
                <td className="numeric">${item.sales.toLocaleString()}</td>
                <td className="numeric">${item.profit.toLocaleString()}</td>
                <td className="numeric">{((item.profit / item.sales) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td className="numeric">${chartData.reduce((sum, item) => sum + item.sales, 0).toLocaleString()}</td>
              <td className="numeric">${chartData.reduce((sum, item) => sum + item.profit, 0).toLocaleString()}</td>
              <td className="numeric">
                {((chartData.reduce((sum, item) => sum + item.profit, 0) / 
                   chartData.reduce((sum, item) => sum + item.sales, 0)) * 100).toFixed(1)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="report-viewer-loading">
        <div className="loading-spinner"></div>
        <p>Loading report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="report-viewer-error">
        <FileText size={48} />
        <h3>Report Not Found</h3>
        <p>{error || "The requested report could not be loaded."}</p>
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

  const chartType = report.type || report.config?.chartType || 'bar';
  const chartIcon = {
    bar: BarChart3,
    line: LineChart,
    pie: PieChart,
    table: TableIcon
  }[chartType] || BarChart3;

  const ChartIcon = chartIcon;

  return (
    <div className={`report-viewer ${fullscreen ? 'fullscreen' : ''}`}>
      {/* Header */}
      <header className="report-header">
        <div className="header-left">
          <button 
            className="btn-back"
            onClick={() => navigate(`/workspace/${workspaceId}?tab=reports`)}
          >
            <ArrowLeft size={18} />
            Back to Reports
          </button>
          
          <div className="report-info">
            <div className="report-icon">
              <ChartIcon size={24} />
            </div>
            <div>
              <h1>{report.name}</h1>
              <div className="report-meta">
                <span className="meta-item">
                  <Database size={14} />
                  {workspaceInfo?.name || "Workspace"}
                </span>
                <span className="meta-item">
                  <Calendar size={14} />
                  Created: {formatDate(report.createdAt)}
                </span>
                {report.lastModified !== report.createdAt && (
                  <span className="meta-item">
                    <RefreshCw size={14} />
                    Updated: {formatDate(report.lastModified)}
                  </span>
                )}
                <span className="meta-item">
                  <User size={14} />
                  {report.createdBy || "User"}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => setFullscreen(!fullscreen)}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            <Maximize2 size={16} />
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handlePrintReport}
            title="Print report"
          >
            <Printer size={16} />
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleDownloadReport}
            title="Download report"
          >
            <Download size={16} />
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleEditReport}
            title="Edit report"
          >
            <Edit size={16} />
            Edit
          </button>
        </div>
      </header>

      {/* Report Description */}
      {report.description && (
        <div className="report-description">
          <p>{report.description}</p>
        </div>
      )}

      {/* Report Controls */}
      <div className="report-controls">
        <div className="view-toggle">
          <button 
            className={`view-btn ${dataView === 'chart' ? 'active' : ''}`}
            onClick={() => setDataView('chart')}
          >
            <ChartIcon size={16} />
            Chart View
          </button>
          <button 
            className={`view-btn ${dataView === 'table' ? 'active' : ''}`}
            onClick={() => setDataView('table')}
          >
            <TableIcon size={16} />
            Data View
          </button>
        </div>
        
        <div className="control-actions">
          <button 
            className="btn btn-secondary"
            onClick={handleShareReport}
          >
            <Share2 size={16} />
            Share
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleEditReport}
          >
            <Copy size={16} />
            Duplicate
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="report-content">
        {dataView === 'chart' ? renderChart() : renderDataTable()}
        
        {/* Report Metadata */}
        <div className="report-metadata">
          <h3>Report Details</h3>
          <div className="metadata-grid">
            <div className="metadata-item">
              <span className="metadata-label">Chart Type:</span>
              <span className="metadata-value">{chartType.charAt(0).toUpperCase() + chartType.slice(1)}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Data Source:</span>
              <span className="metadata-value">{report.dataset || "Unknown Dataset"}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Data Points:</span>
              <span className="metadata-value">{report.data?.length || chartData.length}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Created:</span>
              <span className="metadata-value">{formatDate(report.createdAt)}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Last Modified:</span>
              <span className="metadata-value">{formatDate(report.lastModified)}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Workspace:</span>
              <span className="metadata-value">{workspaceInfo?.name || "General"}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Actions Footer */}
      <div className="actions-footer">
        <button 
          className="btn btn-secondary"
          onClick={() => navigate(`/workspace/${workspaceId}?tab=reports`)}
        >
          <ArrowLeft size={16} />
          Back to Reports
        </button>
        <div className="action-group">
          <button 
            className="btn btn-secondary"
            onClick={handleShareReport}
          >
            <Share2 size={16} />
            Share Report
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleEditReport}
          >
            <Edit size={16} />
            Edit Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportViewer;