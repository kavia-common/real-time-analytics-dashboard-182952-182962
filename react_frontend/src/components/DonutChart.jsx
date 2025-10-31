import React from 'react';

/**
 * DonutChart component renders a pie/donut style chart using pure SVG.
 * - Shows per-option segments with percentage and count labels.
 * - Highlights the correct option in both chart and legend.
 * - Accessible with role="img" and descriptive labels.
 *
 * Props:
 * - data: Array<{ label: string, value: number, isCorrect?: boolean, color?: string }>
 * - total: number (if not provided, computed as sum of values)
 * - title: string (for accessible name)
 * - showLegend: boolean
 * - innerRadiusRatio: number (0..0.9), default 0.6 for donut
 */
const defaultColors = ['#2563EB', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#06B6D4', '#F43F5E', '#84CC16'];

function toPercent(value, total) {
  if (total <= 0) return 0;
  return (value / total) * 100;
}

function formatPercent(p) {
  return `${Math.round(p)}%`;
}

export default function DonutChart({
  data = [],
  total: totalProp,
  title = 'Distribution',
  showLegend = true,
  innerRadiusRatio = 0.6,
}) {
  const total = typeof totalProp === 'number' ? totalProp : data.reduce((s, d) => s + (d.value || 0), 0);
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;
  const innerR = Math.max(0, Math.min(r - 2, r * innerRadiusRatio));

  // Prepare paths using cumulative angles.
  const totalValue = total || 1;
  let cumulative = 0;

  const slices = data.map((d, i) => {
    const value = Math.max(0, d.value || 0);
    const pct = value / totalValue;
    const startAngle = cumulative * 2 * Math.PI;
    const angle = pct * 2 * Math.PI;
    const endAngle = startAngle + angle;
    cumulative += pct;

    const largeArc = angle > Math.PI ? 1 : 0;
    const color = d.color || defaultColors[i % defaultColors.length];

    const x0 = cx + r - r * Math.cos(0); // not used, placeholder for clarity

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    const xi = cx + innerR * Math.cos(endAngle);
    const yi = cy + innerR * Math.sin(endAngle);
    const xo = cx + innerR * Math.cos(startAngle);
    const yo = cy + innerR * Math.sin(startAngle);

    const pathData = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${xi} ${yi}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${xo} ${yo}`,
      'Z',
    ].join(' ');

    // Label position at middle angle
    const midAngle = startAngle + angle / 2;
    const lx = cx + (innerR + (r - innerR) * 0.6) * Math.cos(midAngle);
    const ly = cy + (innerR + (r - innerR) * 0.6) * Math.sin(midAngle);

    return {
      ...d,
      i,
      color,
      pathData,
      labelX: lx,
      labelY: ly,
      percent: toPercent(value, total),
      value,
    };
  });

  const hasData = total > 0 && data.some(d => (d.value || 0) > 0);

  return (
    <div
      aria-label={title}
      role="img"
      className="donut-chart"
      style={{
        display: 'grid',
        gridTemplateColumns: showLegend ? 'auto 1fr' : '1fr',
        gap: '16px',
        alignItems: 'center',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${size} ${size}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ maxWidth: size, maxHeight: size }}
        aria-hidden={false}
      >
        <title>{title}</title>
        {/* Background ring */}
        <circle cx={cx} cy={cy} r={r} fill="#e5e7eb" />
        <circle cx={cx} cy={cy} r={innerR} fill="#fff" />

        {hasData ? (
          slices.map((s) => (
            <g key={s.i}>
              <path
                d={s.pathData}
                fill={s.color}
                opacity={s.isCorrect ? 1 : 0.9}
                stroke={s.isCorrect ? '#111827' : '#fff'}
                strokeWidth={s.isCorrect ? 2 : 1}
              >
                <title>
                  {`${s.label}: ${s.value} (${formatPercent(s.percent)})${s.isCorrect ? ' • Correct' : ''}`}
                </title>
              </path>
              {s.percent >= 8 && ( // avoid clutter for tiny slices
                <text
                  x={s.labelX}
                  y={s.labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="12"
                  fontWeight={s.isCorrect ? 700 : 600}
                  fill="#111827"
                  style={{ paintOrder: 'stroke', stroke: '#fff', strokeWidth: 3 }}
                >
                  {`${formatPercent(s.percent)} • ${s.value}`}
                </text>
              )}
            </g>
          ))
        ) : (
          <g>
            <circle cx={cx} cy={cy} r={r} fill="#e5e7eb" />
            <circle cx={cx} cy={cy} r={innerR} fill="#fff" />
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="14" fill="#6b7280">
              No data
            </text>
          </g>
        )}
      </svg>

      {showLegend && (
        <div aria-label="Legend" role="list" style={{ display: 'grid', gap: 8 }}>
          {slices.map((s) => (
            <div
              role="listitem"
              key={`legend-${s.i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 8,
                background: s.isCorrect ? 'linear-gradient(90deg, rgba(37,99,235,0.08), rgba(249,250,251,0))' : '#fff',
                boxShadow: s.isCorrect ? 'inset 0 0 0 1px #2563EB22' : 'inset 0 0 0 1px #e5e7eb',
              }}
            >
              <span
                aria-hidden="true"
                style={{ width: 12, height: 12, borderRadius: 2, background: s.color, border: s.isCorrect ? '2px solid #111827' : '1px solid #fff' }}
              />
              <span style={{ fontSize: 12, color: '#374151', flex: 1 }}>
                {s.label} {s.isCorrect ? '• Correct' : ''}
              </span>
              <span style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>
                {formatPercent(s.percent)} • {s.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
