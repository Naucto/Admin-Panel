import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

const CSRF_COOKIE = "naucto_admin_csrf";
const CSRF_HEADER = "X-CSRF-Token";

function readCookie(name: string): string | null {
  const cookies = typeof document !== "undefined" ? document.cookie : "";
  const match = cookies
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

const SAFE_METHODS = new Set(["get", "head", "options"]);

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<void> | null = null;

function createApiClient(): AxiosInstance {
  const baseURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
  const client = axios.create({
    baseURL,
    withCredentials: true,
    headers: { "Content-Type": "application/json" }
  });

  client.interceptors.request.use((config) => {
    const method = (config.method ?? "get").toLowerCase();
    if (!SAFE_METHODS.has(method)) {
      const token = readCookie(CSRF_COOKIE);
      if (token) {
        config.headers.set(CSRF_HEADER, token);
      }
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as RetryableConfig | undefined;
      const status = error.response?.status;

      const isAuthEndpoint = original?.url?.includes("/admin/auth/");
      if (status === 401 && original && !original._retry && !isAuthEndpoint) {
        original._retry = true;
        try {
          if (!refreshPromise) {
            refreshPromise = axios
              .post(`${baseURL}/admin/auth/refresh`, null, {
                withCredentials: true
              })
              .then(() => undefined)
              .finally(() => {
                refreshPromise = null;
              });
          }
          await refreshPromise;
          return client(original);
        } catch {
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
            window.location.assign("/login");
          }
          return Promise.reject(error);
        }
      }

      if (status === 401 && !window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }

      return Promise.reject(error);
    }
  );

  return client;
}

export const apiClient = createApiClient();

export function extractErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(", ") : data.message;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
