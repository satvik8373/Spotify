const RAW_API_URL = (import.meta.env.VITE_API_URL || "").trim();

const hostname = window.location.hostname;
const isLocalhost =
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "::1";

const normalizeApiUrl = (value: string) => {
  if (!value) return value;
  if (value === "/api") return value;
  return value.endsWith("/api") ? value : value.replace(/\/+$/, "") + "/api";
};

export const resolveApiBaseUrl = () => {
  if (RAW_API_URL) {
    return normalizeApiUrl(RAW_API_URL);
  }

  return isLocalhost ? "http://localhost:5000/api" : "/api";
};

export const resolveApiOrigin = () => {
  const baseUrl = resolveApiBaseUrl();
  if (baseUrl === "/api") return "";
  return baseUrl.replace(/\/api\/?$/, "");
};

