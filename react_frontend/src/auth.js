//
// PUBLIC_INTERFACE
// Auth utilities: token storage, current user fetch, and API helpers.
//
import { getApiBaseUrl, testBackendConnection } from "./api.js";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

// PUBLIC_INTERFACE
export function getToken() {
  try {
    return globalThis?.localStorage?.getItem(TOKEN_KEY) || null;
  } catch {
    // storage not available or access denied
    return null;
  }
}

// PUBLIC_INTERFACE
export function setToken(token) {
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
  try {
    globalThis.localStorage.removeItem(TOKEN_KEY);
    globalThis.localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

// PUBLIC_INTERFACE
export function getStoredUser() {
  try {
    const raw = globalThis.localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export function setStoredUser(user) {
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
  const base = getApiBaseUrl();
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const token = getToken();

  try {
    globalThis?.console?.log?.('🔧 authFetch called:', {
      baseUrl: base,
      fullUrl: url,
      method: options.method || 'GET',
      hasToken: !!token
    });
  } catch {
    // ignore logging issues
  }

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const f = typeof globalThis !== 'undefined' && globalThis.fetch ? globalThis.fetch : null;
    if (!f) throw new Error('fetch is not available in this environment');

    const response = await f(url, {
      credentials: "include", // Critical for CORS
      ...options,
      headers,
    });

    try {
      globalThis?.console?.log?.('🔧 authFetch response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        ok: response.ok
      });
    } catch {
      // ignore logging issues
    }

    return response;
  } catch (error) {
    try {
      globalThis?.console?.error?.('🔧 authFetch error:', error);
    } catch {
      // ignore logging issues
    }
    throw new Error(`Network error: ${error.message}`);
  }
}

// PUBLIC_INTERFACE
export async function signup({ username, email, password }) {
  try {
    globalThis?.console?.log?.('🔧 Signup attempt for:', email);
  } catch {
    // ignore logging issues
  }
  
  const res = await authFetch("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });

  if (!res.ok) {
    let errorMessage = `Signup failed: ${res.status}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      const errorText = await res.text().catch(() => "");
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }

  const data = await res.json();
  const { token, user } = data || {};
  
  if (token) setToken(token);
  if (user) setStoredUser(user);
  
  return data;
}

// PUBLIC_INTERFACE
export async function login({ email, password }) {
  try {
    globalThis?.console?.log?.('🔧 Login attempt for:', email);
  } catch {
    // ignore logging issues
  }
  
  // Test backend connection first
  const connectionTest = await testBackendConnection();
  if (!connectionTest.ok) {
    throw new Error(`Cannot connect to backend: ${connectionTest.error || 'Connection failed'}`);
  }

  const res = await authFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    let errorMessage = `Login failed: ${res.status}`;
    
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      try {
        const errorText = await res.text();
        if (errorText) errorMessage = errorText;
      } catch {
        // Use default error message
      }
    }
    
    try {
      globalThis?.console?.error?.('🔧 Login error:', errorMessage);
    } catch {
      // ignore logging issues
    }
    throw new Error(errorMessage);
  }

  const data = await res.json();
  try {
    globalThis?.console?.log?.('🔧 Login success:', data);
  } catch {
    // ignore logging issues
  }
  
  const { token, user } = data || {};
  
  if (token) {
    setToken(token);
  }
  
  if (user) {
    setStoredUser(user);
  } else {
    // Try to fetch user profile if not returned
    try {
      const me = await getCurrentUser();
      setStoredUser(me);
    } catch (error) {
      try {
        globalThis?.console?.warn?.('🔧 Failed to fetch user profile:', error);
      } catch {
        // ignore logging issues
      }
    }
  }
  
  return data;
}

// PUBLIC_INTERFACE
export async function getCurrentUser() {
  const res = await authFetch("/api/auth/me");
  
  if (!res.ok) {
    throw new Error(`Failed to get user: ${res.status}`);
  }
  
  const data = await res.json();
  return data?.user ?? data;
}

// PUBLIC_INTERFACE
export async function logout() {
  try {
    // Call backend logout if needed
    await authFetch("/api/auth/logout", { method: "POST" });
  } catch (error) {
    try {
      globalThis?.console?.warn?.('🔧 Logout API call failed:', error);
    } catch {
      // ignore logging issues
    }
  } finally {
    clearAuth();
  }
  return true;
}

// Export selected helpers
export { testBackendConnection };
