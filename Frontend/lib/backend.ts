const LOCAL_BACKEND_BASE_URL = "http://127.0.0.1:8000";
const PRODUCTION_BACKEND_BASE_URL = "https://article-ai-fs42.onrender.com";

export function getBackendBaseUrl() {
  const fallbackBase = process.env.NODE_ENV === "production" ? PRODUCTION_BACKEND_BASE_URL : LOCAL_BACKEND_BASE_URL;
  return (process.env.BACKEND_BASE_URL ?? fallbackBase).replace(/\/+$/, "");
}

export function getBackendUrl(pathname: string) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${getBackendBaseUrl()}${normalizedPath}`;
}
