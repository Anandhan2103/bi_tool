// src/pages/Login.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowRight, Loader2, User, RefreshCw } from "lucide-react";
import api from "../api/api";
import "../styles/login.css";

const Login = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = identifier, 2 = otp
  const [identifier, setIdentifier] = useState("");
  const [masked, setMasked] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(30);

  const inputRefs = useRef([]);

  // Countdown Timer
  useEffect(() => {
    if (step === 2 && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, timer]);

  // -----------------------------------
  // STEP 1: Request OTP
  // -----------------------------------
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/request-otp", {
        identifier,
      });

      setMasked(res.data.masked);
      setStep(2);
      setTimer(30);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------
  // STEP 2: Verify OTP
  // -----------------------------------
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const finalOtp = otp.join("");

      const res = await api.post("/auth/verify-otp", {
        identifier,
        otp: finalOtp,
      });

      localStorage.setItem("token", res.data.token);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Input
  const handleOtpChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;

    setLoading(true);
    try {
      await api.post("/auth/request-otp", { identifier });
      setTimer(30);
    } catch (err) {
      setError("Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-split-container">

        {/* LEFT DESIGN SIDE */}
        <div className="login-left">
  <div className="grid-overlay"></div>

  {/* Animated BI Lines */}
  <svg className="data-lines" viewBox="0 0 600 400">
    <path className="line-path" d="M0 300 Q150 200 300 250 T600 150" />
    <path className="line-path delay" d="M0 250 Q150 150 300 200 T600 100" />

    <circle className="data-node" cx="150" cy="200" r="6" />
    <circle className="data-node delay-node" cx="300" cy="250" r="6" />
    <circle className="data-node" cx="450" cy="180" r="6" />
  </svg>

  {/* Floating KPI Cards */}
  <div className="kpi-card card-1">
    <span>Revenue</span>
    <strong>$48.2K</strong>
  </div>

  <div className="kpi-card card-2">
    <span>Growth</span>
    <strong>+12.4%</strong>
  </div>

  <div className="kpi-card card-3">
    <span>Active Users</span>
    <strong>1,284</strong>
  </div>

  {/* Live Data Ticker */}
  <div className="data-ticker">
    <div className="ticker-track">
      <span>Sales ▲ 12%</span>
      <span>Conversion ▲ 3.4%</span>
      <span>Retention ▲ 8.1%</span>
      <span>Orders ▲ 5.6%</span>
      <span>Revenue ▲ 12%</span>
      <span>Conversion ▲ 3.4%</span>
    </div>
  </div>
</div>

        {/* RIGHT AUTH SIDE */}
        <div className="login-right">
          <div className="login-card">

            <div className="login-brand">
              <div className="brand-icon">
                <User size={28} />
              </div>
              <h1>Sign In</h1>
              <p>Access your NutMeg BI workspace</p>
            </div>

            {error && <div className="login-error">{error}</div>}

            {step === 1 && (
              <form onSubmit={handleRequestOtp} className="login-form">
                <div className="form-group">
                  <label>Email or Mobile</label>
                  <div className="input-wrapper">
                    <Mail size={18} />
                    <input
                      type="text"
                      placeholder="Enter email or mobile number"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? (
                    <Loader2 className="spin" size={18} />
                  ) : (
                    <>
                      Continue
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="login-form">

                <p className="otp-info">
                  Enter the 6-digit code sent to <strong>{masked}</strong>
                </p>

                <div className="otp-container">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) =>
                        handleOtpChange(e.target.value, index)
                      }
                      ref={(el) => (inputRefs.current[index] = el)}
                      className="otp-input"
                    />
                  ))}
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? (
                    <Loader2 className="spin" size={18} />
                  ) : (
                    "Verify & Login"
                  )}
                </button>

                <div className="resend-section">
                  {timer > 0 ? (
                    <span>Resend OTP in {timer}s</span>
                  ) : (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={handleResendOtp}
                    >
                      <RefreshCw size={14} /> Resend OTP
                    </button>
                  )}
                </div>

              </form>
            )}

            <div className="login-footer">
              <p>© 2026 NutMeg BI Analytics</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
