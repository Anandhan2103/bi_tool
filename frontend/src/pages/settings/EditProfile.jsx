import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Trash2, CheckCircle } from "lucide-react";
import { useUser } from "../../context/UserContext";
import { updateProfile, uploadProfileImage } from "../../api/settingsApi";
import "../../styles/settings.css";

const API = "http://localhost:8000";

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, fetchUser } = useUser();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [confirmUpdate, setConfirmUpdate] = useState(false);

  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  
  // Detect Registration Type
  const [registeredVia, setRegisteredVia] = useState(null);
  
  // Track Updated Fields
  const [updatedFields, setUpdatedFields] = useState([]);

  const [showEmailOtp, setShowEmailOtp] = useState(false);
  const [showMobileOtp, setShowMobileOtp] = useState(false);

  const [emailCooldown, setEmailCooldown] = useState(0);
  const [mobileCooldown, setMobileCooldown] = useState(0);

  const [emailOtp, setEmailOtp] = useState(["", "", "", "", "", ""]);
  const [mobileOtp, setMobileOtp] = useState(["", "", "", "", "", ""]);

  const emailInputs = useRef([]);
  const mobileInputs = useRef([]);

  const [originalData, setOriginalData] = useState(null);

  // Country code state
  const [countryCode, setCountryCode] = useState("+91");

  // Production-ready minimal country list
  const countries = [
    { code: "+91", label: "🇮🇳 India (+91)" },
    { code: "+1", label: "🇺🇸 USA (+1)" },
    { code: "+44", label: "🇬🇧 UK (+44)" },
    { code: "+61", label: "🇦🇺 Australia (+61)" },
    { code: "+971", label: "🇦🇪 UAE (+971)" }
  ];

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    company: "",
    dob: "",
    jobTitle: "",
    bio: ""
  });

  /* ================= LOAD USER ================= */
  // FIXED: Single source of truth for user data loading
  useEffect(() => {
    if (user) {
      // Set form data from user
      setFormData({
        fullName: user.name || "",
        email: user.email || "",
        mobile: user.mobile || "",
        company: user.company || "",
        dob: user.dob || "",
        jobTitle: user.jobTitle || "",
        bio: user.bio || ""
      });

      // Set original data for change tracking
      setOriginalData({
        fullName: user.name || "",
        email: user.email || "",
        mobile: user.mobile || "",
        company: user.company || "",
        dob: user.dob || "",
        jobTitle: user.jobTitle || "",
        bio: user.bio || ""
      });

      // Set photo URL
      setPhotoUrl(
        user.profile_image
          ? `${API}${user.profile_image}`
          : null
      );
      
      // Set verification status
      setEmailVerified(user.email_verified || false);
      setMobileVerified(user.mobile_verified || false);
      
      // Set registration type
      setRegisteredVia(user.registered_via || null);

      // Extract country code from mobile if verified
      if (user.mobile_verified && user.mobile) {
        const mobileStr = user.mobile;
        // Check if mobile includes country code (more than 10 digits)
        if (mobileStr.length > 10) {
          const code = mobileStr.substring(0, mobileStr.length - 10);
          setCountryCode(code);
        } else {
          // Default to +91 for Indian numbers
          setCountryCode("+91");
        }
      }
    }
  }, [user]); // Only depend on user, not originalData

  /* ================= VERIFICATION STATUS ================= */
  // Smart verification based on registration type
  const isContactVerified = 
    registeredVia === "email"
      ? mobileVerified   // Email registered users must verify mobile
      : registeredVia === "mobile"
      ? emailVerified    // Mobile registered users must verify email
      : emailVerified && mobileVerified; // Fallback: both required

  /* ================= PROFILE COMPLETION CHECK ================= */
  const isProfileComplete =
    isContactVerified &&
    formData.fullName &&
    formData.company &&
    formData.jobTitle &&
    formData.dob;

  /* ================= OTP REQUEST ================= */
  const sendOtp = async (value, type) => {
    if (!value) return alert("Enter value first");

    try {
      const res = await fetch(`${API}/api/auth/request-profile-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ type, value })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to send OTP");
        return;
      }

      if (type === "email") {
        setShowEmailOtp(true);
        setEmailOtp(["", "", "", "", "", ""]);
        setEmailCooldown(60);
      } else {
        setShowMobileOtp(true);
        setMobileOtp(["", "", "", "", "", ""]);
        setMobileCooldown(60);
      }
      
      alert(data.message || "OTP sent successfully");
    } catch (error) {
      alert("Network error. Please try again.");
    }
  };

  /* ================= OTP VERIFY ================= */
  const verifyOtp = async (type) => {
    const otp = type === "email"
      ? emailOtp.join("")
      : mobileOtp.join("");

    if (otp.length !== 6) {
      alert("Please enter complete 6-digit OTP");
      return;
    }

    const value = type === "email"
      ? formData.email
      : `${countryCode}${formData.mobile}`;

    try {
      const res = await fetch(`${API}/api/auth/verify-profile-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ type, value, otp })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Invalid OTP");
        return;
      }

      // Always logout after verification to unlock profile editing
      alert("Verification successful! Please login again to unlock profile editing.");
      localStorage.removeItem("token");
      window.location.href = "/login";
      
    } catch (error) {
      alert("Network error. Please try again.");
    }
  };

  /* ================= OTP INPUT HANDLER ================= */
  const handleOtpChange = (index, value, type) => {
    if (!/^[0-9]?$/.test(value)) return;

    const state = type === "email" ? emailOtp : mobileOtp;
    const setter = type === "email" ? setEmailOtp : setMobileOtp;
    const inputs = type === "email"
      ? emailInputs.current
      : mobileInputs.current;

    const newOtp = [...state];
    newOtp[index] = value;
    setter(newOtp);

    if (value && index < 5) {
      inputs[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e, index, digit, type) => {
    if (e.key === "Backspace" && !digit && index > 0) {
      const inputs = type === "email" ? emailInputs.current : mobileInputs.current;
      inputs[index - 1]?.focus();
    }
  };

  /* ================= IMAGE ================= */
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    const preview = URL.createObjectURL(file);
    setPhotoUrl(preview);

    try {
      await uploadProfileImage(file);
      await fetchUser();
    } catch (error) {
      alert("Failed to upload image");
      // Revert preview on error
      setPhotoUrl(user?.profile_image ? `${API}${user.profile_image}` : null);
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm("Are you sure you want to remove your profile photo?")) return;
    
    try {
      await updateProfile({ profile_image: null });
      setPhotoUrl(null);
      await fetchUser();
    } catch (error) {
      alert("Failed to remove photo");
    }
  };

  /* ================= FORM ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Special handling for mobile to allow only digits
    if (name === "mobile") {
      const sanitizedValue = value.replace(/\D/g, "");
      setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Reset verification when email/mobile changes
    if (name === "email") {
      setEmailVerified(false);
      setShowEmailOtp(false);
    }

    if (name === "mobile") {
      setMobileVerified(false);
      setShowMobileOtp(false);
    }
    
    // Remove green tick when field is edited again
    setUpdatedFields(prev => prev.filter(field => field !== name));
    setConfirmUpdate(false);
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      // Track which fields were changed
      const changedFields = [];
      if (formData.fullName !== originalData?.fullName) changedFields.push("fullName");
      if (formData.company !== originalData?.company) changedFields.push("company");
      if (formData.dob !== originalData?.dob) changedFields.push("dob");
      if (formData.jobTitle !== originalData?.jobTitle) changedFields.push("jobTitle");
      if (formData.bio !== originalData?.bio) changedFields.push("bio");

      await updateProfile({
        name: formData.fullName,
        company: formData.company,
        dob: formData.dob,
        jobTitle: formData.jobTitle,
        bio: formData.bio
      });

      await fetchUser();
      
      // Update states after successful save
      setUpdatedFields(changedFields);
      setOriginalData({ ...formData });
      setConfirmUpdate(false);
      
      alert("Profile updated successfully.");

    } catch (error) {
      alert(error.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= HAS CHANGES CHECK ================= */
  const hasChanges = originalData && (
    formData.fullName !== originalData.fullName ||
    formData.company !== originalData.company ||
    formData.dob !== originalData.dob ||
    formData.jobTitle !== originalData.jobTitle ||
    formData.bio !== originalData.bio
  );

  /* ================= TIMERS ================= */
  useEffect(() => {
    if (emailCooldown > 0) {
      const timer = setTimeout(() => {
        setEmailCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [emailCooldown]);

  useEffect(() => {
    if (mobileCooldown > 0) {
      const timer = setTimeout(() => {
        setMobileCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [mobileCooldown]);

  /* ================= NAVIGATION ================= */
  // FIXED: Production-safe navigation with fallback
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

  /* ================= UI ================= */
  return (
    <div className="settings-panel">
      <div className="settings-header">
        <button className="back-btn" onClick={handleBack}>
          ← Back
        </button>
        <h2>
          Edit Profile
          {isProfileComplete && (
            <span className="verified-animated" style={{ marginLeft: 10 }}>
              <CheckCircle size={18} /> Completed
            </span>
          )}
        </h2>
      </div>

      {/* PROFILE IMAGE */}
      <div className="profile-photo-section">
        <input 
          type="file" 
          ref={fileInputRef} 
          hidden 
          onChange={handleFileSelect} 
          accept="image/*"
          disabled={!isContactVerified}
        />

        {photoUrl ? (
          <img src={photoUrl} alt="Profile" className="photo-preview-large" />
        ) : (
          <div className="photo-preview-large">
            {formData.fullName?.charAt(0)?.toUpperCase() || "U"}
          </div>
        )}

        <div className="photo-actions">
          <button 
            className="btn btn-white" 
            onClick={() => fileInputRef.current?.click()}
            type="button"
            disabled={!isContactVerified}
          >
            <Camera size={16} /> Change
          </button>

          {photoUrl && (
            <button 
              className="btn btn-reset" 
              onClick={handleRemovePhoto}
              type="button"
              disabled={!isContactVerified}
            >
              <Trash2 size={16} /> Remove
            </button>
          )}
        </div>
      </div>

      {/* EMAIL */}
      <div className="form-group">
        <label>Email</label>
        <div className="field-with-action">
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className="form-input"
            disabled={emailVerified}
            placeholder="Enter email"
          />

          {emailVerified ? (
            <span className="verified-animated">
              <CheckCircle size={16} /> Verified
            </span>
          ) : (
            <button
              className="btn btn-white"
              disabled={emailCooldown > 0 || !formData.email}
              onClick={() => sendOtp(formData.email, "email")}
              type="button"
            >
              {emailCooldown > 0
                ? `Resend in ${emailCooldown}s`
                : "Verify"}
            </button>
          )}
        </div>

        {showEmailOtp && (
          <div className="otp-6box">
            {emailOtp.map((digit, index) => (
              <input
                key={index}
                ref={el => (emailInputs.current[index] = el)}
                value={digit}
                onChange={e => handleOtpChange(index, e.target.value, "email")}
                onKeyDown={e => handleOtpKeyDown(e, index, digit, "email")}
                maxLength="1"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
              />
            ))}
            <button 
              className="btn btn-primary" 
              onClick={() => verifyOtp("email")}
              type="button"
            >
              Confirm
            </button>
          </div>
        )}
      </div>

      {/* MOBILE */}
      <div className="form-group">
        <label>Mobile</label>

        <div className="field-with-action">
          {mobileVerified ? (
            <>
              <input
                value={formData.mobile}
                className="form-input"
                disabled
              />
              <span className="verified-animated">
                <CheckCircle size={16} /> Verified
              </span>
            </>
          ) : (
            <>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="country-select"
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>

              <input
                type="tel"
                name="mobile"
                placeholder="Enter mobile number"
                value={formData.mobile}
                onChange={handleChange}
                className="form-input"
                maxLength="10"
              />

              <button
                className="btn btn-white"
                onClick={() =>
                  sendOtp(
                    `${countryCode}${formData.mobile}`,
                    "mobile"
                  )
                }
                disabled={mobileCooldown > 0 || !formData.mobile || formData.mobile.length < 10}
                type="button"
              >
                {mobileCooldown > 0
                  ? `Resend in ${mobileCooldown}s`
                  : "Verify"}
              </button>
            </>
          )}
        </div>

        {showMobileOtp && (
          <div className="otp-6box">
            {mobileOtp.map((digit, index) => (
              <input
                key={index}
                ref={el => (mobileInputs.current[index] = el)}
                value={digit}
                onChange={e => handleOtpChange(index, e.target.value, "mobile")}
                onKeyDown={e => handleOtpKeyDown(e, index, digit, "mobile")}
                maxLength="1"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
              />
            ))}
            <button 
              className="btn btn-primary" 
              onClick={() => verifyOtp("mobile")}
              type="button"
            >
              Confirm
            </button>
          </div>
        )}
      </div>

      {/* Dynamic Warning Message */}
      {!isContactVerified && (
        <div className="field-warning">
          🔒 {registeredVia === "email"
            ? "Please verify your mobile number to update profile."
            : registeredVia === "mobile"
            ? "Please verify your email to update profile."
            : "Please verify both email and mobile to update profile."}
        </div>
      )}

      {/* OTHER FIELDS - with Green Ticks */}
      <div className="form-group">
        <label>
          Full Name
          {updatedFields.includes("fullName") && (
            <span className="field-updated">
              <CheckCircle size={16} />
            </span>
          )}
        </label>
        <input 
          name="fullName" 
          value={formData.fullName} 
          onChange={handleChange} 
          className={`form-input ${updatedFields.includes("fullName") ? "updated" : ""}`}
          disabled={!isContactVerified}
          placeholder="Enter full name"
        />
      </div>

      <div className="form-group">
        <label>
          Company
          {updatedFields.includes("company") && (
            <span className="field-updated">
              <CheckCircle size={16} />
            </span>
          )}
        </label>
        <input 
          name="company" 
          value={formData.company} 
          onChange={handleChange} 
          className={`form-input ${updatedFields.includes("company") ? "updated" : ""}`}
          disabled={!isContactVerified}
          placeholder="Enter company name"
        />
      </div>

      <div className="form-group">
        <label>
          Date of Birth
          {updatedFields.includes("dob") && (
            <span className="field-updated">
              <CheckCircle size={16} />
            </span>
          )}
        </label>
        <input 
          type="date" 
          name="dob" 
          value={formData.dob} 
          onChange={handleChange} 
          className={`form-input ${updatedFields.includes("dob") ? "updated" : ""}`}
          disabled={!isContactVerified}
        />
      </div>

      <div className="form-group">
        <label>
          Job Title
          {updatedFields.includes("jobTitle") && (
            <span className="field-updated">
              <CheckCircle size={16} />
            </span>
          )}
        </label>
        <input 
          name="jobTitle" 
          value={formData.jobTitle} 
          onChange={handleChange} 
          className={`form-input ${updatedFields.includes("jobTitle") ? "updated" : ""}`}
          disabled={!isContactVerified}
          placeholder="Enter job title"
        />
      </div>

      <div className="form-group">
        <label>
          Bio
          {updatedFields.includes("bio") && (
            <span className="field-updated">
              <CheckCircle size={16} />
            </span>
          )}
        </label>
        <textarea 
          rows="6"
          name="bio" 
          value={formData.bio} 
          onChange={handleChange} 
          className={`form-input bio-textarea ${updatedFields.includes("bio") ? "updated" : ""}`}
          disabled={!isContactVerified}
          placeholder="Tell us about yourself..."
        />
      </div>

      <div className="button-group">
        <button 
          className="btn btn-secondary" 
          onClick={handleCancel}
          type="button"
        >
          Cancel
        </button>

        {hasChanges && !confirmUpdate && (
          <button
            className="btn btn-warning"
            disabled={!isContactVerified}
            onClick={() => setConfirmUpdate(true)}
            type="button"
          >
            Update Profile
          </button>
        )}

        {confirmUpdate && (
          <button
            className="btn btn-primary"
            disabled={loading || !isContactVerified}
            onClick={handleSave}
            type="button"
          >
            {loading ? "Saving..." : "Confirm & Save"}
          </button>
        )}
      </div>
    </div>
  );
};

export default EditProfile;