// lib/icons.ts — HA icon → Iconify format conversion

/**
 * Convert a Home Assistant icon string (e.g. "mdi:lightbulb") to Iconify format.
 * HA uses the same format as Iconify so this is mostly a passthrough,
 * with normalisation for legacy formats.
 */
export function haIconToIconify(haIcon: string): string {
  if (!haIcon) return "mdi:help-circle-outline";
  // Already in iconify format (contains colon)
  if (haIcon.includes(":")) return haIcon;
  // Legacy hass: prefix
  if (haIcon.startsWith("hass:")) return `mdi:${haIcon.slice(5)}`;
  return haIcon;
}
