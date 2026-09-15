// Centralized axios instance: attaches the access token to every request
// and transparently refreshes it on a 401 using the refresh token, instead
// of every page having to reimplement that logic (and inevitably forgetting
// to on some page, silently logging users out early).
import axios from 'axios';

const backendUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');

export const api = axios.create({
  baseURL: backendUrl,
  withCredentials: true, // send/receive the httpOnly refresh-token cookie
});

let isRefreshing = false;
let pendingQueue = [];

const resolveQueue = (error, token) => {
  pendingQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
  pendingQueue = [];
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthEndpoint = originalRequest?.url?.includes('/api/user/login') ||
      originalRequest?.url?.includes('/api/user/register') ||
      originalRequest?.url?.includes('/api/user/refresh-token');

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Another request already triggered a refresh — wait for it instead
        // of firing a second concurrent refresh call.
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(
          `${backendUrl}/api/user/refresh-token`,
          { refreshToken },
          { withCredentials: true }
        );
        const nextToken = data.accessToken || data.token || data.data?.accessToken || data.data?.token;
        if (!nextToken) throw new Error('Refresh response did not include an access token');
        localStorage.setItem('token', nextToken);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        resolveQueue(null, nextToken);
        originalRequest.headers.Authorization = `Bearer ${nextToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        resolveQueue(refreshError, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
