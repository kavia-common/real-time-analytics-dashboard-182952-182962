import React, { useEffect, useState } from "react";
import { login } from "../auth.js";
import { useLocation } from "react-router-dom";

/**
 * PUBLIC_INTERFACE
 * Login
 * Login page for existing users. On success, redirects to dashboard.
 */
export default function Login() {
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
      await login({ email, password });
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container theme-user">
      <div className="auth-blob one" aria-hidden="true" />
      <div className="auth-blob two" aria-hidden="true" />
      <div className="auth-card" role="region" aria-label="User sign in form">
        <div className="auth-header">
          <div className="auth-icon" aria-hidden="true">🔐</div>
          <div>
            <h2 className="auth-title">Welcome back</h2>
            <p className="auth-subtitle">Sign in to continue to your dashboard</p>
          </div>
        </div>
        {error ? <div className="auth-error" role="alert">{String(error)}</div> : null}
        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-label" htmlFor="email">
            Email
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true">📧</span>
              <input
                id="email"
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                aria-required="true"
                aria-invalid={error ? "true" : "false"}
              />
            </div>
          </label>
          <label className="auth-label" htmlFor="password">
            Password
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true">🔑</span>
              <input
                id="password"
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
          New here? <a href="/signup" className="btn-link">Create an account</a>
        </div>
      </div>
    </div>
  );
}
