// lib/useSliderControl.ts — pointer-event slider with optimistic commit

import { useRef, useState, useCallback } from "react";
import type React from "react";
import type { ControlGroup } from "./useControlGroup";
import type { Phase } from "./useControlCommit";

export interface SliderControlOptions {
  min?: number;
  max?: number;
  step?: number;
  debounceMs?: number;
  isEqual?: (a: number, b: number) => boolean;
  group?: ControlGroup;
}

export interface SliderControlReturn {
  /** Current display value (number in [min, max]) */
  displayValue: number;
  /** Current position as ratio 0–1 */
  ratio: number;
  phase: Phase;
  /** True while the user is actively dragging */
  dragging: boolean;
  /** Attach to the container element for pointer-event tracking */
  containerRef: React.RefObject<HTMLDivElement | null>;
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function snap(v: number, step: number) {
  return Math.round(v / step) * step;
}

export function useSliderControl(
  initialValue: number,
  onCommit: (value: number) => void,
  options: SliderControlOptions = {},
): SliderControlReturn {
  const { min = 0, max = 100, step = 1, debounceMs = 150 } = options;

  const range = max - min || 1;
  const toRatio = (v: number) => clamp((v - min) / range, 0, 1);
  const fromRatio = (r: number) => clamp(snap(min + r * range, step), min, max);

  const [displayValue, setDisplayValue] = useState(initialValue);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");

  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(initialValue);
  const inflightRef = useRef(false);

  // Sync when external value changes (not during drag)
  const prevExternal = useRef(initialValue);
  if (prevExternal.current !== initialValue && !dragging && phase === "idle") {
    prevExternal.current = initialValue;
    setDisplayValue(initialValue);
  }

  const scheduleCommit = useCallback(
    (value: number) => {
      pendingRef.current = value;
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase("debouncing");
      timerRef.current = setTimeout(async () => {
        timerRef.current = null;
        if (inflightRef.current) return;
        inflightRef.current = true;
        setPhase("inflight");
        try { onCommit(pendingRef.current); } finally {
          inflightRef.current = false;
          setPhase("idle");
        }
      }, debounceMs);
    },
    [onCommit, debounceMs],
  );

  const calcValue = useCallback(
    (clientX: number): number => {
      const el = containerRef.current;
      if (!el) return displayValue;
      const rect = el.getBoundingClientRect();
      const r = clamp((clientX - rect.left) / rect.width, 0, 1);
      return fromRatio(r);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [min, max, step, displayValue],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(true);
      const v = calcValue(e.clientX);
      setDisplayValue(v);
      scheduleCommit(v);
    },
    [calcValue, scheduleCommit],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.buttons === 0) return;
      const v = calcValue(e.clientX);
      setDisplayValue(v);
      scheduleCommit(v);
    },
    [calcValue, scheduleCommit],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      setDragging(false);
      const v = calcValue(e.clientX);
      setDisplayValue(v);
      scheduleCommit(v);
    },
    [calcValue, scheduleCommit],
  );

  const onPointerCancel = useCallback(() => {
    setDragging(false);
  }, []);

  return {
    displayValue,
    ratio: toRatio(displayValue),
    phase,
    dragging,
    containerRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
}
