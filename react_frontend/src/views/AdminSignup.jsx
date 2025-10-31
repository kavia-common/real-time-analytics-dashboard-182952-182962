import React, { useState } from "react";
import { adminSignup } from "../adminAuth.js";

/**
 * PUBLIC_INTERFACE
 * AdminSignup
 * Admin signup page. On success, redirects to /admin.
 */
export default function AdminSignup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Create admin account</h2>
        <p className="auth-subtitle">Provision administrative access</p>
        {error ? <div className="auth-error">{String(error)}</div> : null}
        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-label">
            Username
            <input
              type="text"
              className="auth-input"
              placeholder="adminname"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="auth-label">
            Email
            <input
              type="email"
              className="auth-input"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="auth-label">
            Password
            <input
              type="password"
              className="auth-input"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button className="btn-primary auth-submit" type="submit" disabled={submitting}>
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
