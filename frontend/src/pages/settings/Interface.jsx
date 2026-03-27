import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { updateProfile } from "../../api/settingsApi";
import "../../styles/settings.css";

const Interface = () => {
  const navigate = useNavigate();
  const { user, fetchUser } = useUser();

  const [settings, setSettings] = useState({
    darkMode: false,
    compactMode: false,
    themeColor: "indigo",
  });

  const [loading, setLoading] = useState(false);

  /* ================= LOAD FROM BACKEND ================= */

  useEffect(() => {
    if (user?.preferences) {
      setSettings({
        darkMode: user.preferences.darkMode ?? false,
        compactMode: user.preferences.compactMode ?? false,
        themeColor: user.preferences.themeColor ?? "indigo",
      });
    }
  }, [user]);

  /* ================= APPLY DARK MODE INSTANTLY ================= */

  useEffect(() => {
    const body = document.body;

    if (settings.darkMode) {
      body.classList.add("dark-mode");
    } else {
      body.classList.remove("dark-mode");
    }
  }, [settings.darkMode]);

  /* ================= HANDLERS ================= */

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleColorSelect = (colorId) => {
    setSettings((prev) => ({ ...prev, themeColor: colorId }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const res = await updateProfile({
        preferences: {
          darkMode: settings.darkMode,
          compactMode: settings.compactMode,
          themeColor: settings.themeColor,
        },
      });

      if (res?.error) {
        alert(res.error);
        return;
      }

      await fetchUser();
      alert("Appearance settings saved!");
    } catch (err) {
      console.error("Interface update failed:", err);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= COLOR OPTIONS ================= */

  const colorOptions = [
    { id: "indigo", label: "Indigo", hex: "#6366f1" },
    { id: "emerald", label: "Emerald", hex: "#10b981" },
    { id: "rose", label: "Rose", hex: "#f43f5e" },
    { id: "amber", label: "Amber", hex: "#f59e0b" },
    { id: "sky", label: "Sky", hex: "#0ea5e9" },
  ];

  /* ================= UI ================= */

  return (
    <div className="settings-panel">
      <div className="panel-header-top">
        <button className="btn-back" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h2>Interface Settings</h2>
      </div>

      <p className="panel-description">
        Customize the look and feel of the application theme and layout.
      </p>

      <h3 className="section-header">Appearance</h3>

      {/* Dark Mode */}
      <div className="toggle-row enhanced">
        <div className="row-text">
          <span className="label-main">Dark Mode</span>
          <span className="label-helper">
            Switch to a darker theme designed for low-light environments.
          </span>
        </div>
        <input
          type="checkbox"
          checked={settings.darkMode}
          onChange={() => handleToggle("darkMode")}
        />
      </div>

      {/* Accent Color */}
      <div
        className="toggle-row enhanced"
        style={{ alignItems: "flex-start", paddingTop: "24px" }}
      >
        <div className="row-text">
          <span className="label-main">Accent Color</span>
          <span className="label-helper">
            Select your preferred primary color.
          </span>
        </div>

        <div className="color-picker-container">
          {colorOptions.map((color) => (
            <button
              key={color.id}
              className={`color-swatch ${
                settings.themeColor === color.id ? "active" : ""
              }`}
              style={{ backgroundColor: color.hex }}
              onClick={() => handleColorSelect(color.id)}
              title={color.label}
            />
          ))}
        </div>
      </div>

      {/* Compact Mode */}
      <h3 className="section-header" style={{ marginTop: "30px" }}>
        Layout
      </h3>

      <div className="toggle-row enhanced">
        <div className="row-text">
          <span className="label-main">Compact Mode</span>
          <span className="label-helper">
            Reduce spacing and font sizes.
          </span>
        </div>
        <input
          type="checkbox"
          checked={settings.compactMode}
          onChange={() => handleToggle("compactMode")}
        />
      </div>

      <div className="button-group">
        <div className="right-actions">
          <button
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>

          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving..." : "Apply Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Interface;