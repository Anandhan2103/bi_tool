import React from "react";
import { useNavigate, Routes, Route, Navigate } from "react-router-dom";
import {
  Bell,
  Shield,
  Palette,
  Globe,
  HelpCircle,
  ArrowRight
} from "lucide-react";

import "../../styles/settings.css";

import Notifications from "./Notifications";
import Security from "./Security";
import Interface from "./Interface";
import Localization from "./Localization";
import EditProfile from "./EditProfile";
import { useUser } from "../../context/UserContext";

/* ================= SETTINGS HOME ================= */

const SettingsHome = () => {
  const navigate = useNavigate();
  const { user, loading } = useUser();

  /* ✅ Loading State */
  if (loading) {
    return (
      <div className="settings-panel">
        <p>Loading user data...</p>
      </div>
    );
  }

  /* ✅ Safe Redirect (No navigate() during render) */
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  /* ✅ Fix profile image URL */
  const imageUrl = user.profile_image
    ? user.profile_image.startsWith("http")
      ? user.profile_image
      : `http://localhost:8000${user.profile_image}`
    : null;

  const preferenceItems = [
    {
      icon: Bell,
      title: "Notifications",
      description: "Manage email and system alerts",
      path: "notifications",
    },
    {
      icon: Shield,
      title: "Security",
      description: "Two-factor authentication and sessions",
      path: "security",
    },
    {
      icon: Palette,
      title: "Interface",
      description: "Themes, density and colors",
      path: "interface",
    },
    {
      icon: Globe,
      title: "Localization",
      description: "Language, timezone and formats",
      path: "localization",
    },
  ];

  return (
    <>
      {/* HEADER */}
      <header className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">
          Configure your personal preferences and workspace parameters.
        </p>
      </header>

      {/* PROFILE CARD */}
      <section className="settings-card profile-card">
        <div className="profile-header">
          <div className="profile-left">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Profile"
                className="profile-avatar"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div className="profile-avatar">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}

            <div className="profile-info">
              <h3>{user.name}</h3>
              <p>{user.email}</p>
            </div>
          </div>

          <button
            className="btn btn-white"
            onClick={() => navigate("profile")}
          >
            Edit Profile
          </button>
        </div>
      </section>

      {/* PREFERENCES GRID */}
      <section className="settings-card">
        <h4 className="section-label">Preference Modules</h4>

        <div className="preferences-grid">
          {preferenceItems.map((item, index) => (
            <button
              key={index}
              className="preference-item"
              onClick={() => navigate(item.path)}
            >
              <div className="preference-icon">
                <item.icon size={20} />
              </div>
              <div className="preference-content">
                <h5>{item.title}</h5>
                <p>{item.description}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* HELP SECTION */}
      <section className="settings-help">
        <div className="help-left">
          <HelpCircle size={20} />
          <span>Need help with your configuration?</span>
        </div>

        <button
          className="help-link"
          onClick={() => navigate("/documentation")}
        >
          Open Documentation
          <ArrowRight size={14} style={{ marginLeft: "8px" }} />
        </button>
      </section>

      {/* ENTERPRISE SECTION */}
      <section className="enterprise-card">
        <div className="enterprise-content">
          <h3>NutMeg Enterprise</h3>
          <p>
            Unlock collaborative workspaces, white-label branding,
            and dedicated enterprise-grade support.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/contact-sales")}
          >
            Talk to Sales Team
          </button>
        </div>
        <Shield className="enterprise-bg-icon" />
      </section>
    </>
  );
};

/* ================= SETTINGS ROUTER ================= */

const Settings = () => {
  return (
    <div className="settings-page">
      <Routes>
        <Route index element={<SettingsHome />} />
        <Route path="profile" element={<EditProfile />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="security" element={<Security />} />
        <Route path="interface" element={<Interface />} />
        <Route path="localization" element={<Localization />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  );
};

export default Settings;