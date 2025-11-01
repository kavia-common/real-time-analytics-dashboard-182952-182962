//
// Centralized frontend configuration for API and Socket connections.
// Ensures absolute URLs, environment-driven configuration, and safe defaults.
//

/* PUBLIC_INTERFACE */
export function getBackendUrl() {
  /** Returns the effective backend base URL for REST calls.
   * Dev: '' to use relative '/api' with Vite proxy.
   * Prod: VITE_BACKEND_URL when provided, else same-origin.
   */
  const env = import.meta.env || {};
  if (env.DEV) return '';
  const envUrl = env.VITE_BACKEND_URL && String(env.VITE_BACKEND_URL).trim();
  if (envUrl) return stripTrailingSlash(envUrl);
  // same-origin fallback
  return (typeof globalThis !== 'undefined' && globalThis.window && globalThis.window.location && globalThis.window.location.origin)
    ? globalThis.window.location.origin
    : '';
}

/* PUBLIC_INTERFACE */
export function getSocketUrl() {
  /** Effective socket.io base URL.
   * Dev: '' to use relative '/socket.io' with Vite proxy.
   * Prod: VITE_SOCKET_URL; else VITE_BACKEND_URL; else same-origin.
   */
  const env = import.meta.env || {};
  if (env.DEV) return '';
  const socketEnv = env.VITE_SOCKET_URL && String(env.VITE_SOCKET_URL).trim();
  if (socketEnv) return stripTrailingSlash(socketEnv);
  const backend = env.VITE_BACKEND_URL && String(env.VITE_BACKEND_URL).trim();
  if (backend) return stripTrailingSlash(backend);
  return (typeof globalThis !== 'undefined' && globalThis.window && globalThis.window.location && globalThis.window.location.origin)
    ? globalThis.window.location.origin
    : '';
}

// PUBLIC_INTERFACE
export function getEnvDiagnostics() {
  /** Returns a small diagnostics object for startup logs and banner. */
  const backend = import.meta.env.VITE_BACKEND_URL?.trim() || '(same-origin fallback)';
  const socket = import.meta.env.VITE_SOCKET_URL?.trim() || '(fallback to backend/same-origin)';
  const mode = import.meta.env.MODE || (import.meta.env.DEV ? 'development' : 'production');
  return { backend, socket, mode };
}

function stripTrailingSlash(url) {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}
