const LOCAL_BACKEND_BASE_URL = "http://localhost:8000";
const PRODUCTION_BACKEND_BASE_URL = "https://article-ai-fs42.onrender.com";

export function getBackendBaseUrl() {
  const fallbackBase = process.env.NODE_ENV === "production" ? PRODUCTION_BACKEND_BASE_URL : LOCAL_BACKEND_BASE_URL;
  const configuredBase = process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.BACKEND_BASE_URL ?? fallbackBase;
  return configuredBase.replace(/\/+$/, "");
}

export function getBackendUrl(pathname: string) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${getBackendBaseUrl()}${normalizedPath}`;
}

// Parses the backend response body as JSON, tolerating non-JSON bodies (e.g. a
// proxy/cold-start 502/504 or an HTML error page) instead of throwing and
// collapsing the real upstream status into a generic 500.
export async function parseBackendResponse(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
