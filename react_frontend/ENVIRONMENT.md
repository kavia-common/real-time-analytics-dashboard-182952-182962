# Frontend Environment Variables

The React (Vite) frontend reads the following environment variables:

- VITE_BACKEND_URL: Base URL for REST API calls (preferred).
- VITE_API_BASE_URL: Legacy fallback for REST API base URL. Used only if VITE_BACKEND_URL is not defined.
- VITE_SOCKET_URL: Socket.io endpoint for real-time updates. If not defined, defaults to same-origin.

Notes:
- When neither VITE_BACKEND_URL nor VITE_API_BASE_URL is provided, the app uses same-origin for REST (empty base, e.g., fetch('/api/...')).
- Socket.io remains configured via VITE_SOCKET_URL and does not use the REST base URL.
