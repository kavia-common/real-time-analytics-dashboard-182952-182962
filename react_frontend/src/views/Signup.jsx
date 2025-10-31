import React, { useMemo, useState } from "react";
import { signup } from "../auth.js";

/**
 * PUBLIC_INTERFACE
 * Signup
 * Signup page for new users. On success, redirects to dashboard.
 */
export default function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Simple password strength estimator: 0=empty, 1=weak, 2=medium, 3=strong
  const strength = useMemo(() => {
    const pwd = String(password || "");
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score++;
    return Math.min(3, score);
  }, [password]);

  const strengthClass = strength === 1 ? "pw-weak" : strength === 2 ? "pw-medium" : strength === 3 ? "pw-strong" : "";
  const strengthText = strength === 0 ? "Enter a password (min 8 chars)" : strength === 1 ? "Weak" : strength === 2 ? "Medium" : "Strong";

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await signup({ username, email, password });
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } catch (err) {
      setError(err?.message || "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container theme-user">
      <div className="auth-blob one" aria-hidden="true" />
      <div className="auth-blob two" aria-hidden="true" />
      <div className="auth-card" role="region" aria-label="User signup form">
        <div className="auth-header">
          <div className="auth-icon" aria-hidden="true">🧭</div>
          <div>
            <h2 className="auth-title">Create your account</h2>
            <p className="auth-subtitle">Get started with real-time insights</p>
          </div>
        </div>
        {error ? <div className="auth-error" role="alert">{String(error)}</div> : null}
        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-label" htmlFor="username">
            Username
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true">👤</span>
              <input
                id="username"
                type="text"
                className="auth-input"
                placeholder="yourname"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                aria-required="true"
              />
            </div>
          </label>
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
                aria-required="true"
              />
            </div>
          </label>
          <label className="auth-label" htmlFor="password">
            Password
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true">🔒</span>
              <input
                id="password"
                type="password"
                className="auth-input"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-required="true"
                aria-describedby="pw-hint"
              />
            </div>
            <div className={`pw-meter ${strengthClass}`} aria-hidden="true">
              <div className="pw-bar" />
              <div className="pw-bar" />
              <div className="pw-bar" />
            </div>
            <div id="pw-hint" className="pw-hint" role="note">Strength: {strengthText}</div>
          </label>
          <button
            className={`btn-primary auth-submit ${submitting ? "is-loading" : ""}`}
            type="submit"
            disabled={submitting}
            aria-busy={submitting ? "true" : "false"}
          >
            {submitting ? "Creating…" : "Create Account"}
          </button>
        </form>
        <div className="auth-alt">
          Already have an account? <a href="/login" className="btn-link">Sign in</a>
        </div>
      </div>
    </div>
  );
}
