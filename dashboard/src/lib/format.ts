// lib/format.ts — number, power, temperature, and time formatting utilities

export function parseNumericState(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null || value === "" || value === "unavailable" || value === "unknown") {
    return null;
  }
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return isNaN(n) ? null : n;
}

export function formatTemp(value: string | number | undefined | null): string | null {
  const n = parseNumericState(value);
  if (n === null) return null;
  return n.toFixed(1);
}

/** Convert a power value with its unit to watts */
export function toWatts(value: string | number | undefined, unit?: string): number | null {
  const n = parseNumericState(value);
  if (n === null) return null;
  if (!unit) return n;
  const u = unit.toLowerCase();
  if (u === "kw") return n * 1000;
  if (u === "mw") return n * 1_000_000;
  return n; // assume W
}

/** Format watts to a human-readable string */
export function formatPower(watts: number): string {
  if (Math.abs(watts) >= 1000) {
    return `${(watts / 1000).toFixed(1)} kW`;
  }
  return `${Math.round(watts)} W`;
}

/** Format milliseconds to a human-readable duration */
export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Format a Unix timestamp (ms) to HH:MM */
export function formatHour(timestamp: number): string {
  const d = new Date(timestamp);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Format a Date as a relative time string (e.g. "2h ago") */
export function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

/** Format a Date or ISO string as a relative time string */
export function formatRelativeTime(date: Date | string): string {
  return formatTimeAgo(typeof date === "string" ? new Date(date) : date);
}
