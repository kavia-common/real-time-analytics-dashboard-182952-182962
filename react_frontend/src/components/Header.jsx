import React, { useEffect, useState } from "react";
import { getStoredUser, getCurrentUser, logout } from "../auth.js";
import { getStoredAdminUser, getCurrentAdmin, adminLogout } from "../adminAuth.js";

/**
 * PUBLIC_INTERFACE
 * Header
 * Displays the application title and subtitle with themed styles and user menu.
 */
export default function Header({ title, subtitle }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [adminUser, setAdminUser] = useState(() => getStoredAdminUser());
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
      if (e.key === "admin_auth_user") {
        try {
          setAdminUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setAdminUser(null);
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
    (async () => {
      setLoading(true);
      try {
        if (!user) {
          const me = await getCurrentUser().catch(() => null);
          if (me) setUser(me);
        }
        if (!adminUser) {
          const adm = await getCurrentAdmin().catch(() => null);
          if (adm) setAdminUser(adm);
        }
      } finally {
        setLoading(false);
      }
    })();
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

  const handleAdminLogout = async () => {
    await adminLogout();
    setAdminUser(null);
    try {
      if (typeof window !== "undefined") {
        window.location.href = "/admin/login";
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
      <div className="header-user" style={{ gap: 16 }}>
        <a className="btn-link" href="/">Dashboard</a>
        {user ? <a className="btn-link" href="/questions">Questions</a> : null}
        <a className="btn-link" href="/admin">Admin</a>
        {loading ? (
          <span className="muted">Loading…</span>
        ) : (
          <>
            {user ? (
              <div className="user-menu">
                <div className="avatar">{user?.username?.[0]?.toUpperCase() || "U"}</div>
                <div className="user-info">
                  <div className="user-name">
                    {user?.username || user?.email || "User"}
                  </div>
                  <button className="btn-link" onClick={handleLogout} title="Logout">Logout</button>
                </div>
              </div>
            ) : (
              <a className="btn-link" href="/login">Login</a>
            )}
            {adminUser ? (
              <div className="user-menu">
                <div className="avatar">{adminUser?.username?.[0]?.toUpperCase() || "A"}</div>
                <div className="user-info">
                  <div className="user-name">
                    {adminUser?.username || adminUser?.email || "Admin"}{" "}
                    <span className="pill pill-view" style={{ marginLeft: 6 }}>ADMIN</span>
                  </div>
                  <button className="btn-link" onClick={handleAdminLogout} title="Logout admin">Admin Logout</button>
                </div>
              </div>
            ) : (
              <a className="btn-link" href="/admin/login">Admin Login</a>
            )}
          </>
        )}
      </div>
    </header>
  );
}
