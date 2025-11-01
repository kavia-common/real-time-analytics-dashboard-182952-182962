//
// Utility formatting helpers used across dashboard components.

// PUBLIC_INTERFACE
export function numberFmt(n, opts = {}) {
  /** Format a number with the current locale. */
  const v = Number(n || 0);
  return v.toLocaleString(undefined, opts);
}

// PUBLIC_INTERFACE
export function dateFmtYMD(d) {
  /** Format a date string YYYY-MM-DD from ISO or YMD input. */
  try {
    const dt = new Date(d);
    if (!isNaN(dt.valueOf())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    // fall back
    const s = String(d || '');
    return s.slice(0, 10);
  } catch {
    return String(d || '');
  }
}

// PUBLIC_INTERFACE
export function dateFmtFull(d) {
  /** Full date-time string with locale. */
  try {
    const dt = new Date(d);
    if (!isNaN(dt.valueOf())) {
      return dt.toLocaleString(undefined, { hour12: false });
    }
    return String(d || '');
  } catch {
    return String(d || '');
  }
}

// PUBLIC_INTERFACE
export function computeMovingAverage(arr, getValue = (x) => x, windowSize = 7) {
  /** Compute simple moving average over an array of data points. */
  const out = new Array(arr.length).fill(null);
  const w = Math.max(1, Number(windowSize));
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += Number(getValue(arr[i]) || 0);
    if (i >= w) {
      sum -= Number(getValue(arr[i - w]) || 0);
    }
    if (i >= w - 1) {
      out[i] = sum / w;
    }
  }
  return out;
}

// PUBLIC_INTERFACE
export function getMinAvgMax(arr, getValue = (x) => x) {
  /** Return { min, avg, max } over numeric sequence. */
  if (!Array.isArray(arr) || arr.length === 0) return { min: 0, avg: 0, max: 0 };
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let count = 0;
  for (const item of arr) {
    const v = Number(getValue(item) || 0);
    if (isNaN(v)) continue;
    min = Math.min(min, v);
    max = Math.max(max, v);
    sum += v;
    count++;
  }
  const avg = count > 0 ? sum / count : 0;
  if (!isFinite(min)) min = 0;
  if (!isFinite(max)) max = 0;
  return { min, avg, max };
}

// PUBLIC_INTERFACE
export function deltaArrow(current, previous) {
  /** Return arrow and styling info for deltas. */
  const c = Number(current || 0);
  const p = Number(previous || 0);
  const diff = c - p;
  if (diff > 0) {
    return { delta: diff, arrow: '▲', colorClass: 'delta-up' };
    } else if (diff < 0) {
    return { delta: diff, arrow: '▼', colorClass: 'delta-down' };
  }
  return { delta: 0, arrow: '–', colorClass: 'delta-flat' };
}
