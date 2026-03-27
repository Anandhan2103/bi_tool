// src/pages/layouts/Layout.jsx

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../../api/api";
import "../../styles/layout.css";

import {
  LayoutDashboard,
  Database,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PlusSquare,
  Home,
  BarChart3,
  Box
} from "lucide-react";

/* ================= Sidebar Item ================= */

const SidebarItem = ({ icon: Icon, label, to, isActive, collapsed }) => {
  return (
    <Link to={to} className={`nav-item ${isActive ? "active" : ""}`}>
      <Icon size={18} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
};

/* ================= Layout ================= */

const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();

  /* ===== Fetch Logged User ===== */

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/auth/me");
        setUser(res.data);
      } catch (err) {
        console.error("User fetch failed");
      }
    };

    fetchUser();
  }, []);

  /* ===== Logout ===== */

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/#/login";
  };

  /* ===== Active Route ===== */

  const isActive = (path) =>
    location.pathname === path ||
    location.pathname.startsWith(path + "/");

  return (
    <div className="app-container">

      {/* ================= SIDEBAR ================= */}

      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>

        {/* ===== Header ===== */}

        <div className="sidebar-header">
          {!collapsed ? (
            <div className="brand">
              <BarChart3 size={20} />
              <span>Nutmeg BI</span>
            </div>
          ) : (
            <BarChart3 size={26} />
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="collapse-btn"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* ===== Navigation ===== */}

        <nav className="sidebar-nav">

          <SidebarItem
            icon={Home}
            label="Home"
            to="/"
            isActive={isActive("/")}
            collapsed={collapsed}
          />

          <SidebarItem
            icon={Box}
            label="Workspaces"
            to="/workspaces"
            isActive={isActive("/workspaces")}
            collapsed={collapsed}
          />

          <SidebarItem
            icon={Database}
            label="Data Sources"
            to="/upload"
            isActive={isActive("/upload")}
            collapsed={collapsed}
          />

          {/* ===== Creators Section ===== */}

          <div className="sidebar-group">

            <div className="sidebar-divider" />

            {!collapsed && (
              <div className="section-title">Creators</div>
            )}

            <SidebarItem
              icon={PlusSquare}
              label="Visual Builder"
              to="/visual-builder"
              isActive={isActive("/visual-builder")}
              collapsed={collapsed}
            />

            <SidebarItem
              icon={LayoutDashboard}
              label="Dashboard Editor"
              to="/builder"
              isActive={isActive("/builder")}
              collapsed={collapsed}
            />

          </div>

          {/* Spacer pushes settings + footer down */}

          <div className="sidebar-spacer" />

          {/* ===== Bottom Navigation ===== */}

          <SidebarItem
            icon={Settings}
            label="Settings"
            to="/settings"
            isActive={isActive("/settings")}
            collapsed={collapsed}
          />

        </nav>

        {/* ===== Footer ===== */}

        <div className="sidebar-footer">

          {!collapsed && user && (
            <div className="user-info">

             

             

            </div>
          )}

          <button onClick={handleLogout} className="logout">
            <LogOut size={18} />
            {!collapsed && <span>Sign Out</span>}
          </button>

        </div>

      </aside>

      {/* ================= MAIN CONTENT ================= */}

      <div className="main-content">

        <header className="top-header">
          <h3 className="page-title">
            {location.pathname.replace("/", "") || "Home"}
          </h3>
        </header>

        <main className="content-wrapper fade-in">
          {children}
        </main>

      </div>

    </div>
  );
};

export default Layout;
