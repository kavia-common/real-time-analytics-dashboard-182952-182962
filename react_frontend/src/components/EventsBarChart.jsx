import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/**
 * PUBLIC_INTERFACE
 * EventsBarChart
 * Renders a simple bar chart of event counts grouped by event_type.
 */
export default function EventsBarChart({ data }) {
  return (
    <div className="chart-container">
      <h3 className="section-title">Events by Type</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,24,39,0.1)" />
          <XAxis dataKey="type" stroke="#111827" />
          <YAxis allowDecimals={false} stroke="#111827" />
          <Tooltip />
          <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
