const FALLBACK_BACKEND_BASE_URL = "http://127.0.0.1:8000";

export function getBackendBaseUrl() {
  return (process.env.BACKEND_BASE_URL ?? FALLBACK_BACKEND_BASE_URL).replace(/\/+$/, "");
}

export function getBackendUrl(pathname: string) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${getBackendBaseUrl()}${normalizedPath}`;
}
