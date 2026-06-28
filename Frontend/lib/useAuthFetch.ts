"use client";

/**
 * useAuthFetch
 * ─────────────
 * A hook that returns an `authFetch(url, init?)` function behaving exactly
 * like the native `fetch` API, but:
 *   1. Automatically attaches Authorization: Bearer <token>
 *   2. On a 401 response, silently refreshes the token via the
 *      /api/v1/auth/refresh endpoint (which reads the httpOnly cookie)
 *      and retries the original request once.
 *   3. If the retry also fails with 401, calls logout() so the UI
 *      redirects to /login.
 */

import { useCallback } from "react";
import { useAuth } from "./AuthContext";
import { getBackendBaseUrl } from "./backend";

export function useAuthFetch() {
  const { getToken, logout } = useAuth();

  const authFetch = useCallback(
    async (url: string, init: RequestInit = {}): Promise<Response> => {
      const token = await getToken();

      const headers = new Headers(init.headers ?? {});
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const res = await fetch(url, { ...init, headers, credentials: "include" });

      // Silent refresh on 401
      if (res.status === 401) {
        const refreshRes = await fetch(
          `${getBackendBaseUrl()}/api/v1/auth/refresh`,
          { method: "POST", credentials: "include" }
        );

        if (refreshRes.ok) {
          // The AuthContext token ref is updated via AuthContext's own refresh path.
          // For this one-shot retry we grab the new token directly:
          const { access_token } = await refreshRes.json();
          const retryHeaders = new Headers(init.headers ?? {});
          retryHeaders.set("Authorization", `Bearer ${access_token}`);
          const retryRes = await fetch(url, { ...init, headers: retryHeaders, credentials: "include" });
          if (retryRes.status === 401) await logout();
          return retryRes;
        }

        // Refresh itself failed → log out
        await logout();
      }

      return res;
    },
    [getToken, logout]
  );

  return authFetch;
}
