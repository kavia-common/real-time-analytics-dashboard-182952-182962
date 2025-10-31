import React, { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import Header from "./components/Header.jsx";
import LiveCounter from "./components/LiveCounter.jsx";
import EventsBarChart from "./components/EventsBarChart.jsx";
import EventsTable from "./components/EventsTable.jsx";
import { getEvents, createEvent, getApiBaseUrl, getSocketUrl } from "./api.js";

/**
 * PUBLIC_INTERFACE
 * App
 * This is the main application component that:
 * - fetches initial events from /api/events
 * - connects to Socket.io to listen for 'new_event' messages
 * - maintains local state for events and total count
 * - provides a "Generate Test Event" button to POST /api/events
 */
export default function App() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const socketRef = useRef(null);

  // Fetch initial events on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const initial = await getEvents();
        // Ensure newest first, cap to 10
        const sorted = [...initial].sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        const capped = sorted.slice(0, 10);
        if (active) {
          setEvents(capped);
          setTotal(capped.length);
        }
      } catch (err) {
        console.warn("Failed to fetch initial events", err);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // Setup Socket.io connection
  useEffect(() => {
    const socketURL = getSocketUrl(); // VITE_SOCKET_URL or same-origin
    try {
      const s = io(socketURL, {
        path: "/socket.io", // default Socket.io path; backend should use same
        transports: ["websocket", "polling"],
        withCredentials: true,
      });
      socketRef.current = s;

      s.on("connect", () => {
        // Connected
      });

      s.on("new_event", (evt) => {
        // Prepend newest, cap to 10, increment total
        setEvents((prev) => {
          const next = [evt, ...prev];
          return next.slice(0, 10);
        });
        setTotal((t) => t + 1);
      });

      s.on("connect_error", (err) => {
        console.warn("Socket connect_error", err.message);
      });

      return () => {
        try {
          s.removeAllListeners();
          s.disconnect();
        } catch (_) {
          // ignore
        }
      };
    } catch (err) {
      console.warn("Failed to initialize socket", err);
      return () => {};
    }
  }, []);

  // Chart data: group by event_type counts from current events
  const chartData = useMemo(() => {
    const counts = events.reduce((acc, e) => {
      const key = e.event_type || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([type, count]) => ({
      type,
      count,
    }));
  }, [events]);

  const handleGenerate = async () => {
    const types = ["click", "view", "signup"];
    const randType = types[Math.floor(Math.random() * types.length)];
    const username = `user${Math.floor(Math.random() * 1000)}`;
    const payload = {
      username,
      event_type: randType,
      timestamp: new Date().toISOString(),
    };
    try {
      await createEvent(payload);
      // rely on 'new_event' from socket to update UI
    } catch (err) {
      console.warn("Failed to create test event", err);
    }
  };

  const apiBase = getApiBaseUrl();
  const socketBase = getSocketUrl();

  return (
    <div className="app-container">
      <Header title="Real-time Analytics Dashboard" subtitle="Live user events stream" />
      <div className="meta">
        <span className="meta-item">API: {apiBase}</span>
        <span className="meta-item">Socket: {socketBase}</span>
      </div>

      <section className="cards">
        <div className="card">
          <LiveCounter total={total} />
          <button className="btn-primary" onClick={handleGenerate}>
            Generate Test Event
          </button>
        </div>
        <div className="card">
          <EventsBarChart data={chartData} />
        </div>
      </section>

      <section className="card">
        <EventsTable events={events} />
      </section>

      <footer className="footer">
        <span>Ocean Professional Theme</span>
      </footer>
    </div>
  );
}
