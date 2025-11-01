//
// Lightweight API client: builds absolute URLs from backend base,
// injects Authorization Bearer if token is present, never uses credentials,
// and provides helper methods for common calls.
//

import { getBackendUrl } from './config';

// PUBLIC_INTERFACE
export function buildApiUrl(path) {
  /** Build an absolute API URL using the configured backend base. Accepts paths with or without leading '/'. */
  const base = getBackendUrl();
  const cleanPath = String(path || '').startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

function getAuthToken() {
  try {
    return (typeof globalThis !== 'undefined' && globalThis.localStorage)
      ? (globalThis.localStorage.getItem('token') || '')
      : '';
  } catch {
    return '';
  }
}

function defaultHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// PUBLIC_INTERFACE
export async function apiGet(path) {
  /** GET wrapper with Authorization header when available and no credentials. */
  const _fetch = (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') ? globalThis.fetch : null;
  if (!_fetch) throw new Error('fetch is not available in this environment');
  const res = await _fetch(buildApiUrl(path), {
    method: 'GET',
    headers: defaultHeaders(),
    // Explicitly avoid credentials for production readiness
    credentials: 'omit',
    mode: 'cors',
  });
  return handleJson(res);
}

// PUBLIC_INTERFACE
export async function apiPost(path, body) {
  /** POST wrapper with JSON body, Authorization header when available, and no credentials. */
  const _fetch2 = (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') ? globalThis.fetch : null;
  if (!_fetch2) throw new Error('fetch is not available in this environment');
  const res = await _fetch2(buildApiUrl(path), {
    method: 'POST',
    headers: defaultHeaders(),
    body: body != null ? JSON.stringify(body) : undefined,
    credentials: 'omit',
    mode: 'cors',
  });
  return handleJson(res);
}

async function handleJson(res) {
  const contentType = res.headers.get('content-type') || '';
  let payload = null;
  if (contentType.includes('application/json')) {
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
  } else {
    // attempt text fallback
    try {
      payload = await res.text();
    } catch {
      payload = null;
    }
  }
  if (!res.ok) {
    const error = new Error(`Request failed with ${res.status}`);
    error.status = res.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}
