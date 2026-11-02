// lib/useNumericControl.ts — increment/decrement numeric control with optimistic commit

import { useControlCommit } from "./useControlCommit";
import type { ControlGroup } from "./useControlGroup";
import type { Phase } from "./useControlCommit";

export interface NumericControlOptions {
  min?: number;
  max?: number;
  step?: number;
  debounceMs?: number;
  group?: ControlGroup;
}

export interface NumericControlReturn {
  displayValue: number;
  set: (value: number) => void;
  increment: () => void;
  decrement: () => void;
  commit: () => void;
  phase: Phase;
}

export function useNumericControl(
  initialValue: number,
  onCommit: (value: number) => void,
  options: NumericControlOptions = {},
): NumericControlReturn {
  const { min = -Infinity, max = Infinity, step = 1, debounceMs = 300 } = options;

  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  const { displayValue, set, commit, phase } = useControlCommit<number>(
    initialValue,
    onCommit,
    { debounceMs, group: options.group },
  );

  const increment = () => set(clamp(displayValue + step));
  const decrement = () => set(clamp(displayValue - step));

  return { displayValue, set: (v) => set(clamp(v)), increment, decrement, commit, phase };
}
