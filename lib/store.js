"use client";
import { useEffect, useState } from "react";
import { api, ApiError, getToken, setToken } from "./api";

// Real, JWT-backed admin session. The resolved admin profile (from
// GET /api/admin/auth/me) is cached in localStorage so pages can render
// synchronously, then refreshed from the server on mount.

const EVENT = "gomall_admin_session_change";
const CACHE_KEY = "gomall_admin";

function readCache() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
  } catch {
    return null;
  }
}

function writeCache(profile) {
  if (typeof window === "undefined") return;
  if (profile) localStorage.setItem(CACHE_KEY, JSON.stringify(profile));
  else localStorage.removeItem(CACHE_KEY);
  window.dispatchEvent(new Event(EVENT));
}

// Re-fetches the admin profile from the server and updates the cache.
// Returns the profile, or null if there's no token / the token is invalid.
export async function refreshAdminSession() {
  if (!getToken()) {
    writeCache(null);
    return null;
  }
  try {
    const admin = await api.get("/auth/me");
    writeCache(admin);
    return admin;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      setToken(null);
      writeCache(null);
    }
    throw err;
  }
}

export async function login(account, password) {
  const { token, admin } = await api.post("/auth/login", { account, password });
  setToken(token);
  writeCache(admin);
  return admin;
}

export function logout() {
  setToken(null);
  writeCache(null);
}

// Returns the cached admin profile, refreshing it from the server in the
// background. Returns `undefined` until the first client-side read so
// callers can distinguish "not yet known" from "logged out" (`null`).
export function useAdminSession() {
  // Start as `null` on both server and the first client render so hydration
  // matches; the cached profile (read from localStorage, client-only) is
  // applied in the effect below right after mount.
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(readCache());
    setReady(true);
    const handler = () => setSession(readCache());
    window.addEventListener(EVENT, handler);
    if (getToken()) {
      refreshAdminSession().catch(() => {});
    }
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  return { admin: session, ready };
}
