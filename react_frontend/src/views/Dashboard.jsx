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
  getUsersAnsweredToday,
  getEventHeatmap,
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
 * - Events by Type (pie/donut)
 * - Daily Signups (bar)
 * - Active Users (last 10 min) (line, window can change)
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

  // New widgets' state
  const [usersAnsweredToday, setUsersAnsweredToday] = useState({ total: 0, series: [], timezone: "UTC" });
  const [heatmap, setHeatmap] = useState({ buckets: [], timezone: "UTC", last24h: false });

  const socketRef = useRef(null);
  const user = getStoredUser();

  // Ocean Professional palette
  const COLORS = ["#2563EB", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#06B6D4", "#0EA5E9", "#14B8A6"];

  const loadAll = async () => {
    setLoading(true);
    try {
      const [total, types, signups, active, recent, usersToday, heatmapData] = await Promise.allSettled([
        getTotalEvents(),
        getEventTypeDistribution(),
        getSignupsPerDay(),
        getActiveUsers(activeWindow),
        getRecentActivity(),
        getUsersAnsweredToday(),
        getEventHeatmap("7d"),
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

      if (usersToday.status === "fulfilled") {
        const v = usersToday.value || {};
        setUsersAnsweredToday({
          total: Number(v.total || 0),
          series: Array.isArray(v.series) ? v.series : [],
          timezone: v.timezone || "UTC",
        });
      } else {
        errs.usersToday = usersToday.reason?.message || "Failed users answered today";
      }

      if (heatmapData.status === "fulfilled") {
        const v = heatmapData.value || {};
        setHeatmap({
          buckets: Array.isArray(v.buckets) ? v.buckets : [],
          timezone: v.timezone || "UTC",
          last24h: !!v.last24h,
        });
      } else {
        errs.heatmap = heatmapData.reason?.message || "Failed event heatmap";
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
            const [total, types, active, recent, usersToday, heatmapData] = await Promise.allSettled([
              getTotalEvents(),
              getEventTypeDistribution(),
              getActiveUsers(activeWindow),
              getRecentActivity(),
              getUsersAnsweredToday(),
              getEventHeatmap(heatmap?.last24h ? "24h" : "7d"),
            ]);
            if (total.status === "fulfilled") setTotalEvents(Number(total.value?.total || 0));
            if (types.status === "fulfilled") setEventTypes(Array.isArray(types.value) ? types.value : []);
            if (active.status === "fulfilled") setActiveUsers(Array.isArray(active.value) ? active.value : []);
            if (recent.status === "fulfilled") setRecentActivity(Array.isArray(recent.value) ? recent.value : []);
            if (usersToday.status === "fulfilled") {
              const v = usersToday.value || {};
              setUsersAnsweredToday({
                total: Number(v.total || 0),
                series: Array.isArray(v.series) ? v.series : [],
                timezone: v.timezone || "UTC",
              });
            }
            if (heatmapData.status === "fulfilled") {
              const v = heatmapData.value || {};
              setHeatmap({
                buckets: Array.isArray(v.buckets) ? v.buckets : [],
                timezone: v.timezone || "UTC",
                last24h: !!v.last24h,
              });
            }
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
    const arr = Array.isArray(signupsPerDay) ? [...signupsPerDay] : [];
    arr.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return arr;
  }, [signupsPerDay]);

  const activeUsersData = useMemo(() => {
    const arr = Array.isArray(activeUsers) ? [...activeUsers] : [];
    arr.sort((a, b) => String(a.minute).localeCompare(String(b.minute)));
    return arr;
  }, [activeUsers]);

  // Users Answered Today series chart data
  const usersAnsweredSeries = useMemo(() => {
    const arr = Array.isArray(usersAnsweredToday?.series) ? [...usersAnsweredToday.series] : [];
    arr.sort((a, b) => String(a.time).localeCompare(String(b.time)));
    return arr.map((p) => ({ time: p.time, value: Number(p.value || 0) }));
  }, [usersAnsweredToday]);

  // Heatmap matrix transform: dow (0-6) vs hour (0-23)
  const heatmapMatrix = useMemo(() => {
    const buckets = Array.isArray(heatmap?.buckets) ? heatmap.buckets : [];
    // Create 7 x 24 matrix initialized with 0
    const matrix = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    for (const b of buckets) {
      const h = Number(b?.hour ?? -1);
      const d = Number(b?.dow ?? -1);
      if (h >= 0 && h < 24 && d >= 0 && d < 7) {
        matrix[d][h] = Number(b.count || 0);
      }
    }
    return matrix;
  }, [heatmap]);

  const TotalCounter = ({ total }) => {
    const [animate, setAnimate] = useState(false);
    useEffect(() => {
      setAnimate(true);
      const t = setTimeout(() => setAnimate(false), 250);
      return () => clearTimeout(t);
    }, [total]);
    return (
      <div className="live-counter" role="status" aria-live="polite" aria-label="Total Events counter">
        <div className={`live-counter-number ${animate ? "bump" : ""}`}>{total}</div>
        <div className="live-counter-label">Total Events (all time)</div>
      </div>
    );
  };

  const formatPercent = (value, total) => {
    const t = total || 0;
    if (!t) return "0%";
    return `${((value / t) * 100).toFixed(1)}%`;
  };

  return (
    <div className="app-container">
      <Header title="Real-time Analytics Dashboard" subtitle="Live metrics and user activity" />

      {loading ? <div className="skeleton skeleton-text" aria-busy="true" aria-live="polite">Loading metrics…</div> : null}
      {Object.keys(errors).length > 0 ? (
        <div className="auth-error" style={{ margin: "10px 0" }} role="alert">
          Some metrics failed to load: {Object.values(errors).join(" • ")}
        </div>
      ) : null}

      {/* Grid 1: Overview */}
      <section className="dashboard-grid" aria-label="Top metrics">
        <div className="dash-card" aria-label="Total events and controls">
          <h3 className="dash-heading">Total Events (all time)</h3>
          <p className="dash-subheading">Cumulative number of user-generated events since tracking began</p>
          <TotalCounter total={totalEvents} />
          <div className="control-row" role="group" aria-label="Active users time window">
            <span className="muted">Active users window</span>
            <div className="segmented">
              {["10m", "30m", "1h"].map((w) => (
                <button
                  key={w}
                  className={`segmented-btn ${activeWindow === w ? "active" : ""}`}
                  onClick={() => setActiveWindow(w)}
                  aria-pressed={activeWindow === w}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="dash-card" aria-label="Events by type chart">
          <h3 className="dash-heading">Events by Type</h3>
          <p className="dash-subheading">Share of events across categories</p>
          {donutData.length === 0 ? (
            <div className="empty-state" role="status" aria-live="polite">
              <span className="empty-icon" aria-hidden="true">ⓘ</span>
              <span>No data yet</span>
            </div>
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart role="img" aria-label="Donut chart showing events distribution by type">
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={96}
                    paddingAngle={2}
                  >
                    {donutData.map((d, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => {
                      const total = donutData.reduce((a, b) => a + b.value, 0);
                      return [`${value} (${formatPercent(value, total)})`, name];
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={40}
                    formatter={(value) => <span aria-label={`Legend: ${value}`}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* Grid 2: Engagement (Heatmap spans 2 columns on md+) */}
      <section className="dashboard-grid" aria-label="Realtime engagement">
        <div className="dash-card" aria-label="Users who answered today">
          <h3 className="dash-heading">Users Answered Today</h3>
          <p className="dash-subheading">Unique users who submitted answers today (UTC)</p>
          <div className="live-counter" role="status" aria-live="polite" aria-label="Users answered today total">
            <div className="live-counter-number">{Number(usersAnsweredToday?.total || 0)}</div>
            <div className="live-counter-label">Total (today)</div>
          </div>
          <div className="chart-container chart-sm">
            {usersAnsweredSeries.length === 0 ? (
              <div className="empty-state" role="status" aria-live="polite">
                <span className="empty-icon" aria-hidden="true">ⓘ</span>
                <span>No data yet</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usersAnsweredSeries} margin={{ top: 10, right: 16, left: 0, bottom: 0 }} role="img" aria-label="Users answered today per minute">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,24,39,0.08)" />
                  <XAxis dataKey="time" stroke="#111827" />
                  <YAxis allowDecimals={false} stroke="#111827" />
                  <Tooltip labelFormatter={(label) => `Time: ${label}`} formatter={(value) => [`${value} users`, "Unique Users"]} />
                  <Line type="monotone" dataKey="value" name="Unique Users" stroke="var(--color-secondary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="dash-card md-col-span-2" aria-label="Event heatmap">
          <h3 className="dash-heading">Event Heatmap</h3>
          <p className="dash-subheading">Events by day of week and hour (UTC)</p>
          <div className="control-row">
            <span className="muted">Range</span>
            <div className="segmented">
              {[
                { key: "24h", label: "Last 24h" },
                { key: "7d", label: "Last 7d" },
              ].map((r) => (
                <button
                  key={r.key}
                  className={`segmented-btn ${heatmap?.last24h ? (r.key === "24h" ? "active" : "") : (r.key === "7d" ? "active" : "")}`}
                  onClick={async () => {
                    try {
                      const v = await getEventHeatmap(r.key);
                      setHeatmap({
                        buckets: Array.isArray(v?.buckets) ? v.buckets : [],
                        timezone: v?.timezone || "UTC",
                        last24h: r.key === "24h",
                      });
                    } catch {
                      // keep existing
                    }
                  }}
                  aria-pressed={heatmap?.last24h ? r.key === "24h" : r.key === "7d"}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="heatmap-container">
            {heatmapMatrix.flat().length === 0 ? (
              <div className="empty-state" role="status" aria-live="polite">
                <span className="empty-icon" aria-hidden="true">ⓘ</span>
                <span>No data yet</span>
              </div>
            ) : (
              <div role="img" aria-label="Heatmap grid (rows: days Su-Sa, columns: hours 0-23)" className="heatmap-grid-wrapper">
                <div className="heatmap-grid">
                  <div className="heatmap-header">D/H</div>
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div key={`h-${h}`} className="heatmap-header">{h}</div>
                  ))}
                  {["Su","Mo","Tu","We","Th","Fr","Sa"].map((dLabel, d) => (
                    <React.Fragment key={`row-${d}`}>
                      <div className="heatmap-header">{dLabel}</div>
                      {Array.from({ length: 24 }).map((_, h) => {
                        const val = heatmapMatrix?.[d]?.[h] ?? 0;
                        const max = 10;
                        const intensity = Math.min(1, val / max);
                        const bg = `rgba(37,99,235,${0.1 + intensity * 0.5})`;
                        return (
                          <div
                            key={`cell-${d}-${h}`}
                            title={`Day ${dLabel}, Hour ${h}: ${val}`}
                            className="heatmap-cell"
                            style={{ background: val === 0 ? "#eef2ff" : bg }}
                          />
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Grid 3: Trends */}
      <section className="dashboard-grid" aria-label="Trend charts">
        <div className="dash-card" aria-label="Daily signups chart">
          <h3 className="dash-heading">Daily Signups</h3>
          <p className="dash-subheading">Number of new user accounts created per day</p>
          <div className="chart-container">
            {signupsData.length === 0 ? (
              <div className="empty-state" role="status" aria-live="polite">
                <span className="empty-icon" aria-hidden="true">ⓘ</span>
                <span>No data yet</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={signupsData}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                  role="img"
                  aria-label="Bar chart showing daily signups"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,24,39,0.08)" />
                  <XAxis dataKey="date" stroke="#111827" />
                  <YAxis allowDecimals={false} stroke="#111827" />
                  <Tooltip
                    labelFormatter={(label) => `Date: ${label}`}
                    formatter={(value) => [`${value} signups`, "Count"]}
                  />
                  <Bar dataKey="count" name="Signups" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="dash-card" aria-label="Active users timeseries">
          <h3 className="dash-heading">Active Users (last {activeWindow})</h3>
          <p className="dash-subheading">Unique users active per minute in the selected window</p>
          <div className="chart-container">
            {activeUsersData.length === 0 ? (
              <div className="empty-state" role="status" aria-live="polite">
                <span className="empty-icon" aria-hidden="true">ⓘ</span>
                <span>No data yet</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={activeUsersData}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                  role="img"
                  aria-label={`Line chart showing active users per minute in last ${activeWindow}`}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,24,39,0.08)" />
                  <XAxis dataKey="minute" stroke="#111827" />
                  <YAxis allowDecimals={false} stroke="#111827" />
                  <Tooltip
                    labelFormatter={(label) => `Time: ${label}`}
                    formatter={(value) => [`${value} users`, "Active Users"]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Active Users"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="dash-card" aria-label="Recent activity table">
        <h3 className="dash-heading">Recent Activity</h3>
        <p className="dash-subheading">Most recent user events with timestamps</p>
        <div className="table-scroll">
          <table className="table" role="table" aria-label="Recent activity list">
            <thead>
              <tr>
                <th style={{ width: "30%" }} scope="col">Username</th>
                <th style={{ width: "30%" }} scope="col">Event Type</th>
                <th scope="col">Timestamp</th>
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
                  <td colSpan="3" className="muted">No data yet</td>
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
