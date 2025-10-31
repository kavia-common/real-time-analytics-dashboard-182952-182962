import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App.jsx";
import Login from "./views/Login.jsx";
import Signup from "./views/Signup.jsx";
import Admin from "./views/Admin.jsx";
import Questions from "./views/Questions.jsx";
import { getToken, getCurrentUser, getStoredUser, setStoredUser, clearAuth } from "./auth.js";
import { getAdminToken, getCurrentAdmin, getStoredAdminUser, setStoredAdminUser, clearAdminAuth } from "./adminAuth.js";
import AdminLogin from "./views/AdminLogin.jsx";
import AdminSignup from "./views/AdminSignup.jsx";

/**
 * PUBLIC_INTERFACE
 * ProtectedRoute
 * Guards routes requiring authentication by validating presence of a token
 * and best-effort verifying it via /api/auth/me. Shows a lightweight loading
 * state while validating and redirects to /login when invalid.
 */
export function ProtectedRoute({ children }) {
  const [status, setStatus] = useState(() => {
    const token = getToken();
    if (!token) return "no-token";
    return "checking";
  });
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    // If there is no token, we immediately redirect by rendering Navigate.
    if (status !== "checking") return;

    (async () => {
      try {
        // Use cached user when available to avoid extra flash
        const cached = getStoredUser();
        if (cached) {
          if (active) setStatus("ok");
          // Also refresh in background
          getCurrentUser()
            .then((u) => setStoredUser(u))
            .catch(() => {});
          return;
        }
        const me = await getCurrentUser();
        if (active) {
          setStoredUser(me);
          setStatus("ok");
          setError("");
        }
      } catch (e) {
        // Token invalid or /me failed
        clearAuth();
        if (active) {
          setError("Your session has expired. Please sign in again.");
          setStatus("no-token");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [status]);

  if (status === "no-token") {
    return <Navigate to="/login" replace state={{ error }} />;
  }
  if (status === "checking") {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2 className="auth-title">Checking session…</h2>
          <p className="auth-subtitle">Please wait while we verify your access.</p>
        </div>
      </div>
    );
  }
  return children;
}

/**
 * PUBLIC_INTERFACE
 * AdminRoute
 * Example guard for admin-only views. Assumes user.role === 'admin'.
 */
export function AdminRoute({ children }) {
  // Simple role check using cached admin user; prefer new AdminProtectedRoute for robust checking
  const aToken = getAdminToken();
  const aUser = getStoredAdminUser();
  if (!aToken) return <Navigate to="/admin/login" replace />;
  if (!aUser || (aUser?.role && aUser.role !== "admin")) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

/**
 * PUBLIC_INTERFACE
 * AdminProtectedRoute
 * Guards admin routes by validating presence of admin token and verifying /api/admin/auth/me.
 */
export function AdminProtectedRoute({ children }) {
  const [status, setStatus] = useState(() => {
    const token = getAdminToken();
    if (!token) return "no-token";
    return "checking";
  });
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (status !== "checking") return;

    (async () => {
      try {
        const cached = getStoredAdminUser();
        if (cached) {
          if (active) setStatus("ok");
          // Refresh in background
          getCurrentAdmin()
            .then((u) => setStoredAdminUser(u))
            .catch(() => {});
          return;
        }
        const me = await getCurrentAdmin();
        if (active) {
          setStoredAdminUser(me);
          setStatus("ok");
          setError("");
        }
      } catch (e) {
        clearAdminAuth();
        if (active) {
          setError("Your admin session has expired. Please sign in again.");
          setStatus("no-token");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [status]);

  if (status === "no-token") {
    return <Navigate to="/admin/login" replace state={{ error }} />;
  }
  if (status === "checking") {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2 className="auth-title">Checking admin session…</h2>
          <p className="auth-subtitle">Please wait while we verify your access.</p>
        </div>
      </div>
    );
  }
  return children;
}

/**
 * PUBLIC_INTERFACE
 * AppRouter
 * Main router that defines public and protected routes.
 */
export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          }
        />
        <Route
          path="/questions"
          element={
            <ProtectedRoute>
              <Questions />
            </ProtectedRoute>
          }
        />

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/signup" element={<AdminSignup />} />
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <Admin />
            </AdminProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
