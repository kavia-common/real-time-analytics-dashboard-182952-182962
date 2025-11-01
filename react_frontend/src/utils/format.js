//
// PUBLIC_INTERFACE
// numberFmt
// Formats a number with locale thousand separators.
//
export function numberFmt(n, opts = {}) {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, opts);
}

// PUBLIC_INTERFACE
// dateFmtYMD
// Formats a YYYY-MM-DD string into a localized short date label.
//
export function dateFmtYMD(ymd) {
  try {
    if (!ymd) return "-";
    const [y, m, d] = String(ymd).split("-").map((x) => Number(x));
    const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
    if (Number.isNaN(dt.getTime())) return String(ymd);
    return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return String(ymd);
  }
}

// PUBLIC_INTERFACE
// dateFmtFull
// Formats a YYYY-MM-DD (or ISO) into a full localized date.
//
export function dateFmtFull(isoOrYmd) {
  try {
    if (!isoOrYmd) return "-";
    let d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrYmd)) {
      const [y, m, dd] = String(isoOrYmd).split("-").map((x) => Number(x));
      d = new Date(Date.UTC(y, (m || 1) - 1, dd || 1));
    } else {
      d = new Date(isoOrYmd);
    }
    if (Number.isNaN(d.getTime())) return String(isoOrYmd);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return String(isoOrYmd);
  }
}

// PUBLIC_INTERFACE
// computeMovingAverage
// Computes a simple moving average for an array of items using a numeric accessor.
// Returns an array aligned to input with nulls for the first (window-1) positions.
//
export function computeMovingAverage(arr, accessor, window = 7) {
  const out = new Array(arr.length).fill(null);
  if (!Array.isArray(arr) || arr.length === 0 || window <= 1) {
    return arr.map((v) => accessor(v));
  }
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    const val = Number(accessor(arr[i]) || 0);
    sum += val;
    if (i >= window) {
      sum -= Number(accessor(arr[i - window]) || 0);
    }
    if (i >= window - 1) {
      out[i] = sum / window;
    }
  }
  return out;
}

// PUBLIC_INTERFACE
// getMinAvgMax
// Returns { min, avg, max } for numeric series via accessor.
//
export function getMinAvgMax(arr, accessor) {
  const vals = (arr || []).map((v) => Number(accessor(v) || 0));
  if (vals.length === 0) return { min: 0, avg: 0, max: 0 };
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;
  for (const v of vals) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { min, avg: sum / vals.length, max };
}

// PUBLIC_INTERFACE
// deltaArrow
// Returns { delta, arrow, colorClass } where arrow is "▲"|"▼"|"–" and color classes for Ocean theme.
//
export function deltaArrow(current, previous) {
  const c = Number(current || 0);
  const p = Number(previous || 0);
  const delta = c - p;
  if (delta > 0) return { delta, arrow: "▲", colorClass: "delta-up" };
  if (delta < 0) return { delta, arrow: "▼", colorClass: "delta-down" };
  return { delta: 0, arrow: "–", colorClass: "delta-flat" };
}
