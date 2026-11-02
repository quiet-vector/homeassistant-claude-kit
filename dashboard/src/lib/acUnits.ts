// lib/acUnits.ts — AC unit configuration
// Add your AC/heat pump climate entities here.

export interface AcConfig {
  id: string;
  /** Display name shown in popup header */
  label: string;
  /** Optional subtitle (e.g. room or zone name) */
  sublabel?: string;
  /** climate entity ID */
  entity: string;
  icon?: string;
  /** input_boolean for manual/solar override */
  manualEntity: string;
  /** timer.* entity for sleep/manual timer */
  timerEntity: string;
  /** Allowed fan modes (from climate entity attributes) */
  fanModes: string[];
  /** Allowed swing modes (from climate entity attributes) */
  swingModes: string[];
}

// Empty by default — populate when you have AC/heat pump climate entities.
// Example:
// export const AC_UNITS: AcConfig[] = [
//   {
//     id: "living_room_ac",
//     label: "Living Room AC",
//     sublabel: "Main floor",
//     entity: "climate.living_room_ac",
//     manualEntity: "input_boolean.living_room_ac_manual",
//     timerEntity: "timer.living_room_ac",
//     fanModes: ["auto", "low", "medium", "high"],
//     swingModes: ["off", "auto"],
//   },
// ];
export const AC_UNITS: AcConfig[] = [];
