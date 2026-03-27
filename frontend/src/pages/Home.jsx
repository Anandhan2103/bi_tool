import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Upload,
  Database,
  LayoutDashboard,
  BarChart3
} from "lucide-react";

import api from "../api/api";
import "../styles/home.css";

const Home = () => {

  const [stats, setStats] = useState({
    datasets: 0,
    dashboards: 0,
    charts: 0
  });

  const [recentWorkspaces, setRecentWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  const getId = (item) => item?.id || item?._id;

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {

      const [statsRes, wsRes] = await Promise.all([
        api.get("/home/stats"),
        api.get("/workspaces/recent")
      ]);

      setStats({
        datasets: statsRes.data?.datasets || 0,
        dashboards: statsRes.data?.dashboards || 0,
        charts: statsRes.data?.charts || 0
      });

      setRecentWorkspaces(wsRes.data || []);

    } catch (err) {
      console.error("Home load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return <div className="home-loading">Loading dashboard...</div>;
  }

  return (
    <div className="home-page">

      <div className="home-header">
        <h1>Welcome to Nutmeg BI</h1>
        <p>Build dashboards, manage data sources and explore analytics.</p>
      </div>

      <div className="stats-grid">

        <div className="stat-card">
          <Database size={20} />
          <div>
            <h3>{stats.datasets}</h3>
            <p>Datasets</p>
          </div>
        </div>

        <div className="stat-card">
          <LayoutDashboard size={20} />
          <div>
            <h3>{stats.dashboards}</h3>
            <p>Dashboards</p>
          </div>
        </div>

        <div className="stat-card">
          <BarChart3 size={20} />
          <div>
            <h3>{stats.charts}</h3>
            <p>Charts</p>
          </div>
        </div>

      </div>

      <div className="action-grid">

        <Link to="/workspaces" className="action-card">
          <Plus size={22}/>
          <div>
            <h3>Create Workspace</h3>
            <p>Start a new analytics workspace</p>
          </div>
        </Link>

        <Link to="/upload" className="action-card">
          <Upload size={22}/>
          <div>
            <h3>Upload Data</h3>
            <p>Add datasets to your workspace</p>
          </div>
        </Link>

      </div>

      <div className="recent-section">

        <h2>Recent Workspaces</h2>

        <div className="recent-grid">

          {recentWorkspaces.length === 0 ? (
            <div className="empty-state">
              No workspaces yet
            </div>
          ) : (
            recentWorkspaces.map((ws) => (
              <Link
                key={getId(ws)}
                to={`/workspaces/${getId(ws)}`}
                className="workspace-card"
              >
                <h4>{ws?.name}</h4>
                <p>
                  Updated {formatDate(ws?.updated_at)}
                </p>
              </Link>
            ))
          )}

        </div>

      </div>

    </div>
  );
};

export default Home;