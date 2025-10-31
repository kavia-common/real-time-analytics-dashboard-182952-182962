import React, { useEffect, useState } from "react";
import { adminLogin } from "../adminAuth.js";
import { useLocation } from "react-router-dom";

/**
 * PUBLIC_INTERFACE
 * AdminLogin
 * Login page for admins. On success, redirects to /admin.
 */
export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();

  useEffect(() => {
    if (location?.state?.error) {
      setError(location.state.error);
      if (typeof window !== "undefined") {
        window.history.replaceState({}, document.title);
      }
    }
  }, [location?.state?.error]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await adminLogin({ email, password });
      if (typeof window !== "undefined") {
        window.location.href = "/admin";
      }
    } catch (err) {
      setError(err?.message || "Admin login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Admin Sign In</h2>
        <p className="auth-subtitle">Access administrative tools</p>
        {error ? <div className="auth-error">{String(error)}</div> : null}
        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-label">
            Email
            <input
              type="email"
              className="auth-input"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="auth-label">
            Password
            <input
              type="password"
              className="auth-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button className="btn-primary auth-submit" type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <div className="auth-alt">
          Need an admin account? <a href="/admin/signup" className="btn-link">Admin signup</a>
        </div>
      </div>
    </div>
  );
}
