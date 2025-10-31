# Frontend Environment Variables and Deployment Notes

This React (Vite) frontend reads the following vars (envPrefix: VITE_). Set them in your deployment environment (e.g., .env.production) before building.

Required for production:
- VITE_BACKEND_URL: Absolute base URL for REST API calls. Example: https://api.example.com
  - If missing in production, the app logs a warning at runtime and will attempt same-origin requests (e.g., /api/...).

Optional:
- VITE_API_BASE_URL: Legacy fallback for REST API base URL (only used if VITE_BACKEND_URL is not defined).
- VITE_SOCKET_URL: Socket.io endpoint for real-time updates. If omitted, the frontend falls back to:
  1) VITE_BACKEND_URL (if set), otherwise
  2) same-origin (window.location.origin).

Other app vars supported by this repository:
- VITE_MONGODB_URI, VITE_FRONTEND_ORIGIN, VITE_PORT, VITE_HOST, VITE_JWT_SECRET, VITE_TOKEN_EXPIRES_IN, VITE_ADMIN_EMAIL, VITE_ADMIN_PASSWORD
(Only relevant to the backend; listed here because they appear in the project .env set.)

Client behavior and CORS notes:
- All REST calls are made via fetch to `${VITE_BACKEND_URL}/api/...` (or fallback as described).
- The client NEVER uses credentials: 'include' on fetch. It uses Authorization: Bearer <token> headers only.
- Ensure your backend CORS allows the frontend origin (Vite dev or deployed site) without credentials.

Development:
- Vite dev server proxies /api and /socket.io to localhost:3001 (see vite.config.js).
- A small developer diagnostics banner appears in development (bottom-right) showing current API and Socket URLs.

Deployment checklist:
1) Set VITE_BACKEND_URL to your deployed backend (e.g., https://your-backend.example.com).
2) Optionally set VITE_SOCKET_URL if websockets should use a different host.
3) Build the frontend: npm run build (or your CI).
4) Serve the dist/ or host statically behind your chosen web server or the backend if integrated.
5) Verify the browser console has no [config] warnings and that all REST calls point to the intended host.

Troubleshooting:
- If you see a console warning in production "[config] VITE_BACKEND_URL is not set...", define VITE_BACKEND_URL and redeploy.
- If sockets fail to connect, confirm VITE_SOCKET_URL or fallback host matches your backend Socket.io server and that path=/socket.io is available.
