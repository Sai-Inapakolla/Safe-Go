export const getApiUrl = (): string => {
  // 1. Runtime configured backend URL from LocalStorage (allows connecting deployed frontend to cloud backend instantly)
  if (typeof window !== "undefined") {
    const customUrl = localStorage.getItem("safego_backend_url");
    if (customUrl && customUrl.trim()) {
      return customUrl.trim().replace(/\/$/, "");
    }
  }

  // 2. Build-time environment variable
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    const clean = envUrl.trim().replace(/\/$/, "");
    // If not on localhost and envUrl is still pointing to http://localhost, check if custom exists
    return clean;
  }

  // 3. Localhost fallback
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:8000";
    }
  }

  return "http://localhost:8000";
};

export const API_URL = getApiUrl();
