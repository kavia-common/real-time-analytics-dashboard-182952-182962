//
// PUBLIC_INTERFACE
// Admin Auth utilities: separate token/user storage and API helpers for admin routes.
//
import { getApiBaseUrl } from "./api.js";

const ADMIN_TOKEN_KEY = "admin_auth_token";
const ADMIN_USER_KEY = "admin_auth_user";

// PUBLIC_INTERFACE
export function getAdminToken() {
  /** Returns the stored Admin JWT token string or null if not present. */
  try {
    return globalThis?.localStorage?.getItem(ADMIN_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export function setAdminToken(token) {
  /** Persists the Admin JWT token to localStorage. */
  try {
    if (token) {
      globalThis.localStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
      globalThis.localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

// PUBLIC_INTERFACE
export function clearAdminAuth() {
  /** Clears admin token and admin user from storage. */
  try {
    globalThis.localStorage.removeItem(ADMIN_TOKEN_KEY);
    globalThis.localStorage.removeItem(ADMIN_USER_KEY);
  } catch {
    // ignore
  }
}

// PUBLIC_INTERFACE
export function getStoredAdminUser() {
  /** Returns cached admin user object from localStorage if present. */
  try {
    const raw = globalThis.localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export function setStoredAdminUser(user) {
  /** Persists admin user object to localStorage. */
  try {
    if (user) {
      globalThis.localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
    } else {
      globalThis.localStorage.removeItem(ADMIN_USER_KEY);
    }
  } catch {
    // ignore
  }
}

// PUBLIC_INTERFACE
export async function adminAuthFetch(path, options = {}) {
  /**
   * Wrapper around fetch that attaches Authorization: Bearer <adminToken> when available.
   * Uses same-origin or VITE_API_BASE_URL.
   */
  const base = getApiBaseUrl(); // In dev this is '', producing relative '/api/...'
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const token = getAdminToken();

  const headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const f =
    typeof globalThis !== "undefined" && globalThis.fetch
      ? globalThis.fetch
      : null;
  if (!f) throw new Error("fetch is not available in this environment");

  const res = await f(url, {
    credentials: "include",
    ...options,
    headers,
  });
  return res;
}

// PUBLIC_INTERFACE
export async function adminSignup({ username, email, password }) {
  /**
   * Calls POST /api/admin/auth/signup to create an admin. On success stores token and user.
   * Returns { user, token }.
   */
  const res = await adminAuthFetch("/api/admin/auth/signup", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || `Admin signup failed: ${res.status}`);
  }
  const data = await res.json();
  const { token, user } = data || {};
  setAdminToken(token);
  setStoredAdminUser(user);
  return data;
}

// PUBLIC_INTERFACE
export async function adminLogin({ email, password }) {
  /**
   * Calls POST /api/admin/auth/login. On success stores token and admin user if returned.
   * Returns { user, token }.
   */
  const res = await adminAuthFetch("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || `Admin login failed: ${res.status}`);
  }
  const data = await res.json();
  const { token, user } = data || {};
  setAdminToken(token);
  if (user) {
    setStoredAdminUser(user);
  } else {
    try {
      const me = await getCurrentAdmin();
      setStoredAdminUser(me);
    } catch {
      // ignore
    }
  }
  return data;
}

// PUBLIC_INTERFACE
export async function getCurrentAdmin() {
  /** Calls GET /api/admin/auth/me to retrieve the current admin profile. */
  const res = await adminAuthFetch("/api/admin/auth/me", { method: "GET" });
  if (!res.ok) {
    throw new Error(`Unauthorized: ${res.status}`);
  }
  const data = await res.json();
  return data?.user ?? data;
}

// PUBLIC_INTERFACE
export async function adminLogout() {
  clearAdminAuth();
  return true;
}
