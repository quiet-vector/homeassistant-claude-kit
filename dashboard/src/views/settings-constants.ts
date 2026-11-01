import {
  TIMEOUT_MOTION_NORMAL,
  TIMEOUT_MOTION_NORMAL_LONG,
  TIMEOUT_MOTION_NIGHT,
  TIMEOUT_MOTION_NIGHT_SHORT,
  TIMEOUT_MOTION_MOVIE,
  TRANSITION_ON,
  TRANSITION_OFF,
} from "../lib/entities";
import type { NumberConfig, BooleanConfig, SettingConfig } from "../lib/settings-types";
export type { NumberConfig, BooleanConfig, SettingConfig };

// ── Lighting ─────────────────────────────────────────────────────────
//
// Motion timeouts and transitions are generic — every HA motion-light setup needs
// these. Populate the entity IDs in lib/entities.ts during setup.

export const MOTION_TIMEOUTS: NumberConfig[] = [
  { kind: "number", entity: TIMEOUT_MOTION_NORMAL, label: "Normal", unit: "s", min: 30, max: 600, step: 10,
    help: "Time after last motion before lights turn off during the day." },
  { kind: "number", entity: TIMEOUT_MOTION_NORMAL_LONG, label: "Normal Long", unit: "s", min: 60, max: 600, step: 10,
    help: "Extended daytime timeout for rooms where brief absences are common (e.g. dressing room)." },
  { kind: "number", entity: TIMEOUT_MOTION_NIGHT, label: "Night", unit: "s", min: 5, max: 120, step: 5,
    help: "Time after last motion before lights turn off during night mode." },
  { kind: "number", entity: TIMEOUT_MOTION_NIGHT_SHORT, label: "Night Short", unit: "s", min: 5, max: 60, step: 5,
    help: "Very short night timeout for quick-pass areas like stairs and hallways." },
  { kind: "number", entity: TIMEOUT_MOTION_MOVIE, label: "Movie", unit: "s", min: 5, max: 120, step: 5,
    help: "Motion timeout during movie/ambient mode." },
];

export const TRANSITIONS: NumberConfig[] = [
  { kind: "number", entity: TRANSITION_ON, label: "Turn On", unit: "s", min: 0, max: 10, step: 0.5,
    help: "Fade-in duration when lights turn on." },
  { kind: "number", entity: TRANSITION_OFF, label: "Turn Off", unit: "s", min: 0, max: 10, step: 0.5,
    help: "Fade-out duration when lights turn off." },
];

// ── Add your own sections below ───────────────────────────────────────
//
// The setup-customize skill will add entries here as you describe your setup.
// You can also add them manually following the pattern above.
//
// Example — climate settings:
// import { HYSTERESIS_HEAT_ON, ECO_TEMPERATURE } from "../lib/entities";
// export const CLIMATE_SETTINGS: SettingConfig[] = [
//   { kind: "number", entity: HYSTERESIS_HEAT_ON, label: "Heat ON Below Target", unit: "°C", min: 0.1, max: 1.5, step: 0.1,
//     help: "How far below target the room must drop before heating activates." },
//   { kind: "number", entity: ECO_TEMPERATURE, label: "Eco Setback", unit: "°C", min: 10, max: 20, step: 0.5,
//     help: "Temperature during eco/away periods." },
// ];
//
// Example — automation toggles:
// import { WORK_MODE_AUTO } from "../lib/entities";
// export const AUTOMATION_TOGGLES: BooleanConfig[] = [
//   { kind: "boolean", entity: WORK_MODE_AUTO, label: "Auto Work Mode",
//     description: "Activate work mode on presence",
//     help: "Automatically enables work lighting when desk occupancy sensor detects presence." },
// ];

// ── Health check ──────────────────────────────────────────────────────
//
// Backing helpers are defined in config/packages/health_check.yaml. These are
// written as literal entity IDs rather than lib/entities.ts constants because
// the package creates them directly, so they are not setup-customize
// placeholders that need populating.
//
// The run time (input_datetime.health_check_time) is not listed here:
// SettingConfig only models numbers and booleans, and adding a time row would
// mean a new control component. Adjust it in Home Assistant for now.

export const HEALTH_CHECK_TOGGLES: BooleanConfig[] = [
  { kind: "boolean", entity: "input_boolean.health_check_enabled", label: "Daily Health Scan",
    description: "Check for dead phones and stuck entities",
    help: "Runs once a day and sends a push only when something is wrong: a phone whose companion app has stopped reporting, or entities stuck unavailable. Silent when healthy." },
];

export const HEALTH_CHECK_NUMBERS: NumberConfig[] = [
  { kind: "number", entity: "input_number.health_stale_hours", label: "Stale Threshold", unit: "h", min: 6, max: 168, step: 1,
    help: "How long a phone must go without reporting, or an entity stay unavailable, before the scan flags it. Lower catches problems sooner but is noisier around reboots and brief outages." },
];

// ── Litter robot ──────────────────────────────────────────────────────
//
// Backing helpers are defined in config/packages/litter_robot.yaml. Literal
// entity IDs for the same reason as the health check block above: the package
// creates them directly, so they are not setup-customize placeholders.

export const LITTER_ROBOT_NUMBERS: NumberConfig[] = [
  { kind: "number", entity: "input_number.litter_drawer_threshold_pct", label: "Drawer Alert At", unit: "%", min: 50, max: 100, step: 5,
    help: "Waste-drawer fill level that triggers the full alert. The robot's own drawer-full status also triggers it regardless of this value, so this only controls how much advance warning you get." },
  { kind: "number", entity: "input_number.litter_drawer_reminder_minutes", label: "Reminder Every", unit: "min", min: 15, max: 720, step: 15,
    help: "How often the drawer-full alert repeats while the drawer stays full. Reminders pause during quiet hours and stop as soon as the drawer is emptied." },
];
