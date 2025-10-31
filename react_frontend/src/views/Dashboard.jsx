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
import { numberFmt as nf, dateFmtYMD, dateFmtFull, computeMovingAverage, getMinAvgMax, deltaArrow } from "../utils/format.js";
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
  AreaChart,
  Area,
} from "recharts";

/**
 * PUBLIC_INTERFACE
 * Dashboard
 * Metrics dashboard showing:
 * - Total Events (counter)
 * - Events by Type (pie/donut)
 * - Daily Signups (bar)
 * - Active Users (last 10/30/60 minutes) (area/line, selectable window)
 * - Recent Activity (table)
 * Fetches from /api/metrics endpoints and refreshes on Socket.io:
 * 'metrics_update', 'user_event_created', 'new_event'.
 */
export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [totalEvents, setTotalEvents] = useState(0);
  const [eventTypes, setEventTypes] = useState([]); // [{event_type,count}]
  const [signupsPerDay, setSignupsPerDay] = useState([]); // [{date,count}]
  const [signupsRange, setSignupsRange] = useState("14d"); // 7d | 14d | 30d
  const [signupsBreakdown, setSignupsBreakdown] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]); // [{minute,count}]
  const [activeWindow, setActiveWindow] = useState("10m"); // '10m' | '30m' | '1h'
  const [auLoading, setAuLoading] = useState(false);
  const [auError, setAuError] = useState("");
  const [recentActivity, setRecentActivity] = useState([]); // events array

  // Additional metrics
  const [usersAnsweredToday, setUsersAnsweredToday] = useState({ total: 0, series: [], timezone: "UTC" });
  const [heatmap, setHeatmap] = useState({ buckets: [], timezone: "UTC", last24h: false });

  const socketRef = useRef(null);
  const user = getStoredUser();

  // Ocean Professional palette
  const COLORS = [
    "var(--chart-palette-1)",
    "var(--chart-palette-2)",
    "var(--chart-palette-3)",
    "var(--chart-palette-4)",
    "var(--chart-palette-5)",
    "var(--chart-palette-6)",
    "var(--chart-palette-7)",
    "var(--chart-palette-8)",
  ];

  const loadAll = async () => {
    setLoading(true);
    try {
      const [total, types, signups, recent, usersToday, heatmapData] = await Promise.allSettled([
        getTotalEvents(),
        getEventTypeDistribution(),
        getSignupsPerDay(signupsRange),
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

  const fetchActiveUsers = async (win = activeWindow) => {
    setAuLoading(true);
    setAuError("");
    try {
      const data = await getActiveUsers(win);
      setActiveUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setAuError("Unable to load active users.");
    } finally {
      setAuLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // first AU load
    fetchActiveUsers("10m");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signupsRange]);

  // Re-fetch AU when window changes
  useEffect(() => {
    fetchActiveUsers(activeWindow);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWindow]);

  const donutData = useMemo(() => {
    const total = (eventTypes || []).reduce((a, b) => a + Number(b.count || 0), 0);
    return (eventTypes || []).map((t) => ({
      name: t.event_type || "unknown",
      value: Number(t.count || 0),
      percent: total ? (Number(t.count || 0) / total) * 100 : 0,
    }));
  }, [eventTypes]);

  const signupsData = useMemo(() => {
    const arr = Array.isArray(signupsPerDay) ? [...signupsPerDay] : [];
    arr.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return arr;
  }, [signupsPerDay]);

  const signupsWithMA = useMemo(() => {
    const ma = computeMovingAverage(signupsData, (d) => d.count, 7);
    return signupsData.map((d, i) => ({ ...d, ma: ma[i] != null ? Number(ma[i]) : null }));
  }, [signupsData]);

  const signupsTotal = useMemo(() => signupsData.reduce((a, b) => a + Number(b.count || 0), 0), [signupsData]);
  const signupsStats = useMemo(() => getMinAvgMax(signupsData, (d) => d.count), [signupsData]);
  const signupsLatest = useMemo(() => (signupsData.length ? signupsData[signupsData.length - 1].count : 0), [signupsData]);
  const signupsPrev = useMemo(() => (signupsData.length > 1 ? signupsData[signupsData.length - 2].count : 0), [signupsData]);
  const signupsDelta = useMemo(() => deltaArrow(signupsLatest, signupsPrev), [signupsLatest, signupsPrev]);

  const last7 = useMemo(() => {
    const arr = [...signupsData];
    return arr.slice(Math.max(0, arr.length - 7)).map((d, i, sliced) => {
      const prev = i > 0 ? sliced[i - 1].count : null;
      return {
        ...d,
        delta: prev == null ? null : Number(d.count || 0) - Number(prev || 0),
      };
    });
  }, [signupsData]);

  const activeUsersData = useMemo(() => {
    const arr = Array.isArray(activeUsers) ? [...activeUsers] : [];
    arr.sort((a, b) => String(a.minute).localeCompare(String(b.minute)));
    return arr;
  }, [activeUsers]);

  const usersAnsweredSeries = useMemo(() => {
    const arr = Array.isArray(usersAnsweredToday?.series) ? [...usersAnsweredToday.series] : [];
    arr.sort((a, b) => String(a.time).localeCompare(String(b.time)));
    return arr.map((p) => ({ time: p.time, value: Number(p.value || 0) }));
  }, [usersAnsweredToday]);

  const heatmapMatrix = useMemo(() => {
    const buckets = Array.isArray(heatmap?.buckets) ? heatmap.buckets : [];
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

  const numberFmt = (n) => nf(n);
  const timeFmt = (iso) => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return String(iso);
      return d.toLocaleString(undefined, { hour12: false });
    } catch {
      return String(iso);
    }
  };

  const auTitleMap = { "10m": "last 10m", "30m": "last 30m", "1h": "last 1h" };
  const auTitle = auTitleMap[activeWindow] || "last 10m";

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
          <div className="live-counter" role="status" aria-live="polite" aria-label="Total Events counter">
            <div className="live-counter-number">{totalEvents}</div>
            <div className="live-counter-label">Total Events (all time)</div>
          </div>

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
          <div className="chart-container chart-gradient">
            {(donutData || []).length === 0 ? (
              <div className="empty-state" role="status" aria-live="polite">
                <span className="empty-icon" aria-hidden="true">ⓘ</span>
                <span>No data yet</span>
              </div>
            ) : (
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
                    formatter={(value, name, props) => {
                      const total = donutData.reduce((a, b) => a + b.value, 0);
                      return [`${nf(value)} (${((value / (total || 1)) * 100).toFixed(1)}%)`, props?.payload?.name || name];
                    }}
                    labelFormatter={(label) => `Type: ${label}`}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={40}
                    formatter={(value) => <span style={{ color: "var(--chart-legend-text)" }} aria-label={`Legend: ${value}`}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Grid 2: Engagement */}
      <section className="dashboard-grid" aria-label="Realtime engagement">
        <div className="dash-card" aria-label="Users who answered today">
          <h3 className="dash-heading">Users Answered Today</h3>
          <p className="dash-subheading">Unique users who submitted answers today (UTC)</p>
          <div className="live-counter" role="status" aria-live="polite" aria-label="Users answered today total">
            <div className="live-counter-number">{Number(usersAnsweredToday?.total || 0)}</div>
            <div className="live-counter-label">Total (today)</div>
          </div>
          <div className="chart-container chart-sm chart-gradient">
            {usersAnsweredSeries.length === 0 ? (
              <div className="empty-state" role="status" aria-live="polite">
                <span className="empty-icon" aria-hidden="true">ⓘ</span>
                <span>No data yet</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usersAnsweredSeries} margin={{ top: 10, right: 16, left: 0, bottom: 0 }} role="img" aria-label="Users answered today per minute">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" />
                  <XAxis dataKey="time" stroke="var(--chart-axis-stroke)" tick={{ fontSize: 12 }} tickFormatter={timeFmt} />
                  <YAxis allowDecimals={false} stroke="var(--chart-axis-stroke)" tick={{ fontSize: 12 }} tickFormatter={numberFmt} />
                  <Tooltip labelFormatter={(label) => `Time: ${timeFmt(label)}`} formatter={(value) => [`${numberFmt(value)} users`, "Unique Users"]} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Unique Users"
                    stroke="var(--color-secondary)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                  />
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
          <div className="q-head">
            <div>
              <h3 className="dash-heading">Daily Signups</h3>
              <p className="dash-subheading">New user accounts per day with 7-day moving average</p>
            </div>
            <div className="q-actions" role="group" aria-label="Signups range">
              <div className="segmented" title="Select range">
                {["7d", "14d", "30d"].map((r) => (
                  <button
                    key={r}
                    className={`segmented-btn ${signupsRange === r ? "active" : ""}`}
                    onClick={() => setSignupsRange(r)}
                    aria-pressed={signupsRange === r}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* KPI Row */}
          <div className="control-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="kpi-total">{nf(signupsTotal)} total signups</div>
              <div className={`kpi-sub ${signupsDelta.colorClass}`} title="Day-over-day change">
                {signupsDelta.arrow} {nf(Math.abs(signupsDelta.delta))} DoD
              </div>
            </div>
            <div className="kpi-badges" aria-label="Min/Avg/Max">
              <span className="kpi-badge min" title="Minimum per-day in range">Min: {nf(signupsStats.min)}</span>
              <span className="kpi-badge avg" title="Average per-day in range">Avg: {nf(Math.round(signupsStats.avg))}</span>
              <span className="kpi-badge max" title="Maximum per-day in range">Max: {nf(signupsStats.max)}</span>
            </div>
          </div>

          <div className="chart-container chart-gradient">
            {signupsWithMA.length === 0 ? (
              <div className="empty-state" role="status" aria-live="polite">
                <span className="empty-icon" aria-hidden="true">ⓘ</span>
                <span>No data yet</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={signupsWithMA}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                  role="img"
                  aria-label="Bar and line chart showing daily signups and 7-day moving average"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" />
                  <XAxis dataKey="date" stroke="var(--chart-axis-stroke)" tick={{ fontSize: 12 }} tickFormatter={dateFmtYMD} />
                  <YAxis allowDecimals={false} stroke="var(--chart-axis-stroke)" tick={{ fontSize: 12 }} tickFormatter={nf} />
                  <Tooltip
                    labelFormatter={(label) => `Date: ${dateFmtFull(label)}`}
                    formatter={(value, name, props) => {
                      const key = props?.dataKey;
                      if (key === "ma") {
                        return [`${nf(value)} (7d MA)`, "Moving Avg"];
                      }
                      return [`${nf(value)} signups`, "Signups"];
                    }}
                  />
                  <Legend formatter={(value) => <span style={{ color: "var(--chart-legend-text)" }}>{value}</span>} />
                  <Bar dataKey="count" name="Signups" fill="var(--chart-palette-1)" radius={[8, 8, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="ma"
                    name="7d MA"
                    stroke="var(--color-secondary)"
                    strokeWidth={2}
                    dot={{ r: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Optional breakdown toggle placeholder */}
          {signupsBreakdown ? (
            <div className="muted" style={{ marginTop: 8 }}>
              Breakdown by type is not available from backend. Hiding section.
            </div>
          ) : null}

          {/* Last 7 days mini table */}
          <table className="mini-table" role="table" aria-label="Last 7 days signups">
            <thead>
              <tr>
                <th>Date</th>
                <th>Count</th>
                <th>Delta</th>
              </tr>
            </thead>
            <tbody>
              {last7.map((d) => {
                const delta = d.delta;
                const cls = delta == null ? "flat" : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
                const arrow = delta == null ? "–" : delta > 0 ? "▲" : delta < 0 ? "▼" : "–";
                return (
                  <tr key={d.date}>
                    <td title={dateFmtFull(d.date)}>{dateFmtYMD(d.date)}</td>
                    <td>{nf(d.count)}</td>
                    <td>
                      <span className={`mini-pill ${cls}`}>
                        {arrow} {delta == null ? "n/a" : nf(Math.abs(delta))}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {last7.length === 0 ? (
                <tr>
                  <td colSpan="3" className="muted">No recent days</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Active Users widget with improved visuals and states */}
        <div className="dash-card" aria-label="Active users timeseries">
          <div className="q-head">
            <div>
              <h3 className="dash-heading">Active Users ({auTitle})</h3>
              <p className="dash-subheading">Unique users active per minute in the selected window</p>
            </div>
            <div className="q-actions" role="group" aria-label="Active users window">
              <div className="segmented" title="Select window">
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

          <div className="chart-container chart-gradient" style={{ position: "relative" }}>
            {auLoading && (
              <div className="empty-state" role="status" aria-live="polite" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="spinner" aria-hidden="true" />
                <span className="sr-only">Loading active users…</span>
              </div>
            )}
            {!auLoading && auError && (
              <div className="empty-state" role="alert" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="empty-icon" aria-hidden="true">⚠</span>
                <span>{auError}</span>
              </div>
            )}
            {!auLoading && !auError && activeUsersData.length === 0 ? (
              <div className="empty-state" role="status" aria-live="polite">
                <span className="empty-icon" aria-hidden="true">ⓘ</span>
                <span>No data in this window</span>
              </div>
            ) : null}

            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeUsersData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="auGradientFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" />
                <XAxis
                  dataKey="minute"
                  stroke="var(--chart-axis-stroke)"
                  tick={{ fontSize: 12 }}
                  tickFormatter={timeFmt}
                  tickLine={false}
                  axisLine={{ stroke: "var(--chart-grid-stroke)" }}
                  minTickGap={24}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="var(--chart-axis-stroke)"
                  tick={{ fontSize: 12 }}
                  tickFormatter={numberFmt}
                  tickLine={false}
                  axisLine={{ stroke: "var(--chart-grid-stroke)" }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, borderColor: "var(--chart-grid-stroke)" }}
                  labelStyle={{ color: "var(--text-color, #111827)", fontWeight: 600 }}
                  formatter={(value) => [`${numberFmt(value)} users`, "Active Users"]}
                  labelFormatter={(l) => timeFmt(l)}
                />
                <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Active Users"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#auGradientFill)"
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "#2563EB", fill: "#fff" }}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
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
