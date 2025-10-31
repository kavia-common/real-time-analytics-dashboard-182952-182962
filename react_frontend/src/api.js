const defaultBase = "";
// Guard window access for Node lint/build environments
const defaultSocket =
  typeof globalThis !== "undefined" && typeof globalThis.window !== "undefined"
    ? globalThis.window.location.origin
    : "";

/**
 * PUBLIC_INTERFACE
 * getApiBaseUrl
 * Resolves the REST API base URL from env or falls back to same origin.
 */
export function getApiBaseUrl() {
  const env = import.meta?.env;
  const base = env?.VITE_API_BASE_URL ?? defaultBase;
  return base || defaultBase;
}

/**
 * PUBLIC_INTERFACE
 * getSocketUrl
 * Resolves the Socket.io server URL from env or falls back to same origin.
 */
export function getSocketUrl() {
  const env = import.meta?.env;
  const base = env?.VITE_SOCKET_URL ?? defaultSocket;
  return base || defaultSocket;
}

/**
 * PUBLIC_INTERFACE
 * authorizedFetch
 * A thin wrapper that attaches Authorization header if auth.js provides a token.
 */
export async function authorizedFetch(url, options = {}) {
  let headers = { ...(options.headers || {}), "Content-Type": "application/json" };
  try {
    // Lazy import to avoid circular dep
    const mod = await import("./auth.js");
    const token = mod.getToken?.();
    if (token) {
      headers = { ...headers, Authorization: `Bearer ${token}` };
    }
  } catch {
    // ignore
  }
  const f = typeof globalThis !== "undefined" && globalThis.fetch ? globalThis.fetch : null;
  if (!f) throw new Error("fetch is not available in this environment");
  return f(url, { credentials: "include", ...options, headers });
}

/**
 * PUBLIC_INTERFACE
 * getEvents
 * Fetches the latest events from GET /api/events.
 */
export async function getEvents() {
  const base = getApiBaseUrl();
  const url = `${base}/api/events`;
  const res = await authorizedFetch(url, {});
  if (!res.ok) {
    throw new Error(`getEvents failed: ${res.status}`);
  }
  return res.json();
}

/**
 * PUBLIC_INTERFACE
 * createEvent
 * Creates a new event via POST /api/events.
 */
export async function createEvent(payload) {
  const base = getApiBaseUrl();
  const url = `${base}/api/events`;
  const res = await authorizedFetch(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`createEvent failed: ${res.status}`);
  }
  return res.json();
}
