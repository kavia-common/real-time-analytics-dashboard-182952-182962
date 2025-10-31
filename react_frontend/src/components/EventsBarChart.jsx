import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

/**
 * PUBLIC_INTERFACE
 * EventsBarChart
 * Renders a themed bar chart of event counts grouped by event_type with accessible legends and tooltips.
 */
export default function EventsBarChart({ data }) {
  const palette = useMemo(
    () => [
      "var(--chart-palette-1)",
      "var(--chart-palette-2)",
      "var(--chart-palette-3)",
      "var(--chart-palette-4)",
      "var(--chart-palette-5)",
      "var(--chart-palette-6)",
      "var(--chart-palette-7)",
      "var(--chart-palette-8)",
    ],
    []
  );

  const formatted = useMemo(() => Array.isArray(data) ? data : [], [data]);

  const numberFmt = (n) => {
    const v = Number(n || 0);
    return v.toLocaleString(undefined);
  };

  return (
    <div className="chart-container chart-gradient" role="img" aria-label="Bar chart of events by type">
      <h3 className="section-title">Events by Type</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formatted} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" />
          <XAxis
            dataKey="type"
            stroke="var(--chart-axis-stroke)"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            stroke="var(--chart-axis-stroke)"
            tickFormatter={numberFmt}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value, name) => [`${numberFmt(value)}`, "Count"]}
            labelFormatter={(label) => `Type: ${label}`}
          />
          <Legend verticalAlign="bottom" height={32} />
          <Bar
            dataKey="count"
            name="Events"
            radius={[8, 8, 0, 0]}
            fill="var(--chart-palette-1)"
            stroke="rgba(17,24,39,0.08)"
          >
            {formatted.map((entry, index) => (
              <Cell
                key={`cell-${entry.type}-${index}`}
                fill={palette[index % palette.length]}
                stroke="rgba(17,24,39,0.06)"
                onMouseOver={(e) => e?.target?.setAttribute?.("opacity", "0.9")}
                onMouseOut={(e) => e?.target?.setAttribute?.("opacity", "1")}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
