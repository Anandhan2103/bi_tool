const API = "http://localhost:8000/api";

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`
});

/* ================= CURRENT USER ================= */

export const getCurrentUser = async () => {
  const res = await fetch(`${API}/auth/me`, {
    headers: authHeaders()
  });

  if (!res.ok) throw new Error("Failed to fetch user");

  return res.json();
};

/* ================= UPDATE PROFILE ================= */

export const updateProfile = async (data) => {
  const res = await fetch(`${API}/auth/update-profile`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  if (!res.ok) throw new Error("Profile update failed");

  return res.json();
};

/* ================= UPDATE PREFERENCES ================= */
/* 🔥 IMPORTANT: Accept full preferences object */

export const updatePreferences = async (preferences) => {
  const res = await fetch(`${API}/auth/update-profile`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({
      preferences
    })
  });

  if (!res.ok) throw new Error("Preferences update failed");

  return res.json();
};

/* ================= PROFILE IMAGE ================= */

export const uploadProfileImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API}/auth/upload-profile`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`
    },
    body: formData
  });

  if (!res.ok) throw new Error("Profile upload failed");

  return res.json();
};