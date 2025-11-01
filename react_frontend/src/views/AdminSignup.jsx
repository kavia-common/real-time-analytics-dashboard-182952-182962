import React, { useMemo, useState } from "react";
import { adminSignup } from "../adminAuth.js";

/**
 * PUBLIC_INTERFACE
 * AdminSignup
 * Admin signup page with modern purple-themed card and transitions. On success, redirects to /admin.
 */
export default function AdminSignup() {
  const [username, setUsername]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");

  const strength = useMemo(() => {
    const pwd = String(password || "");
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score++;
    return Math.min(3, score);
  }, [password]);

  const strengthClass =
    strength === 1 ? "pw-weak" : strength === 2 ? "pw-medium" : strength === 3 ? "pw-strong" : "";
  const strengthText =
    strength === 0 ? "Enter a password (min 8 chars)" : strength === 1 ? "Weak" : strength === 2 ? "Medium" : "Strong";

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await adminSignup({ username, email, password });
      if (typeof window !== "undefined") {
        window.location.href = "/admin";
      }
    } catch (err) {
      setError(err?.message || "Admin signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container theme-admin">
      <div className="auth-blob one" aria-hidden="true" />
      <div className="auth-blob two" aria-hidden="true" />

      <div className="auth-card card-appear" role="region" aria-label="Admin signup form">
        <div className="auth-header">
          <div className="auth-icon" aria-hidden="true">💼</div>
          <div>
            <h2 className="auth-title">Create admin account</h2>
            <p className="auth-subtitle">Provision administrative access</p>
          </div>
        </div>

        {error ? <div className="auth-error" role="alert">{String(error)}</div> : null}

        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-label" htmlFor="admin-username">
            Username
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true">👤</span>
              <input
                id="admin-username"
                type="text"
                className="auth-input"
                placeholder="adminname"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                aria-required="true"
              />
            </div>
          </label>

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
                aria-required="true"
              />
            </div>
          </label>

          <label className="auth-label" htmlFor="admin-password">
            Password
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true">🔒</span>
              <input
                id="admin-password"
                type="password"
                className="auth-input"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-required="true"
                aria-describedby="admin-pw-hint"
              />
            </div>

            <div className={`pw-meter ${strengthClass}`} aria-hidden="true">
              <div className="pw-bar" />
              <div className="pw-bar" />
              <div className="pw-bar" />
            </div>
            <div id="admin-pw-hint" className="pw-hint" role="note">Strength: {strengthText}</div>
          </label>

          <button
            className={`btn-primary auth-submit ${submitting ? "is-loading" : ""}`}
            type="submit"
            disabled={submitting}
            aria-busy={submitting ? "true" : "false"}
          >
            {submitting ? "Creating…" : "Create Admin"}
          </button>
        </form>

        <div className="auth-alt">
          Already an admin? <a href="/admin/login" className="btn-link">Sign in</a>
        </div>
      </div>
    </div>
  );
}
