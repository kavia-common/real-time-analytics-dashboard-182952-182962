//
// Centralized frontend configuration for API and Socket connections.
// Ensures absolute URLs, environment-driven configuration, and safe defaults.
//

// PUBLIC_INTERFACE
export function getBackendUrl() {
  /** Returns the effective backend base URL for REST calls. */
  const envUrl = import.meta.env.VITE_BACKEND_URL?.trim();
  if (envUrl) return stripTrailingSlash(envUrl);
  // Fallback to same-origin (useful in local dev when served via backend)
  return (typeof globalThis !== 'undefined' && globalThis.window && globalThis.window.location && globalThis.window.location.origin)
    ? globalThis.window.location.origin
    : '';
}

// PUBLIC_INTERFACE
export function getSocketUrl() {
  /** Returns the effective socket.io base URL. Prefers VITE_SOCKET_URL, then VITE_BACKEND_URL, then same-origin. */
  const socketEnv = import.meta.env.VITE_SOCKET_URL?.trim();
  if (socketEnv) return stripTrailingSlash(socketEnv);
  const backend = import.meta.env.VITE_BACKEND_URL?.trim();
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
