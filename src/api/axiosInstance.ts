import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import AuthService from "../services/AuthService";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// -------------------------
// Attach access token
// -------------------------
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = AuthService.getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// -------------------------
// Token refresh queue
// -------------------------
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else if (token) p.resolve(token);
  });
  failedQueue = [];
};

// -------------------------
// Response interceptor
// -------------------------
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError & { config: AxiosRequestConfig & { _retry?: boolean } }) => {
    const originalRequest = error.config;

    // If not a 401, reject immediately
    if (error.response?.status !== 401) return Promise.reject(error);

    // Skip refresh endpoint itself
    if (originalRequest.url?.includes("/auth/refresh")) {
      AuthService.logout();
      return Promise.reject(error);
    }

    // Retry only once
    if (originalRequest._retry) return Promise.reject(error);
    originalRequest._retry = true;

    if (isRefreshing) {
      // Queue all failed requests while refreshing
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    isRefreshing = true;

    try {
      const data = await AuthService.refreshToken();
      processQueue(null, data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      AuthService.logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
