import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import AppRouter from "./router.jsx";
import { getApiBaseUrl } from "./api.js";
import { getSocketUrl } from "./api.js";

// Startup configuration logging and production warnings
(() => {
  try {
    const env = import.meta?.env || {};
    const api = getApiBaseUrl();
    const sock = getSocketUrl();
    // Log effective URLs
    // eslint-disable-next-line no-console
    console.log("[config] Effective API base:", api || "same-origin");
    // eslint-disable-next-line no-console
    console.log("[config] Effective Socket base:", sock || "same-origin");
    // Warn in production if BACKEND_URL is missing
    const isProd = env?.PROD === true || env?.MODE === "production";
    if (isProd && !env?.VITE_BACKEND_URL) {
      // eslint-disable-next-line no-console
      console.warn("[config] VITE_BACKEND_URL is missing in production; falling back to same-origin for REST calls. Set VITE_BACKEND_URL to your backend URL.");
    }
  } catch {
    // ignore
  }
})();

// Simple dev diagnostics banner component
function DevBanner() {
  useEffect(() => {
    // No-op: purely informational
  }, []);
  const api = getApiBaseUrl();
  const sock = getSocketUrl();
  const isDev = import.meta?.env?.DEV;
  if (!isDev) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        background: "rgba(17,24,39,0.92)",
        color: "#e5e7eb",
        padding: "8px 12px",
        borderRadius: 10,
        fontSize: 12,
        boxShadow: "0 8px 16px rgba(0,0,0,0.25)",
        zIndex: 9999,
        border: "1px solid rgba(255,255,255,0.08)",
        maxWidth: 360,
      }}
      role="note"
      aria-label="Development diagnostics"
      title="Development diagnostics"
    >
      <div style={{ fontWeight: 800, letterSpacing: 0.2, marginBottom: 4, color: "#93c5fd" }}>
        Dev Diagnostics
      </div>
      <div>API: <strong style={{ color: "#fbbf24" }}>{api || "same-origin"}</strong></div>
      <div>Socket: <strong style={{ color: "#fbbf24" }}>{sock || "same-origin"}</strong></div>
    </div>
  );
}

// Bootstrap the React application to #root
const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <>
    <AppRouter />
    <DevBanner />
  </>
);
