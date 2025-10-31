import React, { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import Header from "../components/Header.jsx";
import {
  getActiveUsers,
  getEventTypeDistribution,
  getRecentActivity,
  getSignupsPerDay,
  getTotalEvents,
  getSocketUrl,
} from "../api.js";
import { getStoredUser } from "../auth.js";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

/**
 * PUBLIC_INTERFACE
 * Dashboard
 * Metrics dashboard showing:
 * - Total Events (counter)
 * - Event Types (pie/donut)
 * - Signups per Day (bar)
 * - Active Users last 10 min (line)
 * - Recent Activity (table)
 * Fetches from /api/metrics endpoints and refreshes on Socket.io events:
 * 'metrics_update' and 'user_event_created' (if available).
 */
export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [totalEvents, setTotalEvents] = useState(0);
  const [eventTypes, setEventTypes] = useState([]); // [{event_type,count}]
  const [signupsPerDay, setSignupsPerDay] = useState([]); // [{date,count}]
  const [activeUsers, setActiveUsers] = useState([]); // [{minute,count}]
  const [recentActivity, setRecentActivity] = useState([]); // events array
  const [activeWindow, setActiveWindow] = useState("10m");

  const socketRef = useRef(null);
  const user = getStoredUser();

  const COLORS = ["#2563EB", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#06B6D4", "#0EA5E9", "#14B8A6"];

  const loadAll = async () => {
    setLoading(true);
    try {
      const [total, types, signups, active, recent] = await Promise.allSettled([
        getTotalEvents(),
        getEventTypeDistribution(),
        getSignupsPerDay(),
        getActiveUsers(activeWindow),
        getRecentActivity(),
      ]);
      const errs = {};

      if (total.status === "fulfilled") {
        setTotalEvents(Number(total.value?.total || 0));
      } else {
        errs.total = total.reason?.message || "Failed total events";
      }

      if (types.status === "fulfilled") {
        setEventTypes(Array.isArray(types.value) ? types.value : []);
      } else {
        errs.types = types.reason?.message || "Failed event types";
      }

      if (signups.status === "fulfilled") {
        setSignupsPerDay(Array.isArray(signups.value) ? signups.value : []);
      } else {
        errs.signups = signups.reason?.message || "Failed signups/day";
      }

      if (active.status === "fulfilled") {
        setActiveUsers(Array.isArray(active.value) ? active.value : []);
      } else {
        errs.active = active.reason?.message || "Failed active users";
      }

      if (recent.status === "fulfilled") {
        setRecentActivity(Array.isArray(recent.value) ? recent.value : []);
      } else {
        errs.recent = recent.reason?.message || "Failed recent activity";
      }

      setErrors(errs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWindow]);

  // Socket for live refresh on metrics updates
  useEffect(() => {
    const socketURL = getSocketUrl();
    try {
      const s = io(socketURL, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        withCredentials: true,
      });
      socketRef.current = s;

      const refresh = () => {
        // lightweight refresh: pull total, event types, recent and active users
        (async () => {
          try {
            const [total, types, active, recent] = await Promise.allSettled([
              getTotalEvents(),
              getEventTypeDistribution(),
              getActiveUsers(activeWindow),
              getRecentActivity(),
            ]);
            if (total.status === "fulfilled") setTotalEvents(Number(total.value?.total || 0));
            if (types.status === "fulfilled") setEventTypes(Array.isArray(types.value) ? types.value : []);
            if (active.status === "fulfilled") setActiveUsers(Array.isArray(active.value) ? active.value : []);
            if (recent.status === "fulfilled") setRecentActivity(Array.isArray(recent.value) ? recent.value : []);
          } catch {
            // ignore one-off refresh errors
          }
        })();
      };

      s.on("metrics_update", refresh);
      s.on("user_event_created", refresh);
      // Some backends for this project already emit 'new_event'
      s.on("new_event", refresh);

      s.on("connect_error", (err) => {
        // eslint-disable-next-line no-console
        console.warn("Socket connect_error", err?.message);
      });

      return () => {
        try {
          s.removeAllListeners();
          s.disconnect();
        } catch {
          // ignore
        }
      };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Failed initializing socket", e);
      return () => {};
    }
  }, [activeWindow]);

  const donutData = useMemo(() => {
    return (eventTypes || []).map((t) => ({
      name: t.event_type || "unknown",
      value: Number(t.count || 0),
    }));
  }, [eventTypes]);

  const signupsData = useMemo(() => {
    // Ensure lexicographic date sort
    const arr = Array.isArray(signupsPerDay) ? [...signupsPerDay] : [];
    arr.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return arr;
  }, [signupsPerDay]);

  const activeUsersData = useMemo(() => {
    const arr = Array.isArray(activeUsers) ? [...activeUsers] : [];
    arr.sort((a, b) => String(a.minute).localeCompare(String(b.minute)));
    return arr;
  }, [activeUsers]);

  const TotalCounter = ({ total }) => {
    const [animate, setAnimate] = useState(false);
    useEffect(() => {
      setAnimate(true);
      const t = setTimeout(() => setAnimate(false), 250);
      return () => clearTimeout(t);
    }, [total]);
    return (
      <div className="live-counter">
        <div className={`live-counter-number ${animate ? "bump" : ""}`}>{total}</div>
        <div className="live-counter-label">Total Events</div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <Header title="Real-time Analytics Dashboard" subtitle="Live metrics and user activity" />

      {loading ? <div className="muted" style={{ margin: "10px 0" }}>Loading metrics…</div> : null}
      {Object.keys(errors).length > 0 ? (
        <div className="auth-error" style={{ margin: "10px 0" }}>
          Some metrics failed to load: {Object.values(errors).join(" • ")}
        </div>
      ) : null}

      <section className="cards">
        <div className="card">
          <TotalCounter total={totalEvents} />
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="muted">Active users window:</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["10m", "30m", "1h"].map((w) => (
                <button
                  key={w}
                  className="btn-primary"
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: activeWindow === w ? "var(--color-primary)" : "rgba(37,99,235,0.10)",
                    color: activeWindow === w ? "#fff" : "#1d4ed8",
                    boxShadow: activeWindow === w ? "0 10px 18px rgba(37,99,235,0.18)" : "var(--shadow-sm)",
                  }}
                  onClick={() => setActiveWindow(w)}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Event Types</h3>
          {donutData.length === 0 ? (
            <div className="muted">No data</div>
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                    {donutData.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      <section className="cards">
        <div className="card">
          <h3 className="section-title">Signups per Day</h3>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={signupsData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,24,39,0.1)" />
                <XAxis dataKey="date" stroke="#111827" />
                <YAxis allowDecimals={false} stroke="#111827" />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Active Users (last {activeWindow})</h3>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeUsersData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,24,39,0.1)" />
                <XAxis dataKey="minute" stroke="#111827" />
                <YAxis allowDecimals={false} stroke="#111827" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" name="Active Users" stroke="#2563EB" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="section-title">Recent Activity</h3>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "30%" }}>Username</th>
                <th style={{ width: "30%" }}>Event Type</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {(recentActivity || []).map((e, idx) => {
                const dt = e.timestamp ? new Date(e.timestamp) : null;
                const ts = dt ? dt.toLocaleString() : "-";
                return (
                  <tr key={e._id || `${e.username}-${e.timestamp}-${idx}`}>
                    <td>{e.username || user?.username || "-"}</td>
                    <td>
                      <span className={`pill pill-${(e.event_type || "unknown").toLowerCase()}`}>{e.event_type}</span>
                    </td>
                    <td>{ts}</td>
                  </tr>
                );
              })}
              {(!recentActivity || recentActivity.length === 0) ? (
                <tr>
                  <td colSpan="3" className="muted">No recent activity.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="footer">
        <span>Ocean Professional Theme</span>
      </footer>
    </div>
  );
}
