import axios, {
  type AxiosInstance,
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import { toast } from "react-toastify";
import { useAuthStore } from "../store/authStore";

// Override with VITE_API_URL (e.g. http://localhost:3000/api/v1) for local development
const API_BASE_URL: string =
  import.meta.env.VITE_API_URL || "https://simple-pos-6be8.onrender.com/api/v1";

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * A 401 on a signed-in request means the session ended (expired or revoked token): sign out —
 * ProtectedRoute then shows the sign-in screen, no page reload. A 401 from the sign-in form itself
 * (wrong password) is NOT a session problem: the form shows the message.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const signedIn = Boolean(error.config?.headers?.Authorization);
    if (error.response?.status === 401 && signedIn && useAuthStore.getState().isAuthenticated) {
      useAuthStore.getState().logout();
      toast.info("Your session ended — please sign in again.", { toastId: "session-ended" });
    }
    return Promise.reject(error);
  }
);

export default apiClient;
