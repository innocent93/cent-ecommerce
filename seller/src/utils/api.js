// Centralized axios instance for the seller app: attaches the seller's
// access token to every request and transparently refreshes it on a 401,
// following the exact pattern already proven in frontend/src/utils/api.js
// (see the main README's "Session & authentication security" section).
import axios from "axios";

export const backendUrl = import.meta.env.VITE_BACKEND_URL;

export const api = axios.create({
  baseURL: backendUrl,
  withCredentials: true,
});

let isRefreshing = false;
let pendingQueue = [];

const resolveQueue = (error, token) => {
  pendingQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
  pendingQueue = [];
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sellerToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthEndpoint =
      originalRequest?.url?.includes("/api/seller/login") ||
      originalRequest?.url?.includes("/api/seller/register") ||
      originalRequest?.url?.includes("/api/seller/refresh-token");

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = localStorage.getItem("sellerRefreshToken");
        const { data } = await axios.post(
          `${backendUrl}/api/seller/refresh-token`,
          { refreshToken },
          { withCredentials: true }
        );
        localStorage.setItem("sellerToken", data.token);
        if (data.refreshToken) localStorage.setItem("sellerRefreshToken", data.refreshToken);
        resolveQueue(null, data.token);
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (refreshError) {
        resolveQueue(refreshError, null);
        localStorage.removeItem("sellerToken");
        localStorage.removeItem("sellerRefreshToken");
        localStorage.removeItem("seller");
        window.location.href = "/";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
