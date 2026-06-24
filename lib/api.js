"use client";

// Empty string -> relative "/api", proxied to the backend by the Next.js
// rewrites in next.config.js. This keeps the browser same-origin with the
// admin app regardless of which host/IP it used, avoiding CORS issues.
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "") + "/api/admin";

const TOKEN_KEY = "gomall_admin_token";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Returns the WebSocket URL for the backend.
// In dev (no NEXT_PUBLIC_API_BASE_URL set): connects directly to port 4000.
// In production: derives from NEXT_PUBLIC_API_BASE_URL, e.g. https://api.example.com → wss://api.example.com/ws
export function getWsUrl() {
  if (typeof window === "undefined") return null;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  const raw = base
    ? base.replace(/^http/, "ws") + "/ws"
    : `ws://${window.location.hostname}:4000/ws`;
  // Always use wss:// on HTTPS pages (avoids SecurityError in production)
  return window.location.protocol === "https:"
    ? raw.replace(/^ws:\/\//, "wss://")
    : raw;
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, { method = "GET", body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let payload;
  if (body !== undefined) {
    if (isForm) {
      payload = body;
    } else {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }

  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, data?.message || res.statusText || "Request failed");
  }

  return data;
}

export const api = {
  get: (path) => request(path, { method: "GET" }),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  del: (path) => request(path, { method: "DELETE" }),
  upload: (path, formData) => request(path, { method: "POST", body: formData, isForm: true }),
  uploadPut: (path, formData) => request(path, { method: "PUT", body: formData, isForm: true }),
};

export function fileUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}
