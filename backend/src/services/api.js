import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
});

// ---------------- REQUEST INTERCEPTOR ----------------
// Attach access token to every request

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ---------------- RESPONSE INTERCEPTOR ----------------
// Handle token expiration (auto refresh)

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");

        const res = await axios.post(
          "http://localhost:8000/auth/refresh",
          {
            refresh_token: refreshToken,
          }
        );

        const newAccessToken = res.data.access_token;

        localStorage.setItem("access_token", newAccessToken);

        originalRequest.headers[
          "Authorization"
        ] = `Bearer ${newAccessToken}`;

        return API(originalRequest);

      } catch (err) {
        // Refresh failed → force logout
        localStorage.clear();
        window.location.href = "/student-login";
      }
    }

    return Promise.reject(error);
  }
);

export default API;