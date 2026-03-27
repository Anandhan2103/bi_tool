import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { updateProfile } from "../../api/settingsApi";
import "../../styles/settings.css";

/* ================= SVG ICONS ================= */

const LanguageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const TimezoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CurrencyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const DateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

/* ================= COMPONENT ================= */

const Localization = () => {
  const navigate = useNavigate();
  const { user, fetchUser } = useUser();

  const [settings, setSettings] = useState({
    language: "en-IN",
    timezone: "Asia/Kolkata",
    currency: "INR",
    dateFormat: "DD/MM/YYYY",
  });

  const [loading, setLoading] = useState(false);

  /* ================= LOAD FROM BACKEND ================= */

  useEffect(() => {
    if (user?.preferences) {
      setSettings({
        language: user.preferences.language ?? "en-IN",
        timezone: user.preferences.timezone ?? "Asia/Kolkata",
        currency: user.preferences.currency ?? "INR",
        dateFormat: user.preferences.dateFormat ?? "DD/MM/YYYY",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  /* ================= SAVE ================= */

  const handleSave = async () => {
    try {
      setLoading(true);

      const res = await updateProfile({
        preferences: {
          language: settings.language,
          timezone: settings.timezone,
          currency: settings.currency,
          dateFormat: settings.dateFormat,
        }
      });

      if (res?.error) {
        alert(res.error);
        return;
      }

      await fetchUser();
      alert("Regional preferences updated successfully!");
    } catch (err) {
      console.error("Localization update failed:", err);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= OPTIONS ================= */

  const languages = [
    { value: "en-IN", label: "English (India)" },
    { value: "hi", label: "Hindi (हिंदी)" },
    { value: "ta", label: "Tamil (தமிழ்)" },
    { value: "te", label: "Telugu (తెలుగు)" },
    { value: "bn", label: "Bengali (বাংলা)" },
    { value: "mr", label: "Marathi (मराठी)" },
    { value: "gu", label: "Gujarati (ગુજરાતી)" },
    { value: "kn", label: "Kannada (ಕನ್ನಡ)" },
    { value: "en-US", label: "English (United States)" },
  ];

  const timezones = [
    { value: "Asia/Kolkata", label: "IST - India Standard Time (UTC+05:30)" },
    { value: "UTC", label: "UTC - Coordinated Universal Time (UTC+00:00)" },
    { value: "Asia/Dubai", label: "GST - Gulf Standard Time (UTC+04:00)" },
    { value: "Asia/Singapore", label: "SGT - Singapore Time (UTC+08:00)" },
    { value: "Europe/London", label: "GMT - Greenwich Mean Time (UTC+00:00)" },
    { value: "America/New_York", label: "EST - Eastern Time (UTC-05:00)" },
  ];

  /* ================= UI ================= */

  return (
    <div className="settings-panel">
      <div className="panel-header-top">
        <button className="btn-back" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h2>Localization</h2>
      </div>

      <p className="panel-description">
        Set your language, region, and formatting preferences.
      </p>

      <h3 className="section-header">Language & Region</h3>

      <div className="form-group">
        <label className="form-label-with-icon">
          <span className="label-icon"><LanguageIcon /></span>
          Display Language
        </label>
        <select
          name="language"
          className="form-select"
          value={settings.language}
          onChange={handleChange}
        >
          {languages.map(lang => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <h3 className="section-header" style={{ marginTop: "32px" }}>
        Formatting
      </h3>

      <div className="form-group">
        <label className="form-label-with-icon">
          <span className="label-icon"><TimezoneIcon /></span>
          Time Zone
        </label>
        <select
          name="timezone"
          className="form-select"
          value={settings.timezone}
          onChange={handleChange}
        >
          {timezones.map(tz => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row-split">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label-with-icon">
            <span className="label-icon"><CurrencyIcon /></span>
            Currency Code
          </label>
          <input
            name="currency"
            className="form-input"
            value={settings.currency}
            onChange={handleChange}
          />
        </div>

        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label-with-icon">
            <span className="label-icon"><DateIcon /></span>
            Date Format
          </label>
          <input
            name="dateFormat"
            className="form-input"
            value={settings.dateFormat}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="button-group">
        <div className="right-actions">
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Localization;