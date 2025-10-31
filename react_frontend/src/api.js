//
// API utilities for REST and Socket configuration
//

/* eslint-disable no-console */

// Same-origin sentinel for building URLs when no env is provided
const SAME_ORIGIN = "";

// Resolve same-origin for sockets when window is available
const defaultSocket =
  typeof globalThis !== "undefined" && typeof globalThis.window !== "undefined"
    ? globalThis.window.location.origin
    : "";

/**
 * PUBLIC_INTERFACE
 * getApiBaseUrl
 * Resolves the REST API base URL from env or falls back to same origin.
 * Primary variable: VITE_BACKEND_URL
 * Backward compatibility fallback: VITE_API_BASE_URL
 * If neither is set, returns empty string which means "same-origin".
 */
export function getApiBaseUrl() {
  const env = import.meta?.env;
  const base = env?.VITE_BACKEND_URL ?? env?.VITE_API_BASE_URL ?? SAME_ORIGIN;

  // Build-time/runtime guard: warn in production if BACKEND_URL missing.
  try {
    const isProd = env?.PROD === true || env?.MODE === "production";
    if (isProd && !env?.VITE_BACKEND_URL && typeof console !== "undefined") {
      console.warn(
        "[config] VITE_BACKEND_URL is not set in production; frontend will use same-origin for REST calls. Set VITE_BACKEND_URL to your backend URL."
      );
    }
  } catch {
    // ignore any env access errors
  }

  return base || SAME_ORIGIN;
}

/**
 * PUBLIC_INTERFACE
 * getUsersAnsweredToday
 * Returns { total: number, series: [{ time: ISOString, value: number }], timezone: 'UTC' }.
 */
export async function getUsersAnsweredToday() {
  const base = getApiBaseUrl();
  const url = `${base}/api/metrics/users-answered-today`;
  const res = await authorizedFetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`getUsersAnsweredToday failed: ${res.status}`);
  return res.json();
}

/**
 * PUBLIC_INTERFACE
 * getEventHeatmap
 * Returns { timezone: 'UTC', buckets: [{ hour: number, dow: number, count: number }], last24h: boolean }.
 * Accepts optional range param: '24h' | '7d' (default 7d).
 */
export async function getEventHeatmap(range = "7d") {
  const base = getApiBaseUrl();
  const url = `${base}/api/metrics/event-heatmap?range=${encodeURIComponent(range)}`;
  const res = await authorizedFetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`getEventHeatmap failed: ${res.status}`);
  return res.json();
}

/**
 * PUBLIC_INTERFACE
 * getSocketUrl
 * Resolves the Socket.io server URL with priority:
 * - VITE_SOCKET_URL
 * - VITE_BACKEND_URL
 * - same-origin (window.location.origin)
 */
export function getSocketUrl() {
  const env = import.meta?.env;
  const socket = env?.VITE_SOCKET_URL;
  if (socket && String(socket).trim() !== "") return socket;

  const backend = env?.VITE_BACKEND_URL ?? env?.VITE_API_BASE_URL ?? "";
  if (backend && String(backend).trim() !== "") return backend;

  return defaultSocket;
}

/**
 * PUBLIC_INTERFACE
 * authorizedFetch
 * A thin wrapper that attaches Authorization header if auth.js provides a token.
 * Note: Never sets credentials: 'include'.
 */
export async function authorizedFetch(url, options = {}) {
  let headers = { ...(options.headers || {}), "Content-Type": "application/json" };

  // Decide which token to attach based on URL path without referencing global URL/window
  try {
    // Extract pathname safely from absolute or relative URL
    let pathname = "";
    if (typeof url === "string") {
      if (url.startsWith("http://") || url.startsWith("https://")) {
        // Absolute URL: find the first slash after protocol and hostname
        const idxProto = url.indexOf("://");
        if (idxProto !== -1) {
          const afterProto = url.slice(idxProto + 3);
          const slashIdx = afterProto.indexOf("/");
          if (slashIdx !== -1) {
            pathname = afterProto.slice(slashIdx);
          } else {
            pathname = "/";
          }
        }
      } else {
        // Relative URL: ensure it begins with /
        pathname = url.startsWith("/") ? url : `/${url}`;
      }
    }

    if (pathname.startsWith("/api/admin")) {
      const adminMod = await import("./adminAuth.js");
      const aToken = adminMod.getAdminToken?.();
      if (aToken) {
        headers = { ...headers, Authorization: `Bearer ${aToken}` };
      }
    } else {
      const userMod = await import("./auth.js");
      const uToken = userMod.getToken?.();
      if (uToken) {
        headers = { ...headers, Authorization: `Bearer ${uToken}` };
      }
    }
  } catch {
    // ignore
  }

  const f = typeof globalThis !== "undefined" && typeof globalThis.fetch === "function" ? globalThis.fetch : null;
  if (!f) throw new Error("fetch is not available in this environment");

  // Do NOT send credentials (cookies). We rely solely on Bearer tokens for auth.
  return f(url, { ...options, headers });
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
    if (typeof console !== "undefined") console.warn("createEvent failed status:", res.status);
    throw new Error(`createEvent failed: ${res.status}`);
  }
  return res.json();
}

/**
 * PUBLIC_INTERFACE
 * getQuestions
 * Fetches public MCQ questions from GET /api/questions.
 */
export async function getQuestions() {
  const base = getApiBaseUrl();
  const url = `${base}/api/questions`;
  const res = await authorizedFetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`getQuestions failed: ${res.status}`);
  }
  return res.json();
}

/**
 * PUBLIC_INTERFACE
 * submitAnswer
 * Submits an answer via POST /api/answers.
 */
export async function submitAnswer(payload) {
  const base = getApiBaseUrl();
  const url = `${base}/api/answers`;
  const res = await authorizedFetch(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `submitAnswer failed: ${res.status}`);
  }
  return res.json();
}

/**
 * PUBLIC_INTERFACE
 * getEventTypeDistribution
 * Fetches distribution of event types for pie/donut charts.
 */
export async function getEventTypeDistribution() {
  const base = getApiBaseUrl();
  const url = `${base}/api/metrics/event-types`;
  const res = await authorizedFetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`getEventTypeDistribution failed: ${res.status}`);
  }
  return res.json();
}

/**
 * PUBLIC_INTERFACE
 * getSignupsPerDay
 * Returns array of { date: 'YYYY-MM-DD', count: number }.
 * Accepts optional range param: '7d' | '14d' | '30d' (backend may ignore; frontend handles gracefully).
 */
export async function getSignupsPerDay(range = "") {
  const base = getApiBaseUrl();
  const q = range ? `?range=${encodeURIComponent(range)}` : "";
  const url = `${base}/api/metrics/signups-per-day${q}`;
  const res = await authorizedFetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`getSignupsPerDay failed: ${res.status}`);
  return res.json();
}

/**
 * PUBLIC_INTERFACE
 * getActiveUsers
 * Returns per-minute active users series for a given window like '10m'.
 */
export async function getActiveUsers(window = "10m") {
  const base = getApiBaseUrl();
  const url = `${base}/api/metrics/active-users?window=${encodeURIComponent(window)}`;
  const res = await authorizedFetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`getActiveUsers failed: ${res.status}`);
  return res.json();
}

/**
 * PUBLIC_INTERFACE
 * getTotalEvents
 * Returns { total: number }.
 */
export async function getTotalEvents() {
  const base = getApiBaseUrl();
  const url = `${base}/api/metrics/total-events`;
  const res = await authorizedFetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`getTotalEvents failed: ${res.status}`);
  return res.json();
}

/**
 * PUBLIC_INTERFACE
 * getRecentActivity
 * Returns last 10 user events.
 */
export async function getRecentActivity() {
  const base = getApiBaseUrl();
  const url = `${base}/api/metrics/recent-activity`;
  const res = await authorizedFetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`getRecentActivity failed: ${res.status}`);
  return res.json();
}
