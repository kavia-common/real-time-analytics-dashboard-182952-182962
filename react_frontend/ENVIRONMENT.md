# Frontend Environment Variables and Deployment Guide

This React (Vite) frontend consumes environment variables prefixed with VITE_. Configure them in your deployment environment before building (e.g., .env.production for CI/build steps).

Variables table:
- VITE_BACKEND_URL: Required in production. Absolute base URL for REST API.
  - Example: https://api.example.com
  - If absent in production, the app will warn at startup and fall back to same-origin requests.
- VITE_SOCKET_URL: Optional. Absolute base URL for Socket.io (ws).
  - Fallback order: VITE_SOCKET_URL -> VITE_BACKEND_URL -> same-origin (window.location.origin).
- VITE_API_BASE_URL: Optional legacy alias for REST base. Only used if VITE_BACKEND_URL is unset.
- VITE_MONGODB_URI: Backend only; listed for reference.
- VITE_FRONTEND_ORIGIN: Backend only; listed for reference.
- VITE_PORT, VITE_HOST: Backend dev config; listed for reference.
- VITE_JWT_SECRET, VITE_TOKEN_EXPIRES_IN: Backend auth; listed for reference.
- VITE_ADMIN_EMAIL, VITE_ADMIN_PASSWORD: Backend seeding; listed for reference.

Behavioral notes:
- All REST calls are constructed with VITE_BACKEND_URL when set; otherwise same-origin.
- Authorization is via Bearer tokens in headers. The client never sets credentials: 'include'.
- Socket.io is initialized against VITE_SOCKET_URL (or fallback chain above) and does not use withCredentials.
- CORS: Ensure the backend allows the frontend origin without credentials.

Development:
- vite.config.js proxies:
  - /api -> http://localhost:3001
  - /socket.io -> http://localhost:3001
- A dev-only diagnostics banner shows the effective API and Socket URLs at the bottom right.

Build and deploy (static hosting or served by backend):
1) Create .env.production with:
   - VITE_BACKEND_URL=https://your-backend.example.com
   - (optional) VITE_SOCKET_URL=https://your-backend.example.com
2) Build: npm ci && npm run build
3) Serve the dist/ directory via your web server or integrate with your backend's static hosting.
4) Verify in browser console:
   - [config] Effective API base: ...
   - [config] Effective Socket base: ...
   - No production warning about missing VITE_BACKEND_URL.

Troubleshooting:
- Production warning about VITE_BACKEND_URL missing:
  - Set VITE_BACKEND_URL to the correct backend origin and redeploy.
- Socket connection issues:
  - Ensure the resolved socket base exposes /socket.io and supports websocket/polling.
  - Consider explicitly setting VITE_SOCKET_URL if Socket.io is hosted on a different origin.

