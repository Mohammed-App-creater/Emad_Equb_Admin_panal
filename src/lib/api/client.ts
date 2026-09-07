import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "../auth/auth-store";

export const setupRequestInterceptor = (api: AxiosInstance) => {
  api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = useAuthStore.getState().token;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );
};

export const setupResponseInterceptor = (api: AxiosInstance) => {
  api.interceptors.response.use(
    (response: AxiosResponse) => response,

    async (error: AxiosError) => {
      // Network / CORS error
      if (!error.response) {
        console.error("Network error:", error);
        return Promise.reject(
          new Error("Network error. Please check your internet connection.")
        );
      }

      // 401 Unauthorized – redirect to login
      if (error.response.status === 401) {
        const requestUrl = error.config?.url ?? "";
        const isAuthManagement =
          requestUrl.includes("/auth/disable-totp") ||
          requestUrl.includes("/auth/enable-totp");

        // Avoid redirecting if we are already on the login page
        if (
          !isAuthManagement &&
          typeof window !== "undefined" &&
          window.location.pathname !== "/login"
        ) {
          // Clear any stored auth data (if your store has a clear method)
          useAuthStore.getState().clearAuth?.();

          // Redirect to login page
          window.location.href = "/login";
        }

        // Reject the error so calling code can also handle it if needed
        return Promise.reject(error);
      }

      return Promise.reject(error);
    }
  );
};

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

setupRequestInterceptor(api);
setupResponseInterceptor(api);
