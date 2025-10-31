//
// PUBLIC_INTERFACE
// Auth utilities: token storage, current user fetch, and API helpers.
//
import { getApiBaseUrl } from "./api.js";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

// PUBLIC_INTERFACE
export function getToken() {
  /** Returns the stored JWT token string or null if not present. */
  try {
    return globalThis?.localStorage?.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export function setToken(token) {
  /** Persists the JWT token to localStorage. */
  try {
    if (token) {
      globalThis.localStorage.setItem(TOKEN_KEY, token);
    } else {
      globalThis.localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

// PUBLIC_INTERFACE
export function clearAuth() {
  /** Clears token and user from storage. */
  try {
    globalThis.localStorage.removeItem(TOKEN_KEY);
    globalThis.localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

// PUBLIC_INTERFACE
export function getStoredUser() {
  /** Returns cached user object from localStorage if present. */
  try {
    const raw = globalThis.localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export function setStoredUser(user) {
  /** Persists user object to localStorage. */
  try {
    if (user) {
      globalThis.localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      globalThis.localStorage.removeItem(USER_KEY);
    }
  } catch {
    // ignore
  }
}

// PUBLIC_INTERFACE
export async function authFetch(path, options = {}) {
  /**
   * Wrapper around fetch that attaches Authorization: Bearer <token> when available.
   * Uses same-origin or VITE_API_BASE_URL.
   */
  const base = getApiBaseUrl();
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const token = getToken();

  const headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const f = typeof globalThis !== "undefined" && globalThis.fetch ? globalThis.fetch : null;
  if (!f) throw new Error("fetch is not available in this environment");

  const res = await f(url, {
    credentials: "include",
    ...options,
    headers,
  });
  return res;
}

// PUBLIC_INTERFACE
export async function signup({ username, email, password }) {
  /**
   * Calls POST /api/auth/signup to create a user. On success stores token and user.
   * Returns { user, token }.
   */
  const res = await authFetch("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || `Signup failed: ${res.status}`);
  }
  const data = await res.json();
  const { token, user } = data || {};
  setToken(token);
  setStoredUser(user);
  return data;
}

// PUBLIC_INTERFACE
export async function login({ email, password }) {
  /**
   * Calls POST /api/auth/login. On success stores token and user if returned.
   * Returns { user, token }.
   */
  const res = await authFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || `Login failed: ${res.status}`);
  }
  const data = await res.json();
  const { token, user } = data || {};
  setToken(token);
  // Some backends may not return user here, so fetch /me if missing
  if (user) {
    setStoredUser(user);
  } else {
    try {
      const me = await getCurrentUser();
      setStoredUser(me);
    } catch {
      // ignore
    }
  }
  return data;
}

// PUBLIC_INTERFACE
export async function getCurrentUser() {
  /** Calls GET /api/auth/me to retrieve the current user profile. */
  const res = await authFetch("/api/auth/me", { method: "GET" });
  if (!res.ok) {
    throw new Error(`Unauthorized: ${res.status}`);
  }
  const data = await res.json();
  return data?.user ?? data;
}

// PUBLIC_INTERFACE
export async function logout() {
  /** Clears token and user client-side. */
  clearAuth();
  return true;
}
