import { clearAuthToken, getAuthToken } from "./api";

function decodeJwtPayload(token) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const decoded = window.atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function getValidAuthToken() {
  const token = getAuthToken();
  if (!token) {
    return "";
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    clearAuthToken();
    return "";
  }

  if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
    clearAuthToken();
    return "";
  }

  return token;
}

export function isAuthenticated() {
  return Boolean(getValidAuthToken());
}
