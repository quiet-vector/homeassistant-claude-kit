// lib/camera-utils.ts — camera image URL helpers

import type { HassEntities } from "home-assistant-js-websocket";

type HassEntity = HassEntities[string];

/** Build an accessible image URL from an entity's entity_picture attribute */
export function buildImageUrl(entity: HassEntity | undefined): string | null {
  if (!entity) return null;
  const pic = entity.attributes?.entity_picture as string | undefined;
  if (!pic) return null;
  // entity_picture is either absolute or relative to the HA instance
  if (pic.startsWith("http")) return pic;
  return pic; // relative — browser resolves against HA base URL
}
