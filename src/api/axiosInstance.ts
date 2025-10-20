import axios from "axios";
import AuthService from "../services/AuthService";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Add the Authorization header to every request
api.interceptors.request.use((config) => {
  const token = AuthService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (token expired)
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip retry for refresh endpoint
    if (originalRequest.url.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue all failed requests until refresh completes
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(Promise.reject);
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const data = await AuthService.refreshToken();
        processQueue(null, data.accessToken);
        isRefreshing = false;

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        AuthService.logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
