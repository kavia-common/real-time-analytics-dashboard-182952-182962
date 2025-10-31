/* eslint-disable no-undef */
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
 * getEvents
 * Fetches the latest events from GET /api/events.
 */
export async function getEvents() {
  const base = getApiBaseUrl();
  const url = `${base}/api/events`;
  const f = typeof globalThis !== "undefined" && globalThis.fetch ? globalThis.fetch : null;
  if (!f) {
    throw new Error("fetch is not available in this environment");
  }
  const res = await f(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
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
  const f = typeof globalThis !== "undefined" && globalThis.fetch ? globalThis.fetch : null;
  if (!f) {
    throw new Error("fetch is not available in this environment");
  }
  const res = await f(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`createEvent failed: ${res.status}`);
  }
  return res.json();
}
