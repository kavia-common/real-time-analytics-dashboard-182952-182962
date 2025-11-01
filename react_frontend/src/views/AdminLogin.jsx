import React, { useEffect, useState } from "react";
import { adminLogin } from "../adminAuth.js";
import { useLocation } from "react-router-dom";

/**
 * PUBLIC_INTERFACE
 * AdminLogin
 * Login page for admins in a modern purple-themed card. On success, redirects to /admin.
 */
export default function AdminLogin() {
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");
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

      <div className="auth-card auth-card--large auth-card--taller glass-card card-appear" role="region" aria-label="Admin sign in form">
        <div className="auth-stack">
          <div className="auth-headblock">
            <div className="auth-icon" aria-hidden="true">🛡️</div>
            <div className="auth-headtext">
              <h2 className="auth-title">Admin sign in</h2>
              <p className="auth-subtitle">Access administrative tools</p>
              <p className="auth-tagline">Welcome back, admin</p>
            </div>
          </div>

        {error ? <div className="auth-error" role="alert">{String(error)}</div> : null}

        <form onSubmit={onSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label" htmlFor="admin-email">Email</label>
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
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="admin-password">Password</label>
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
          </div>

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
    </div>
  );
}
