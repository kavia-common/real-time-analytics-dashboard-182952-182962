import React from "react";

/**
 * PUBLIC_INTERFACE
 * EventsTable
 * Displays a table with columns: username, event_type, timestamp (localized), newest first.
 */
export default function EventsTable({ events }) {
  return (
    <div className="table-container">
      <h3 className="section-title">Latest Events</h3>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Event Type</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, idx) => {
              const dt = e.timestamp ? new Date(e.timestamp) : null;
              const ts = dt ? dt.toLocaleString() : "-";
              return (
                <tr key={e._id || `${e.username}-${e.timestamp}-${idx}`}>
                  <td>{e.username}</td>
                  <td>
                    <span className={`pill pill-${(e.event_type || "unknown").toLowerCase()}`}>
                      {e.event_type}
                    </span>
                  </td>
                  <td>{ts}</td>
                </tr>
              );
            })}
            {events.length === 0 ? (
              <tr>
                <td colSpan="3" className="muted">
                  No events yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
