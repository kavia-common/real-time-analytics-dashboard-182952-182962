import React, { useEffect, useMemo, useState } from 'react';
import EventsBarChart from '../components/EventsBarChart';
import EventsTable from '../components/EventsTable';
import LiveCounter from '../components/LiveCounter';
import { getRecentActivity } from '../api';

// PUBLIC_INTERFACE
export default function Dashboard() {
  /**
   * Dashboard view showing KPI summary, live metrics, charts, and latest events.
   * Visual polish only: micro-animations, glass/elevated cards, unified chart styling, and accessible focus states.
   * Note: Data fetching logic remains unchanged in this view.
   */
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch recent events (unchanged logic)
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const data = await getRecentActivity();
        if (isMounted) {
          setEvents(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; }
  }, []);

  // Derived KPI values from available data (presentation only)
  const totalEvents = useMemo(() => events?.length ?? 0, [events]);
  const usersToday = useMemo(() => {
    const today = new Date().toDateString();
    const setU = new Set(
      events
        .filter(e => e?.timestamp && new Date(e.timestamp).toDateString() === today)
        .map(e => e.username)
    );
    return setU.size;
  }, [events]);
  const signups7d = useMemo(() => {
    // Not changing backend calls; simply estimate from events containing 'signup' in type
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    return events.filter(e => {
      const t = e?.timestamp ? new Date(e.timestamp).getTime() : 0;
      return t >= sevenDaysAgo && (e?.event_type?.toLowerCase?.() || '').includes('signup');
    }).length;
  }, [events]);

  // Prepare a simple distribution dataset for EventsBarChart from current events (type -> count)
  const typeCounts = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      const key = (e?.event_type || 'unknown').toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).map(([type, count]) => ({ type, count }));
  }, [events]);

  return (
    <div className="container">
      <div className="header">
        <h1>Dashboard</h1>
        <span className="badge" tabIndex={0} role="status" aria-label="Live updates indicator">Live</span>
      </div>

      {/* Summary band with KPI chips */}
      <div className="summary-band fade-in-up" aria-label="Key performance indicators">
        <div className="kpi-chip kpi-chip--shimmer" tabIndex={0} aria-label={`Total Events ${totalEvents}`}>
          <span className="kpi-chip__label">Total Events</span>
          <span className="kpi-chip__value">{totalEvents}</span>
        </div>
        <div className="kpi-chip" tabIndex={0} aria-label={`Users Today ${usersToday}`}>
          <span className="kpi-chip__label">Users Today</span>
          <span className="kpi-chip__value">{usersToday}</span>
        </div>
        <div className="kpi-chip kpi-chip--accent" tabIndex={0} aria-label={`Signups (7d) ${signups7d}`}>
          <span className="kpi-chip__label">Signups (7d)</span>
          <span className="kpi-chip__value">{signups7d}</span>
        </div>
      </div>

      <div className="grid grid--loose" style={{ marginTop: 12 }}>
        <div className="card dash-card--glass fade-in-up" aria-labelledby="live-counter-title">
          <div className="section-title" id="live-counter-title">Live Counter</div>
          <div className="section-subtitle">Active users changing in real time</div>
          <LiveCounter />
        </div>

        <div className="card dash-card--elevated fade-in-up" aria-labelledby="events-type-chart-title">
          <div className="section-title" id="events-type-chart-title">Events by Type</div>
          <div className="section-subtitle">Distribution based on recent events</div>
          <div className="chart-wrap chart-theme--axis chart-theme--grid chart-gradient">
            <EventsBarChart data={typeCounts} />
          </div>
          <div className="chart-legend" aria-hidden="true">
            <span className="legend-dot" />
            <span>Events</span>
          </div>
        </div>

        <div className="card dash-card--elevated fade-in-up col-span-2" aria-labelledby="events-last10-title">
          <div className="section-title" id="events-last10-title">Events (last 10)</div>
          <div className="section-subtitle">Most recent user activity</div>
          {loading ? (
            <div className="text-muted">Loading...</div>
          ) : (
            <EventsTable events={events} />
          )}
        </div>
      </div>
    </div>
  );
}
