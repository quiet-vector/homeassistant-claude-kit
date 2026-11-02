// lib/useEntityState.ts — subscribe to a single entity's state string

import { useHass } from "@hakit/core";
import type { HassEntities } from "home-assistant-js-websocket";

export type EntityStateReturn = string | undefined;

/**
 * Returns the current state string for an entity, or undefined if not found.
 * Re-renders when the entity state changes.
 */
export function useEntityState(entityId: string): EntityStateReturn {
  const entities = useHass((s) => s.entities) as HassEntities;
  return entities[entityId]?.state;
}
