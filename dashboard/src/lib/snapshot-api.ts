// lib/snapshot-api.ts — HA media_source WebSocket API for snapshot browsing

import type { Connection } from "home-assistant-js-websocket";

export type SnapshotSource = "person" | "motion" | "face" | "scheduled" | "stream" | "unknown";

export interface SnapshotEntry {
  mediaId: string;
  filename: string;
  /** Time formatted as "HH:MM:SS" */
  time: string;
  source: SnapshotSource;
}

function inferSource(filename: string): SnapshotSource {
  const lower = filename.toLowerCase();
  if (lower.includes("person")) return "person";
  if (lower.includes("motion")) return "motion";
  if (lower.includes("face")) return "face";
  if (lower.includes("scheduled")) return "scheduled";
  if (lower.includes("stream")) return "stream";
  return "unknown";
}

function filenameToTime(filename: string): string {
  // Try to extract HH-MM-SS pattern from filename
  const match = filename.match(/(\d{2})[-_](\d{2})[-_](\d{2})/);
  if (match) return `${match[1]}:${match[2]}:${match[3]}`;
  return "00:00:00";
}

/** List snapshots for a camera on a given date (YYYY-MM-DD) */
export async function listSnapshots(
  connection: Connection,
  cameraId: string,
  dateStr: string,
): Promise<SnapshotEntry[]> {
  try {
    const result = await connection.sendMessagePromise({
      type: "media_source/browse_media",
      media_content_id: `media-source://media_source/local/snapshots/${cameraId}/${dateStr}`,
    }) as { children?: Array<{ media_content_id: string; title: string }> };

    return (result.children ?? []).map((child) => ({
      mediaId: child.media_content_id,
      filename: child.title,
      time: filenameToTime(child.title),
      source: inferSource(child.title),
    }));
  } catch {
    return [];
  }
}

/** Resolve a media_source:// URL to a playable HTTP URL */
export async function resolveMediaUrl(
  connection: Connection,
  mediaId: string,
): Promise<string | null> {
  try {
    const result = await connection.sendMessagePromise({
      type: "media_source/resolve_media",
      media_content_id: mediaId,
    }) as { url: string };
    return result.url ?? null;
  } catch {
    return null;
  }
}
