# Environment and Deployment Guide (React Frontend)

This frontend is built with Vite (React). It connects to the Express backend via REST and Socket.io using absolute URLs derived from environment variables.

Key behaviors:
- All REST calls are built from VITE_BACKEND_URL. If not set, the app falls back to same-origin.
- Socket.io connects using VITE_SOCKET_URL first; if not set, it falls back to VITE_BACKEND_URL; if that’s also missing, same-origin is used.
- The frontend never sends cookies or credentials. Authorization uses Bearer tokens when available.
- On production builds, a console warning is emitted if VITE_BACKEND_URL is missing.
- In development, a small diagnostics banner shows the effective API and Socket URLs.

## Environment variables

Set these variables in your .env (do not commit secrets):

Required for frontend runtime:
- VITE_BACKEND_URL
  - Description: Absolute base URL for the backend REST API and as a fallback for Socket.io.
  - Example: https://api.example.com
  - Notes: If omitted, the frontend will use same-origin and log a production warning.

- VITE_SOCKET_URL
  - Description: Absolute URL used by the Socket.io client. If not set, falls back to VITE_BACKEND_URL, then same-origin.
  - Example: https://api.example.com

Optional or backend-related (usually configured in backend container):
- VITE_API_BASE_URL
- VITE_MONGODB_URI
- VITE_FRONTEND_ORIGIN
- VITE_PORT
- VITE_HOST
- VITE_JWT_SECRET
- VITE_TOKEN_EXPIRES_IN
- VITE_ADMIN_EMAIL
- VITE_ADMIN_PASSWORD

## How URL resolution works

- REST: api base = VITE_BACKEND_URL if set, otherwise same-origin (window.location.origin).
- Socket: socket base = VITE_SOCKET_URL if set; else VITE_BACKEND_URL; else same-origin.

## Production notes

- Ensure VITE_BACKEND_URL is set to your backend’s public URL.
- If Socket.io runs on same host/port as REST (common), you can omit VITE_SOCKET_URL.
- CORS: The frontend will not send cookies. Configure backend CORS to allow the frontend origin and authorization headers.

## Local development

- If running frontend dev server (Vite) separate from backend, set:
  - VITE_BACKEND_URL=http://localhost:3001
  - VITE_SOCKET_URL=http://localhost:3001
- If serving the SPA from the backend, you may omit both; same-origin will be used.

## Build and run

- Install dependencies: npm install
- Start dev: npm run dev
- Build: npm run build
- Preview build: npm run preview

## Troubleshooting

- Missing API/Sockets configuration:
  - Check the banner (in dev) and console logs for the effective URLs.
  - In production builds, ensure VITE_BACKEND_URL is provided.
- Authentication:
  - The frontend uses Bearer tokens stored in localStorage. No cookies are sent.
- Socket connection issues:
  - Verify VITE_SOCKET_URL or VITE_BACKEND_URL is reachable and CORS/socket CORS is configured on the backend.
