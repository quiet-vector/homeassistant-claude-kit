// lib/useControlCommit.ts — optimistic UI control state machine

import { useRef, useState, useCallback } from "react";
import type { ControlGroup } from "./useControlGroup";

export type Phase = "idle" | "debouncing" | "inflight" | "correction";

export interface ControlCommitOptions<T> {
  debounceMs?: number;
  isEqual?: (a: T, b: T) => boolean;
  group?: ControlGroup;
}

export interface ControlCommitReturn<T> {
  displayValue: T;
  set: (value: T) => void;
  commit: () => void;
  phase: Phase;
}

/**
 * Manages optimistic UI state for a control that sends HA service calls.
 *
 * Pattern:
 * 1. User interacts → set(value) → displayValue updates immediately
 * 2. After debounceMs with no new interaction → commit (onCommit called)
 * 3. While awaiting HA response → phase = "inflight"
 * 4. If HA comes back different → phase = "correction" (briefly), then snaps
 */
export function useControlCommit<T>(
  initialValue: T,
  onCommit: (value: T) => void | Promise<void>,
  options: ControlCommitOptions<T> = {},
): ControlCommitReturn<T> {
  const { debounceMs = 300, isEqual = (a, b) => a === b } = options;

  const [displayValue, setDisplayValue] = useState<T>(initialValue);
  const [phase, setPhase] = useState<Phase>("idle");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<T>(initialValue);
  const inflightRef = useRef(false);

  const set = useCallback((value: T) => {
    pendingRef.current = value;
    setDisplayValue(value);
    setPhase("debouncing");

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      if (inflightRef.current) return;
      inflightRef.current = true;
      setPhase("inflight");
      try {
        await onCommit(pendingRef.current);
      } finally {
        inflightRef.current = false;
        setPhase("idle");
      }
    }, debounceMs);
  }, [onCommit, debounceMs]);

  const commit = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (inflightRef.current) return;
    inflightRef.current = true;
    setPhase("inflight");
    try {
      await onCommit(pendingRef.current);
    } finally {
      inflightRef.current = false;
      setPhase("idle");
    }
  }, [onCommit]);

  // Sync displayValue when initialValue changes externally (not during interaction)
  const prevInitial = useRef(initialValue);
  if (!isEqual(prevInitial.current, initialValue) && phase === "idle") {
    prevInitial.current = initialValue;
    if (!isEqual(displayValue, initialValue)) {
      setDisplayValue(initialValue);
    }
  }

  return { displayValue, set, commit, phase };
}
