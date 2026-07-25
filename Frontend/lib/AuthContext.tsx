"use client";

/**
 * AuthContext
 * -----------
 * Stores the access token in memory (NOT localStorage — avoids XSS exposure).
 * The refresh token lives in an httpOnly cookie set by the backend.
 *
 * On mount it calls GET /api/v1/auth/me to verify an existing session,
 * silently using the POST /api/v1/auth/refresh cookie path if needed.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Returns a valid (possibly refreshed) access token, or null if unauthenticated. */
  getToken: () => Promise<string | null>;
  /** Applies an externally-obtained token/user pair (used by support impersonation). */
  applyToken: (token: string, user: AuthUser) => void;
  /** True while an impersonated session is active — callers should not silently refresh. */
  isImpersonating: () => boolean;
}

import { getBackendBaseUrl } from "./backend";

const AuthContext = createContext<AuthState | null>(null);

const BACKEND = getBackendBaseUrl();

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BACKEND}${path}`, {
    credentials: "include",   // sends httpOnly cookies (refresh_token)
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  return res;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Hold the latest access token in a ref so async callbacks always see it.
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = accessToken;

  // Impersonation flag: while true, nobody may silently call /auth/refresh —
  // that endpoint reads the support/admin's own httpOnly cookie and would
  // revert the session back to them mid-impersonation.
  // ponytail: single ref threaded through, not a general session-mode abstraction.
  const impersonatingRef = useRef(false);
  const isImpersonating = useCallback(() => impersonatingRef.current, []);

  // ── try to restore session from the refresh-cookie on mount ──────────────
  useEffect(() => {
    if (impersonatingRef.current) return; // never reachable today (mount runs once, pre-impersonation) — guarded anyway
    (async () => {
      try {
        // 1) try refreshing silently
        const refreshRes = await apiFetch("/api/v1/auth/refresh", { method: "POST" });
        if (refreshRes.ok) {
          const { access_token } = await refreshRes.json();
          setAccessToken(access_token);
          tokenRef.current = access_token;

          // 2) fetch user profile with the new token
          const meRes = await apiFetch("/api/v1/auth/me", {
            headers: { Authorization: `Bearer ${access_token}` },
          });
          if (meRes.ok) {
            const { user: u } = await meRes.json();
            setUser(u);
          }
        }
      } catch {
        // not logged in — that's fine
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── getToken: returns valid token, refreshing if it's near expiry ─────────
  const getToken = useCallback(async (): Promise<string | null> => {
    if (!tokenRef.current) return null;

    // Decode exp without a library (base64 the payload segment)
    try {
      const [, payloadB64] = tokenRef.current.split(".");
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
      const expiresInSec = payload.exp - Math.floor(Date.now() / 1000);

      if (expiresInSec > 60) return tokenRef.current; // still valid

      // While impersonating, refreshing would use the support/admin's own
      // cookie and silently swap the session back to them. Let it expire
      // instead — the next request will 401 and useAuthFetch will log out.
      if (impersonatingRef.current) return tokenRef.current;

      // Proactively refresh when < 60 s left
      const res = await apiFetch("/api/v1/auth/refresh", { method: "POST" });
      if (res.ok) {
        const { access_token } = await res.json();
        setAccessToken(access_token);
        tokenRef.current = access_token;
        return access_token;
      }
    } catch {
      // decode error — return existing token and let the server reject it
    }

    return tokenRef.current;
  }, []);

  // ── login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail ?? "Login failed");
    impersonatingRef.current = false;
    setAccessToken(data.access_token);
    tokenRef.current = data.access_token;
    setUser(data.user);
  }, []);

  // ── signup ────────────────────────────────────────────────────────────────
  const signup = useCallback(async (email: string, password: string) => {
    const res = await apiFetch("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail ?? "Signup failed");
    setAccessToken(data.access_token);
    tokenRef.current = data.access_token;
    setUser(data.user);
  }, []);

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await apiFetch("/api/v1/auth/logout", { method: "POST" });
    impersonatingRef.current = false;
    setAccessToken(null);
    tokenRef.current = null;
    setUser(null);
  }, []);

  // ── applyToken (used by impersonation: apply an externally-obtained token/user pair) ──
  const applyToken = useCallback((token: string, impersonatedUser: AuthUser) => {
    impersonatingRef.current = true;
    setAccessToken(token);
    tokenRef.current = token;
    setUser(impersonatedUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, signup, logout, getToken, applyToken, isImpersonating }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
