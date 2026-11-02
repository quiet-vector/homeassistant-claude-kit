// lib/snapshot-utils.ts — snapshot helper utilities

import type { HassEntities } from "home-assistant-js-websocket";

/**
 * Get the last time a person/event was detected by a binary sensor.
 * Returns the last_changed time if the sensor is currently on, or the
 * most recent on→off transition time.
 */
export function getLastPersonTime(
  entities: HassEntities,
  personSensorId: string | undefined,
): Date | null {
  if (!personSensorId) return null;
  const entity = entities[personSensorId];
  if (!entity) return null;
  const changed = entity.last_changed;
  if (!changed) return null;
  return new Date(changed);
}
