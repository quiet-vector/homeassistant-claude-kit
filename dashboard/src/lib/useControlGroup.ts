// lib/useControlGroup.ts — shared commit coordination for multiple controls

import { useRef } from "react";

/**
 * Opaque handle for grouping multiple controls on the same entity.
 * Controls in the same group share commit state, preventing race conditions
 * when e.g. brightness and color temperature are both being adjusted.
 */
export interface ControlGroup {
  _id: symbol;
}

export function useControlGroup(): ControlGroup {
  const ref = useRef<ControlGroup>({ _id: Symbol("control-group") });
  return ref.current;
}
