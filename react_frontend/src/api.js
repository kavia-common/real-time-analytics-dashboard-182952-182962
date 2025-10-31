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

  // Decide which token to attach based on URL path without referencing global URL/window
  try {
    // Extract pathname safely from absolute or relative URL
    let pathname = "";
    if (typeof url === "string") {
      if (url.startsWith("http://") || url.startsWith("https://")) {
        // Absolute URL: find the first slash after protocol and hostname
        // e.g., https://host:port/path?query -> extract /path...
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
