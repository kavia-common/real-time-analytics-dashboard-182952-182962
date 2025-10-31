import React, { useEffect, useState } from "react";
import { getStoredUser, getCurrentUser, logout } from "../auth.js";

/**
 * PUBLIC_INTERFACE
 * Header
 * Displays the application title and subtitle with themed styles and user menu.
 */
export default function Header({ title, subtitle }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(false);

  // Sync with storage changes across tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "auth_user") {
        try {
          setUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setUser(null);
        }
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", onStorage);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", onStorage);
      }
    };
  }, []);

  // Best-effort fetch user if not cached (valid token assumed by ProtectedRoute)
  useEffect(() => {
    if (!user) {
      (async () => {
        setLoading(true);
        try {
          const me = await getCurrentUser();
          setUser(me);
        } catch {
          // ignore
        } finally {
          setLoading(false);
        }
      })();
    }
  }, []); // run once

  const handleLogout = async () => {
    await logout();
    setUser(null);
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
          <span className="muted">Loading…</span>
        ) : user ? (
          <div className="user-menu">
            <div className="avatar">{user?.username?.[0]?.toUpperCase() || "U"}</div>
            <div className="user-info">
              <div className="user-name">
                {user?.username || user?.email || "User"}{" "}
                {user?.role === "admin" ? <span className="pill pill-view" style={{ marginLeft: 6 }}>ADMIN</span> : null}
              </div>
              <button className="btn-link" onClick={handleLogout} title="Logout">Logout</button>
            </div>
          </div>
        ) : (
          <a className="btn-link" href="/login">Login</a>
        )}
      </div>
    </header>
  );
}
