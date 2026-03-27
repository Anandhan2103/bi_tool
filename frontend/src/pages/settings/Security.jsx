import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { updateProfile } from "../../api/settingsApi";
import "../../styles/settings.css";

const API = "http://localhost:8000";

const Security = () => {
  const navigate = useNavigate();
  const { user, fetchUser } = useUser();
  
  // Master security alert toggle from Notifications page
  const securityAlertsEnabled = user?.preferences?.notifications?.securityAlerts !== false;
  
  const emailVerified = user?.email_verified;
  const mobileVerified = user?.mobile_verified;

  const showVerifyMobile = emailVerified && !mobileVerified;
  const showVerifyEmail = mobileVerified && !emailVerified;

  /* ================= DEFAULT SETTINGS ================= */
  // 🔥 STEP 1 — Removed deliveryChannel
  const defaultSettings = useMemo(() => ({
    monitorNewLogin: true,
    suspiciousActivity: true,
    wrongOtpAlert: true,
  }), []);

  /* ================= STATE ================= */

  const [settings, setSettings] = useState(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  /* ================= LOAD SETTINGS ================= */
useEffect(() => {
  if (user?.preferences?.security) {
    let merged = {
      ...defaultSettings,
      ...user.preferences.security,
    };

    // 🔥 NEW: If master is OFF → auto disable all
    if (!securityAlertsEnabled) {
      merged.monitorNewLogin = false;
      merged.suspiciousActivity = false;
      merged.wrongOtpAlert = false;
    }

    setSettings(merged);
    setOriginalSettings(merged);
  } else {
    setOriginalSettings(defaultSettings);
  }

  fetchSessions();
}, [user?.preferences?.security, securityAlertsEnabled]);

  /* ================= FETCH SESSIONS ================= */

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);

      const res = await fetch(`${API}/api/security/sessions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) {
        setSessions([]);
        return;
      }

      const data = await res.json();
      setSessions(data || []);
    } catch (err) {
      console.error("Session fetch error:", err);
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  /* ================= CHANGE DETECTION ================= */

  const hasChanges =
    originalSettings &&
    JSON.stringify(settings) !== JSON.stringify(originalSettings);

  /* ================= HANDLERS ================= */

  const handleToggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // 🔥 STEP 3 — Removed handleChannelChange

  /* ================= NAVIGATION ================= */

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/settings");
    }
  };

  const handleCancel = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/settings");
    }
  };

  /* ================= SIMPLE SAVE (NO OTP) ================= */

  const handleSave = async () => {
    try {
      setLoading(true);
      setMessage(null);

      await updateProfile({
        preferences: {
          security: settings,
        },
      });

      await fetchUser();
      await fetchSessions();
      
      setOriginalSettings(settings);

      setMessage({
        type: "success",
        text: "Security settings updated successfully.",
      });

    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Update failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ================= SESSION MANAGEMENT ================= */

  const revokeSession = async (id) => {
    try {
      await fetch(`${API}/api/security/sessions/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      fetchSessions();
      setMessage({
        type: "success",
        text: "Session revoked successfully.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: "Failed to revoke session.",
      });
    }
  };

  const logoutAll = async () => {
    try {
      await fetch(`${API}/api/security/sessions`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      fetchSessions();
      setMessage({
        type: "success",
        text: "All other sessions logged out.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: "Failed to logout other devices.",
      });
    }
  };

  /* ================= SPLIT SESSIONS ================= */

  const currentSession = sessions.find((s) => s.is_current);
  const otherSessions = sessions.filter((s) => !s.is_current);

  /* ================= UI ================= */

  return (
    <div className="settings-panel">

      <div className="panel-header-top">
        <button className="btn-back" onClick={handleBack}>
          ← Back
        </button>
        <h2>Security Settings</h2>
      </div>

      {message && (
        <div className={`inline-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Master Security Alert Warning */}
      {!securityAlertsEnabled && (
        <div className="field-warning" style={{ marginBottom: 20 }}>
          🔔 Security Alerts are disabled. Enable them in Notification Settings to activate monitoring
          <button
            className="btn-link"
            onClick={() => navigate("/settings/notifications")}
            style={{ marginLeft: 5 }}
          >
            Notification Settings
          </button>
        </div>
      )}

      {/* ================= MONITORING ================= */}
      <h3 className="section-header" style={{ marginTop: 30 }}>
        Monitoring & Alerts
      </h3>

      <div className="toggle-row enhanced">
        <div className="toggle-content">
          <div className="toggle-title">New Device Login Alert</div>
          <div className="toggle-description">
            Get notified when your account is accessed from a new browser, device, or location.
          </div>
        </div>

        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={settings.monitorNewLogin}
            onChange={() => handleToggle("monitorNewLogin")}
            disabled={!securityAlertsEnabled}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

      <div className="toggle-row enhanced">
        <div className="toggle-content">
          <div className="toggle-title">Suspicious Activity Alert</div>
          <div className="toggle-description">
            Receive alerts about unusual behavior, multiple failed login attempts, or potential security risks.
          </div>
        </div>

        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={settings.suspiciousActivity}
            onChange={() => handleToggle("suspiciousActivity")}
            disabled={!securityAlertsEnabled}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

      <div className="toggle-row enhanced">
        <div className="toggle-content">
          <div className="toggle-title">Wrong OTP Attempt Alert</div>
          <div className="toggle-description">
           Get notified after 3 wrong OTP attempts,
            and a separate message if your account is temporarily locked after multiple failed attempts.
          </div>
        </div>

        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={settings.wrongOtpAlert}
            onChange={() => handleToggle("wrongOtpAlert")}
            disabled={!securityAlertsEnabled}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

      {/* ================= VERIFICATION WARNINGS ================= */}
      {showVerifyMobile && (
        <div className="field-warning">
          📱 Verify your mobile number to receive SMS alerts.
          <button
            className="btn-link"
            onClick={() => navigate("/settings/profile")}
          >
            Verify Now
          </button>
        </div>
      )}

      {showVerifyEmail && (
        <div className="field-warning">
          📧 Verify your email address to receive email alerts.
          <button
            className="btn-link"
            onClick={() => navigate("/settings/profile")}
          >
            Verify Now
          </button>
        </div>
      )}

      {/* ================= ACTIVE SESSIONS ================= */}
      <h3 className="section-header" style={{ marginTop: 30 }}>
        Active Sessions
      </h3>

      {sessionsLoading ? (
        <div className="loading-spinner">Loading sessions...</div>
      ) : (
        <>
          {/* Current Session */}
          {currentSession ? (
            <div className="session-card active-session">
              <div>
                <strong>{currentSession.device || "Current Device"}</strong>
                <div className="session-location">{currentSession.location || "Unknown location"}</div>
                <div className="session-meta">
                  IP: {currentSession.ip || "Unknown"}
                </div>
                <div className="session-meta">
                  Last active: {new Date(currentSession.last_active).toLocaleString()}
                </div>
              </div>
              <span className="active-badge">Current</span>
            </div>
          ) : (
            <div className="empty-state">No active session found.</div>
          )}

          {/* Other Sessions */}
          {otherSessions.length > 0 && (
            <>
              <h4 className="sub-section-header">Other Devices</h4>
              {otherSessions.map((session) => (
                <div key={session.id} className="session-card">
                  <div>
                    <strong>{session.device || "Unknown Device"}</strong>
                    <div className="session-location">{session.location || "Unknown location"}</div>
                    <div className="session-meta">
                      IP: {session.ip || "Unknown"}
                    </div>
                    <div className="session-meta">
                      Last active: {new Date(session.last_active).toLocaleString()}
                    </div>
                  </div>

                  <button
                    className="btn btn-reset"
                    onClick={() => revokeSession(session.id)}
                  >
                    Logout
                  </button>
                </div>
              ))}

              {otherSessions.length > 0 && (
                <button 
                  className="btn btn-secondary logout-all" 
                  onClick={logoutAll}
                >
                  Logout All Other Devices
                </button>
              )}
            </>
          )}

          {sessions.length === 0 && !sessionsLoading && (
            <div className="empty-state">No sessions found.</div>
          )}
        </>
      )}

      {/* ================= SAVE BUTTONS ================= */}
      <div className="button-group" style={{ marginTop: 30 }}>
        <button className="btn btn-secondary" onClick={handleCancel}>
          Cancel
        </button>

        {hasChanges && (
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={loading || !securityAlertsEnabled}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        )}
      </div>
    </div>
  );
};

export default Security;