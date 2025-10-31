import React, { useEffect, useState } from "react";
import { getStoredUser, getCurrentUser, logout, clearAuth } from "../auth.js";

/**
 * PUBLIC_INTERFACE
 * Header
 * Displays the application title and subtitle with themed styles and user menu.
 */
export default function Header({ title, subtitle }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Try to refresh user from backend if token exists and no user cached
    if (!user) {
      (async () => {
        setLoading(true);
        try {
          const me = await getCurrentUser();
          setUser(me);
          setError("");
        } catch (e) {
          setError("");
        } finally {
          setLoading(false);
        }
      })();
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    // Best-effort hard redirect to login
    try {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    } catch {
      // ignore
    }
  };

  return (
    <header className="header">
      <div className="header-text">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="header-user">
        {loading ? (
          <span className="muted">Loading...</span>
        ) : user ? (
          <div className="user-menu">
            <div className="avatar">{user?.username?.[0]?.toUpperCase() || "U"}</div>
            <div className="user-info">
              <div className="user-name">{user?.username || user?.email || "User"}</div>
              <button className="btn-link" onClick={handleLogout} title="Logout">Logout</button>
            </div>
          </div>
        ) : error ? (
          <span className="muted">{error}</span>
        ) : (
          <a className="btn-link" href="/login">Login</a>
        )}
      </div>
    </header>
  );
}
