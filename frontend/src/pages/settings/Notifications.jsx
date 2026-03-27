import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { updateProfile } from "../../api/settingsApi";
import "../../styles/settings.css";

const API = "http://localhost:8000";

const Notifications = () => {
  const navigate = useNavigate();
  const { user, fetchUser } = useUser();

  const emailVerified = user?.email_verified;
  const mobileVerified = user?.mobile_verified;

  const showVerifyMobile = emailVerified && !mobileVerified;
  const showVerifyEmail = mobileVerified && !emailVerified;

  const canUseEmail = emailVerified;
  const canUseSMS = mobileVerified;
  const canUseBoth = emailVerified && mobileVerified;

  const defaultSettings = useMemo(
    () => ({
      securityAlerts: true,
      subscriptionAlerts: true,
      paymentAlerts: true,
      deliveryChannel: "both",
    }),
    []
  );

  const [settings, setSettings] = useState(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  
  // OTP states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  // Load settings with hard enforcement
  useEffect(() => {
    if (user?.preferences?.notifications) {
      let merged = {
        ...defaultSettings,
        ...user.preferences.notifications,
      };

      // Force default based on verification
      if (emailVerified && !mobileVerified) {
        merged.deliveryChannel = "email";
      }

      if (!emailVerified && mobileVerified) {
        merged.deliveryChannel = "sms";
      }

      // Auto-upgrade when both verified
      if (emailVerified && mobileVerified) {
        merged.deliveryChannel = merged.deliveryChannel || "both";
      }

      setSettings(merged);
      setOriginalSettings(merged);
    } else {
      // Set defaults based on verification status
      let initialChannel = "both";
      if (emailVerified && !mobileVerified) {
        initialChannel = "email";
      } else if (!emailVerified && mobileVerified) {
        initialChannel = "sms";
      } else if (!emailVerified && !mobileVerified) {
        initialChannel = null;
      }
      
      const initialSettings = {
        ...defaultSettings,
        deliveryChannel: initialChannel,
      };
      
      setSettings(initialSettings);
      setOriginalSettings(initialSettings);
    }
  }, [user?.email_verified, user?.mobile_verified, user?.preferences]);

  const hasChanges =
    originalSettings &&
    JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const handleToggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleChannelChange = (value) => {
    // Extra safety: only allow change if verification allows it
    if (value === "email" && !emailVerified) return;
    if (value === "sms" && !mobileVerified) return;
    if (value === "both" && (!emailVerified || !mobileVerified)) return;
    
    setSettings((prev) => ({
      ...prev,
      deliveryChannel: value,
    }));
  };

  // Production-safe navigation
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

  // 🔥 STEP 1 — Modified handleSave: OTP required for ANY change
  const handleSave = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const somethingChanged =
        JSON.stringify(settings) !== JSON.stringify(originalSettings);

      if (!somethingChanged) return;

      if (!settings.deliveryChannel) {
        setMessage({
          type: "error",
          text: "Please select a delivery channel.",
        });
        return;
      }

      // Decide where to send OTP based on selected delivery channel
      let channels = [];

      if (settings.deliveryChannel === "email") {
        channels = ["email"];
      } else if (settings.deliveryChannel === "sms") {
        channels = ["sms"];
      } else if (settings.deliveryChannel === "both") {
        channels = ["email", "sms"];
      }

      const res = await fetch(`${API}/api/auth/request-security-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ channels }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error || "Failed to send OTP",
        });
        return;
      }

      setShowOtpModal(true);
      setMessage({
        type: "success",
        text: `Security OTP sent via ${settings.deliveryChannel.toUpperCase()}`,
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

  // 🔥 STEP 2 — Modified confirmSave: No auto-logout
  const confirmSave = async () => {
    if (!otp || otp.length !== 6) {
      setMessage({ type: "error", text: "Please enter a valid 6-digit OTP." });
      return;
    }

    try {
      setOtpLoading(true);
      setMessage(null);

      const verifyRes = await fetch(`${API}/api/auth/verify-security-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ otp }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setMessage({
          type: "error",
          text: verifyData.error || "Invalid or expired OTP.",
        });
        return;
      }

      // OTP verified → save preferences
      await updateProfile({
        preferences: {
          notifications: settings,
        },
      });

      await fetchUser();
      setOriginalSettings(settings);

      // Close modal and reset OTP
      setShowOtpModal(false);
      setOtp("");

      setMessage({
        type: "success",
        text: "Notification settings updated successfully.",
      });

    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Verification failed.",
      });
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="settings-panel">
      <div className="panel-header-top">
        <button className="btn-back" onClick={handleBack}>
          ← Back
        </button>
        <h2>Notification Settings</h2>
      </div>

      <p className="panel-description">
        Choose how you receive alerts and system updates.
      </p>

      {message && (
        <div className={`inline-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <h3 className="section-header">Alert Types</h3>

      <div className="toggle-row enhanced">
        <div className="toggle-content">
          <div className="toggle-title">Security Alerts</div>
          <div className="toggle-description">
            Get notified about login attempts, suspicious activity, and important security events related to your account.
          </div>
        </div>

        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={settings.securityAlerts}
            onChange={() => handleToggle("securityAlerts")}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

      <div className="toggle-row enhanced">
        <div className="toggle-content">
          <div className="toggle-title">Subscription Alerts</div>
          <div className="toggle-description">
            Receive updates about plan changes, renewals, upgrades, and subscription status.
          </div>
        </div>

        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={settings.subscriptionAlerts}
            onChange={() => handleToggle("subscriptionAlerts")}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

      <div className="toggle-row enhanced">
        <div className="toggle-content">
          <div className="toggle-title">Payment Alerts</div>
          <div className="toggle-description">
            Stay informed about successful payments, failed transactions, invoices, and billing reminders.
          </div>
        </div>

        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={settings.paymentAlerts}
            onChange={() => handleToggle("paymentAlerts")}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

      <h3 className="section-header" style={{ marginTop: 30 }}>
        Delivery Channel
      </h3>

      {showVerifyMobile && (
        <div className="field-warning">
          📱 Verify your mobile number to unlock SMS and Email + SMS options.
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
          📧 Verify your email address to unlock Email and Email + SMS options.
          <button
            className="btn-link"
            onClick={() => navigate("/settings/profile")}
          >
            Verify Now
          </button>
        </div>
      )}

      <div className="radio-group">
        <label className={`radio-option ${!canUseEmail ? 'disabled' : ''}`}>
          <input
            type="radio"
            value="email"
            disabled={!canUseEmail}
            checked={settings.deliveryChannel === "email"}
            onChange={() => handleChannelChange("email")}
          />
          <span>Email Only</span>
          {!canUseEmail && (
            <small className="verification-warning">(Verify email first)</small>
          )}
        </label>

        <label className={`radio-option ${!canUseSMS ? 'disabled' : ''}`}>
          <input
            type="radio"
            value="sms"
            disabled={!canUseSMS}
            checked={settings.deliveryChannel === "sms"}
            onChange={() => handleChannelChange("sms")}
          />
          <span>SMS Only</span>
          {!canUseSMS && (
            <small className="verification-warning">(Verify mobile first)</small>
          )}
        </label>

        <label className={`radio-option ${!canUseBoth ? 'disabled' : ''}`}>
          <input
            type="radio"
            value="both"
            disabled={!canUseBoth}
            checked={settings.deliveryChannel === "both"}
            onChange={() => handleChannelChange("both")}
          />
          <span>Email + SMS</span>
          {!canUseBoth && (
            <small className="verification-warning">(Verify both first)</small>
          )}
        </label>
      </div>

      {/* Delivery channel warning */}
      {!settings.deliveryChannel && (
        <div className="field-warning" style={{ marginTop: 15 }}>
          🔒 Please verify at least one contact method to enable notifications.
        </div>
      )}

      <div className="button-group">
        <button
          className="btn btn-secondary"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancel
        </button>

        {hasChanges && (
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={loading || !settings.deliveryChannel}
          >
            {loading ? "Processing..." : "Save Changes"}
          </button>
        )}
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Confirm Changes</h3>
            <p className="modal-description">
              Enter the OTP sent via {settings.deliveryChannel?.toUpperCase()}
            </p>

            <div className="otp-input-container">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 6-digit OTP"
                maxLength="6"
                autoFocus
                className="otp-input"
              />
            </div>

            {message?.type === "error" && (
              <div className="modal-error">{message.text}</div>
            )}

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowOtpModal(false);
                  setOtp("");
                  setMessage(null);
                }}
                disabled={otpLoading}
              >
                Cancel
              </button>

              <button
                className="btn btn-primary"
                onClick={confirmSave}
                disabled={otpLoading || otp.length !== 6}
              >
                {otpLoading ? "Verifying..." : "Confirm & Save"}
              </button>
            </div>

            <button
              className="resend-link"
              onClick={() => {
                setOtp("");
                setMessage(null);
                handleSave();
              }}
              disabled={loading}
            >
              Resend OTP
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;