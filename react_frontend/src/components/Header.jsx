import React, { useEffect, useMemo, useRef, useState } from "react";
import { getStoredUser, getCurrentUser, logout } from "../auth.js";
import {
  getStoredAdminUser,
  getCurrentAdmin,
  adminLogout,
} from "../adminAuth.js";

/**
 * PUBLIC_INTERFACE
 * Header
 * A professional, responsive top navigation bar with:
 * - Brand/Logo (left)
 * - Primary nav (center/left): Dashboard, Questions (if user), Admin (always; highlighted if admin)
 * - Session controls (right): Login/Signup when no user; user avatar with dropdown when signed in
 * - Separate admin badge/session and dropdown
 * - Mobile: hamburger toggles a slide-down drawer
 */
export default function Header({ title, subtitle }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [adminUser, setAdminUser] = useState(() => getStoredAdminUser());
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const drawerRef = useRef(null);

  // Derive current path for active link highlighting
  const pathname = useMemo(() => {
    if (typeof window !== "undefined") return window.location.pathname || "/";
    return "/";
  }, []);

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

  // Best-effort fetch user/admin if not cached
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

  // Close menus when clicking outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (userMenuOpen) setUserMenuOpen(false);
      if (adminMenuOpen) setAdminMenuOpen(false);
      // If clicking outside drawer on mobile, close
      if (mobileOpen && drawerRef.current && !drawerRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [userMenuOpen, adminMenuOpen, mobileOpen]);

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

  const Initial = (name, fallback) =>
    (name?.trim?.()[0] || fallback || "?").toUpperCase();

  const isActive = (href) => {
    if (!href) return false;
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="nav-header" role="banner">
      <div className="nav-shell">
        {/* Brand */}
        <a href="/" className="brand" aria-label="Go to dashboard">
          <span className="brand-icon" aria-hidden="true">🌊</span>
          <div className="brand-text">
            <span className="brand-name">Ocean Analytics</span>
            <span className="brand-sub">{title || "Real-time Dashboard"}</span>
          </div>
        </a>

        {/* Desktop Nav */}
        <nav className="nav-primary" aria-label="Primary">
          <a
            href="/"
            className={`nav-link ${isActive("/") ? "active" : ""}`}
          >
            Dashboard
          </a>
          {user ? (
            <a
              href="/questions"
              className={`nav-link ${isActive("/questions") ? "active" : ""}`}
            >
              Questions
            </a>
          ) : null}
          <a
            href="/admin"
            className={`nav-link ${isActive("/admin") ? "active" : ""}`}
          >
            Admin {adminUser ? <span className="badge-admin">Admin</span> : null}
          </a>
        </nav>

        {/* Right controls */}
        <div className="nav-actions">
          {loading ? (
            <span className="nav-loading" aria-live="polite">Loading…</span>
          ) : (
            <>
              {/* User session */}
              {user ? (
                <div className="session session-user">
                  <button
                    className="avatar-pill"
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen ? "true" : "false"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserMenuOpen((v) => !v);
                      setAdminMenuOpen(false);
                    }}
                    title={user?.email || user?.username || "User"}
                  >
                    <span className="avatar-circle">
                      {Initial(user?.username || user?.email, "U")}
                    </span>
                    <span className="avatar-name">
                      {user?.username || user?.email || "User"}
                    </span>
                    <span className="chev" aria-hidden="true">▾</span>
                  </button>
                  {userMenuOpen ? (
                    <ul className="menu-dropdown" role="menu" aria-label="User menu">
                      <li role="menuitem">
                        <a className="menu-item" href="/" onClick={() => setUserMenuOpen(false)}>
                          Dashboard
                        </a>
                      </li>
                      <li role="menuitem">
                        <a
                          className="menu-item"
                          href="/questions"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Questions
                        </a>
                      </li>
                      <li role="menuitem">
                        <button className="menu-item danger" onClick={handleLogout}>
                          Logout
                        </button>
                      </li>
                    </ul>
                  ) : null}
                </div>
              ) : (
                <div className="auth-cta">
                  <a className="btn-ghost" href="/login">Login</a>
                  <a className="btn-solid" href="/signup">Sign up</a>
                </div>
              )}

              {/* Admin session (separate) */}
              <div className="session session-admin">
                {adminUser ? (
                  <>
                    <button
                      className="avatar-pill admin"
                      aria-haspopup="menu"
                      aria-expanded={adminMenuOpen ? "true" : "false"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setAdminMenuOpen((v) => !v);
                        setUserMenuOpen(false);
                      }}
                      title={adminUser?.email || adminUser?.username || "Admin"}
                    >
                      <span className="avatar-circle admin">
                        {Initial(adminUser?.username || adminUser?.email, "A")}
                      </span>
                      <span className="avatar-name">
                        {adminUser?.username || adminUser?.email || "Admin"}
                      </span>
                      <span className="role-badge">ADMIN</span>
                      <span className="chev" aria-hidden="true">▾</span>
                    </button>
                    {adminMenuOpen ? (
                      <ul className="menu-dropdown" role="menu" aria-label="Admin menu">
                        <li role="menuitem">
                          <a className="menu-item" href="/admin" onClick={() => setAdminMenuOpen(false)}>
                            Admin Panel
                          </a>
                        </li>
                        <li role="menuitem">
                          <button className="menu-item danger" onClick={handleAdminLogout}>
                            Logout Admin
                          </button>
                        </li>
                      </ul>
                    ) : null}
                  </>
                ) : (
                  <a className="btn-ghost admin-link" href="/admin/login" aria-label="Admin login">
                    Admin
                  </a>
                )}
              </div>
            </>
          )}

          {/* Hamburger for mobile */}
          <button
            className={`hamburger ${mobileOpen ? "is-open" : ""}`}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen ? "true" : "false"}
            onClick={(e) => {
              e.stopPropagation();
              setMobileOpen((v) => !v);
            }}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        ref={drawerRef}
        className={`mobile-drawer ${mobileOpen ? "open" : ""}`}
        aria-hidden={mobileOpen ? "false" : "true"}
      >
        <nav className="mobile-nav" aria-label="Mobile">
          <a
            href="/"
            className={`mobile-link ${isActive("/") ? "active" : ""}`}
            onClick={() => setMobileOpen(false)}
          >
            Dashboard
          </a>
          {user ? (
            <a
              href="/questions"
              className={`mobile-link ${isActive("/questions") ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              Questions
            </a>
          ) : null}
          <a
            href="/admin"
            className={`mobile-link ${isActive("/admin") ? "active" : ""}`}
            onClick={() => setMobileOpen(false)}
          >
            Admin {adminUser ? <span className="badge-admin">Admin</span> : null}
          </a>

          <div className="mobile-divider" />

          {/* Mobile session controls */}
          {user ? (
            <>
              <div className="mobile-section">
                <div className="mobile-ident">
                  <span className="avatar-circle">{Initial(user?.username || user?.email, "U")}</span>
                  <div className="ident-text">
                    <div className="ident-name">{user?.username || user?.email}</div>
                    <div className="ident-role">User</div>
                  </div>
                </div>
                <button className="mobile-action danger" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="mobile-auth">
              <a className="btn-ghost block" href="/login" onClick={() => setMobileOpen(false)}>
                Login
              </a>
              <a className="btn-solid block" href="/signup" onClick={() => setMobileOpen(false)}>
                Sign up
              </a>
            </div>
          )}

          {/* Mobile admin session */}
          <div className="mobile-section">
            {adminUser ? (
              <>
                <div className="mobile-ident">
                  <span className="avatar-circle admin">
                    {Initial(adminUser?.username || adminUser?.email, "A")}
                  </span>
                  <div className="ident-text">
                    <div className="ident-name">
                      {adminUser?.username || adminUser?.email}
                    </div>
                    <div className="ident-role admin">Admin</div>
                  </div>
                </div>
                <a className="mobile-action" href="/admin" onClick={() => setMobileOpen(false)}>
                  Open Admin Panel
                </a>
                <button className="mobile-action danger" onClick={handleAdminLogout}>
                  Logout Admin
                </button>
              </>
            ) : (
              <a
                className="btn-ghost block admin-link"
                href="/admin/login"
                onClick={() => setMobileOpen(false)}
              >
                Admin Login
              </a>
            )}
          </div>
        </nav>
      </div>

      {/* Optional page-specific subtitle bar (compact) */}
      {subtitle ? (
        <div className="subbar" role="note">
          <span className="subbar-text">{subtitle}</span>
        </div>
      ) : null}
    </header>
  );
}
