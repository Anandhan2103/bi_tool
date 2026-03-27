// src/pages/Workspace.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate,useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Database,
  BarChart3,
  LayoutGrid,
  Settings,
  Upload,
  Eye,
  Edit,
  Trash2,
  Plus
} from "lucide-react";

import api from "../api/api";
import "../styles/workspace.css";

const ITEMS_PER_PAGE = 9;

const Workspace = () => {

  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);

  // Safe ID resolver for MongoDB _id or PostgreSQL id
  const getId = (item) => item.id || item._id;

  const [workspace,setWorkspace] = useState(null);

  const [datasets,setDatasets] = useState([]);
  const [reports,setReports] = useState([]);
  const [dashboards,setDashboards] = useState([]);

  const [activeSection,setActiveSection] = useState("datasets");

  const [loading,setLoading] = useState(true);

  const [datasetPage,setDatasetPage] = useState(1);
  const [reportPage,setReportPage] = useState(1);
  const [dashboardPage,setDashboardPage] = useState(1);


  useEffect(()=>{
    loadData();
  },[id]);

  const loadData = async () => {

    setLoading(true);

    try{

      const ws = await api.get(`/workspaces/${id}`);
      setWorkspace(ws.data);

      const ds = await api.get(`workspaces/${id}/datasets`);
      setDatasets(ds.data);

      const rp = await api.get(`workspaces/${id}/reports`);
      setReports(rp.data);

      const db = await api.get(`workspaces/${id}/dashboards`);
      setDashboards(db.data);

    }catch(err){

      console.error(err);
      navigate("/workspaces");

    }

    setLoading(false);
  };

  const paginate = (items,page)=>{
    const start = (page-1)*ITEMS_PER_PAGE;
    return items.slice(start,start+ITEMS_PER_PAGE);
  };

  const Pagination = ({total,page,setPage})=>{

    const pages = Math.ceil(total/ITEMS_PER_PAGE);

    if(pages <= 1) return null;

    return(

      <div className="pagination">

        {Array.from({length:pages}).map((_,i)=>(
          <button
            key={i}
            className={page===i+1?"page active":"page"}
            onClick={()=>setPage(i+1)}
          >
            {i+1}
          </button>
        ))}

      </div>
    );
  };

  const deleteDataset = async (dataset)=>{

    if(!window.confirm(`Delete ${dataset.name}?`)) return;

    try{

      await api.delete(`datasets/${getId(dataset)}`);

      setDatasets(prev=>prev.filter(d=>getId(d)!==getId(dataset)));

      // Also filter reports that depend on this dataset
      setReports(prev=>prev.filter(r=>r.dataset_id !== getId(dataset)));

    }catch{
      alert("Delete failed");
    }
  };

  const deleteReport = async (report)=>{

    if(!window.confirm(`Delete ${report.name}?`)) return;

    try{

      await api.delete(`reports/${getId(report)}`);

      setReports(prev=>prev.filter(r=>getId(r)!==getId(report)));

    }catch{
      alert("Delete failed");
    }
  };

  const deleteDashboard = async (dashboard)=>{

    if(!window.confirm(`Delete ${dashboard.name}?`)) return;

    try{

      await api.delete(`dashboards/${getId(dashboard)}`);

      setDashboards(prev=>prev.filter(d=>getId(d)!==getId(dashboard)));

    }catch{
      alert("Delete failed");
    }
  };

  if(loading){

    return(
      <div className="workspace-loading">
        Loading workspace...
      </div>
    );
  }

  if(!workspace){

    return(
      <div className="workspace-error">
        Workspace not found
      </div>
    );
  }

  return(

  <div className="workspace-container">

  {/* HEADER */}

  <div className="workspace-header">

    <button
      className="btn-back"
      onClick={()=>navigate("/workspaces")}
    >
      <ArrowLeft size={18}/> Back
    </button>

    <div className="workspace-title">
      <h1>{workspace.name}</h1>
      <p>{workspace.description}</p>
    </div>

  </div>


  {/* CARD NAVIGATION */}

  <div className="workspace-nav">

    <div
      className={`nav-card ${activeSection==="datasets"?"active":""}`}
      onClick={()=>setActiveSection("datasets")}
    >
      <Database size={26}/>
      <h4>Datasets</h4>
      <p>{datasets.length} datasets</p>
    </div>

    <div
      className={`nav-card ${activeSection==="reports"?"active":""}`}
      onClick={()=>setActiveSection("reports")}
    >
      <BarChart3 size={26}/>
      <h4>Reports</h4>
      <p>{reports.length} reports</p>
    </div>

    <div
      className={`nav-card ${activeSection==="dashboards"?"active":""}`}
      onClick={()=>setActiveSection("dashboards")}
    >
      <LayoutGrid size={26}/>
      <h4>Dashboards</h4>
      <p>{dashboards.length} dashboards</p>
    </div>

    <div
      className={`nav-card ${activeSection==="settings"?"active":""}`}
      onClick={()=>setActiveSection("settings")}
    >
      <Settings size={26}/>
      <h4>Settings</h4>
      <p>Workspace config</p>
    </div>

  </div>


  {/* DATASETS SECTION */}

  {activeSection==="datasets" &&(

    <div className="section-card">

      <div className="section-header">

        <h3>DATASETS</h3>

        <button
          className="btn-primary"
          onClick={()=>navigate(`/upload?workspace_id=${id}`)}
        >
          <Upload size={16}/> Upload Dataset
        </button>

      </div>

      {datasets.length===0 ? (

        <div className="empty-state">
          <Database size={40}/>
          <h4>No datasets yet</h4>
          <p>Upload dataset to start analysis</p>
        </div>

      ) : (

        <>
          <div className="card-grid">

            {paginate(datasets, datasetPage).map(ds => (

              <div key={getId(ds)} className="dataset-card">

                <h4>{ds.name}</h4>

                <p>Created: {new Date(ds.created_at).toLocaleString()}</p>
                
                {/* Professional BI tool metadata */}
                {ds.row_count !== undefined && (
                  <p className="dataset-metadata">
                    {ds.row_count.toLocaleString()} rows 
                    {ds.columns?.length && ` • ${ds.columns.length} columns`}
                  </p>
                )}

                <div className="card-actions">

                  <button onClick={()=>navigate(`/dataset/${getId(ds)}`)}>
                    <Eye size={14}/> View
                  </button>

                  <button onClick={()=>navigate(`/dataset/${getId(ds)}/edit`)}>
                    <Edit size={14}/> Edit
                  </button>

                  <button onClick={()=>navigate(`/visual-builder?workspace=${id}&datasetId=${getId(ds)}`)}>
                    <BarChart3 size={14}/> Analyze
                  </button>

                  <button
                    className="danger"
                    onClick={()=>deleteDataset(ds)}
                  >
                    <Trash2 size={14}/> Delete
                  </button>

                </div>

              </div>

            ))}

          </div>

          <Pagination
            total={datasets.length}
            page={datasetPage}
            setPage={setDatasetPage}
          />
        </>

      )}

    </div>

  )}


  {/* REPORTS SECTION */}

  {activeSection==="reports" &&(

    <div className="section-card">

      <div className="section-header">

        <h3>REPORTS</h3>

        <button
          className="btn-primary"
          onClick={()=>navigate(`/visual-builder?workspace=${id}`)}
        >
          <Plus size={16}/> Create Report
        </button>

      </div>

      {reports.length===0 ? (

        <div className="empty-state">
          <BarChart3 size={40}/>
          <h4>No reports</h4>
          <p>Create report from dataset</p>
        </div>

      ) : (

        <>
          <div className="card-grid">

            {paginate(reports, reportPage).map(r => (

              <div key={getId(r)} className="dataset-card">

                <h4>{r.name}</h4>

                <p>Created: {new Date(r.created_at).toLocaleString()}</p>
                
                {/* Show related dataset name if available */}
                {r.dataset_name && (
                  <p className="dataset-metadata">Dataset: {r.dataset_name}</p>
                )}

                <div className="card-actions">

                  <button onClick={()=>navigate(`/visual-builder?workspace=${id}&reportId=${getId(r)}&mode=view`)}>
                    <Eye size={14}/> View
                  </button>

                  <button onClick={()=>navigate(`/visual-builder?workspace=${id}&reportId=${getId(r)}&mode=edit`)}>
                    <Edit size={14}/> Edit
                  </button>

                  <button
                    className="danger"
                    onClick={()=>deleteReport(r)}
                  >
                    <Trash2 size={14}/> Delete
                  </button>

                </div>

              </div>

            ))}

          </div>

          <Pagination
            total={reports.length}
            page={reportPage}
            setPage={setReportPage}
          />
        </>

      )}

    </div>

  )}


  {/* DASHBOARDS SECTION */}

  {activeSection==="dashboards" &&(

    <div className="section-card">

      <div className="section-header">

        <h3>DASHBOARDS</h3>

        <button
          className="btn-primary"
          onClick={()=>navigate(`/builder?workspace=${id}`)}
        >
          <Plus size={16}/> Create Dashboard
        </button>

      </div>

      {dashboards.length===0 ? (

        <div className="empty-state">
          <LayoutGrid size={40}/>
          <h4>No dashboards</h4>
          <p>Create dashboard to visualize reports</p>
        </div>

      ) : (

        <>
          <div className="card-grid">

            {paginate(dashboards, dashboardPage).map(d => (

              <div key={getId(d)} className="dataset-card">

                <h4>{d.name}</h4>

                <p>Created: {new Date(d.created_at).toLocaleString()}</p>
                
                {/* Show report count if available */}
                {d.report_count !== undefined && (
                  <p className="dataset-metadata">{d.report_count} reports</p>
                )}

                <div className="card-actions">

                  <button onClick={()=>navigate(`/builder/${getId(d)}?workspace=${id}&mode=view`)}>
                    <Eye size={14}/> View
                  </button>

                  <button onClick={()=>navigate(`/builder/${getId(d)}?workspace=${id}&mode=edit`)}>
                    <Edit size={14}/> Edit
                  </button>

                  <button
                    className="danger"
                    onClick={()=>deleteDashboard(d)}
                  >
                    <Trash2 size={14}/> Delete
                  </button>

                </div>

              </div>

            ))}

          </div>

          <Pagination
            total={dashboards.length}
            page={dashboardPage}
            setPage={setDashboardPage}
          />
        </>

      )}

    </div>

  )}


  {/* SETTINGS */}

  {activeSection==="settings" &&(

    <div className="section-card">

      <h3>Workspace Settings</h3>

      <div className="setting-row">
        <label>Name</label>
        <input value={workspace.name} readOnly/>
      </div>

      <div className="setting-row">
        <label>Description</label>
        <textarea value={workspace.description} readOnly/>
      </div>

      <div className="setting-row">
        <label>ID</label>
        <input value={workspace.id} readOnly/>
      </div>

      <div className="setting-row">
        <label>Created</label>
        <input value={new Date(workspace.created_at).toLocaleString()} readOnly/>
      </div>

    </div>

  )}

  </div>
  );
};

export default Workspace;