export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8001";

const TOKEN_KEYS = ["access_token", "token", "authToken", "blog_token", "jwt"];

function _decodeJwtPayload(token) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

function _isTokenExpired(token) {
  const payload = _decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    return false;
  }

  return payload.exp * 1000 <= Date.now();
}

export function getAuthToken() {
  for (const key of TOKEN_KEYS) {
    const value = window.localStorage.getItem(key);
    if (!value) {
      continue;
    }

    if (_isTokenExpired(value)) {
      clearAuthToken();
      return "";
    }

    return value;
  }

  return "";
}

export function setAuthToken(token) {
  TOKEN_KEYS.forEach((key) => window.localStorage.removeItem(key));
  if (token) {
    window.localStorage.setItem("access_token", token);
  }
}

export function clearAuthToken() {
  TOKEN_KEYS.forEach((key) => window.localStorage.removeItem(key));
}

export async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const detail = data?.detail?.message || data?.detail || data?.message || response.statusText;
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }

  return data;
}

export function jsonBody(value) {
  return JSON.stringify(value);
}
