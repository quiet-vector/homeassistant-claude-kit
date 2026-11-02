// lib/tv-adapter.ts — TV platform adapter abstraction

import type { HassEntities } from "home-assistant-js-websocket";

export type RemoteAction =
  | "up" | "down" | "left" | "right" | "select" | "ok"
  | "back" | "home" | "menu"
  | "play_pause" | "rewind" | "fast_forward"
  | "previous" | "next";

export interface AppDefinition {
  name: string;
  icon: string;
  color: string;
  /** Platform-specific app ID (e.g. com.netflix.ninja) */
  appId?: string;
}

export interface TvAdapter {
  platform: string;
  supportedActions: Set<RemoteAction>;
  getCurrentApp(
    entities: HassEntities,
    remoteEntity: string,
    mediaPlayerId: string,
  ): AppDefinition | undefined;
  keyCode(action: RemoteAction): string;
  launchApp(
    app: AppDefinition,
    mediaPlayerId: string,
  ): { domain: string; service: string; data: Record<string, unknown>; target: Record<string, string> };
}

// ── Common app catalog ────────────────────────────────────────────────────

export const APP_DEFINITIONS: AppDefinition[] = [
  { name: "Netflix",         icon: "simple-icons:netflix",    color: "#E50914", appId: "com.netflix.ninja" },
  { name: "YouTube",         icon: "simple-icons:youtube",    color: "#FF0000", appId: "com.google.android.youtube.tv" },
  { name: "Prime Video",     icon: "simple-icons:primevideo", color: "#00A8E0", appId: "com.amazon.amazonvideo.livingroom" },
  { name: "Disney+",         icon: "simple-icons:disneyplus", color: "#113CCF", appId: "com.disney.disneyplus" },
  { name: "Apple TV+",       icon: "simple-icons:appletv",    color: "#000000", appId: "com.apple.tv" },
  { name: "Spotify",         icon: "simple-icons:spotify",    color: "#1DB954", appId: "com.spotify.tv" },
  { name: "Plex",            icon: "simple-icons:plex",       color: "#E5A00D", appId: "com.plexapp.android" },
  { name: "CBC Gem",         icon: "mdi:television-play",     color: "#E5001A", appId: "ca.cbc.cbcgem" },
  { name: "Crave",           icon: "mdi:television-play",     color: "#0072CE", appId: "ca.bellmedia.crave" },
];

export function getAppIcon(appName: string | undefined): { icon: string; color: string } | null {
  if (!appName) return null;
  const lower = appName.toLowerCase();
  const found = APP_DEFINITIONS.find((a) => lower.includes(a.name.toLowerCase()));
  if (found) return { icon: found.icon, color: found.color };
  return null;
}

// ── Fire TV / Android TV adapter ──────────────────────────────────────────

const FIRE_TV_KEYS: Record<RemoteAction, string> = {
  up: "DPAD_UP", down: "DPAD_DOWN", left: "DPAD_LEFT", right: "DPAD_RIGHT",
  select: "DPAD_CENTER", ok: "DPAD_CENTER", back: "BACK", home: "HOME", menu: "MENU",
  play_pause: "MEDIA_PLAY_PAUSE", rewind: "MEDIA_REWIND",
  fast_forward: "MEDIA_FAST_FORWARD", previous: "MEDIA_PREVIOUS",
  next: "MEDIA_NEXT",
};

const fireTvAdapter: TvAdapter = {
  platform: "fire_tv",
  supportedActions: new Set(Object.keys(FIRE_TV_KEYS) as RemoteAction[]),
  getCurrentApp(entities, _remote, mediaPlayerId) {
    const appId = entities[mediaPlayerId]?.attributes?.app_id as string | undefined;
    if (!appId) return undefined;
    return APP_DEFINITIONS.find((a) => a.appId === appId);
  },
  keyCode(action) { return FIRE_TV_KEYS[action] ?? action; },
  launchApp(app, mediaPlayerId) {
    return {
      domain: "media_player",
      service: "select_source",
      data: { source: app.appId ?? app.name },
      target: { entity_id: mediaPlayerId },
    };
  },
};

// ── Android TV adapter (same keys) ───────────────────────────────────────

const androidTvAdapter: TvAdapter = { ...fireTvAdapter, platform: "androidtv" };

// ── Roku adapter ──────────────────────────────────────────────────────────

const ROKU_KEYS: Record<RemoteAction, string> = {
  up: "Up", down: "Down", left: "Left", right: "Right",
  select: "Select", ok: "Select", back: "Back", home: "Home", menu: "Info",
  play_pause: "Play", rewind: "Rev", fast_forward: "Fwd",
  previous: "InstantReplay", next: "Fwd",
};

const rokuAdapter: TvAdapter = {
  platform: "roku",
  supportedActions: new Set(Object.keys(ROKU_KEYS) as RemoteAction[]),
  getCurrentApp(entities, _remote, mediaPlayerId) {
    const appName = entities[mediaPlayerId]?.attributes?.app_name as string | undefined;
    if (!appName) return undefined;
    return APP_DEFINITIONS.find(
      (a) => appName.toLowerCase().includes(a.name.toLowerCase()),
    );
  },
  keyCode(action) { return ROKU_KEYS[action] ?? action; },
  launchApp(app, mediaPlayerId) {
    return {
      domain: "media_player",
      service: "select_source",
      data: { source: app.name },
      target: { entity_id: mediaPlayerId },
    };
  },
};

// ── Apple TV adapter ──────────────────────────────────────────────────────

const APPLE_TV_KEYS: Record<RemoteAction, string> = {
  up: "up", down: "down", left: "left", right: "right",
  select: "select", ok: "select", back: "menu", home: "home", menu: "top_menu",
  play_pause: "play_pause", rewind: "skip_backward",
  fast_forward: "skip_forward", previous: "previous",
  next: "next",
};

const appleTvAdapter: TvAdapter = {
  platform: "apple_tv",
  supportedActions: new Set(Object.keys(APPLE_TV_KEYS) as RemoteAction[]),
  getCurrentApp(entities, remoteEntity) {
    const appName = entities[remoteEntity]?.attributes?.app as string | undefined;
    if (!appName) return undefined;
    return APP_DEFINITIONS.find(
      (a) => appName.toLowerCase().includes(a.name.toLowerCase()),
    );
  },
  keyCode(action) { return APPLE_TV_KEYS[action] ?? action; },
  launchApp(app, _mediaPlayerId) {
    return {
      domain: "media_player",
      service: "select_source",
      data: { source: app.name },
      target: { entity_id: _mediaPlayerId },
    };
  },
};

// ── Adapter registry ──────────────────────────────────────────────────────

const ADAPTERS: Record<string, TvAdapter> = {
  fire_tv: fireTvAdapter,
  androidtv: androidTvAdapter,
  roku: rokuAdapter,
  apple_tv: appleTvAdapter,
};

/** Load the adapter for a given platform. Returns null if unsupported. */
export async function getAdapter(platform: string): Promise<TvAdapter | null> {
  return ADAPTERS[platform] ?? null;
}
