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
    <div className="auth-container theme-admin">
      <div className="auth-blob one" aria-hidden="true" />
      <div className="auth-blob two" aria-hidden="true" />
      <div className="auth-card" role="region" aria-label="Admin sign in form">
        <div className="auth-header">
          <div className="auth-icon" aria-hidden="true">🛡️</div>
          <div>
            <h2 className="auth-title">Admin Sign In</h2>
            <p className="auth-subtitle">Access administrative tools</p>
          </div>
        </div>
        {error ? <div className="auth-error" role="alert">{String(error)}</div> : null}
        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-label" htmlFor="admin-email">
            Email
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true">📧</span>
              <input
                id="admin-email"
                type="email"
                className="auth-input"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                aria-required="true"
                aria-invalid={error ? "true" : "false"}
              />
            </div>
          </label>
          <label className="auth-label" htmlFor="admin-password">
            Password
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true">🔑</span>
              <input
                id="admin-password"
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-required="true"
              />
            </div>
          </label>
          <button
            className={`btn-primary auth-submit ${submitting ? "is-loading" : ""}`}
            type="submit"
            disabled={submitting}
            aria-busy={submitting ? "true" : "false"}
          >
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
