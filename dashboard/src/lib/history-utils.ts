// lib/history-utils.ts — time series utilities

export interface TimePoint {
  timestamp: number;
  value: string | number;
}

/**
 * Merge multiple time series arrays, deduplicating by timestamp.
 * Later series override earlier ones for the same timestamp.
 */
export function mergeTimeSeries(seriesList: TimePoint[][]): TimePoint[] {
  const map = new Map<number, string | number>();
  for (const series of seriesList) {
    for (const point of series) {
      map.set(point.timestamp, point.value);
    }
  }
  return Array.from(map.entries())
    .map(([timestamp, value]) => ({ timestamp, value }))
    .sort((a, b) => a.timestamp - b.timestamp);
}
