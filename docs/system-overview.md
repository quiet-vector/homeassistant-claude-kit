# System Overview

> **Instructions:** Fill in each section to describe your actual Home Assistant setup.
> This file tells Claude what hardware, integrations, and entity IDs you have.
> The more detail here, the fewer guesses Claude makes.
> After the setup interview, this file will be populated for you. You can then keep it updated as your setup evolves.

## Home Layout

<!-- Describe your home: floor plan, rooms, which rooms have which sensors/devices -->

- Floors: _
- Rooms: _
- Areas configured in HA: _

## Integrations

<!-- List every integration you've installed and what it controls -->

| Integration | What it controls | Key entities |
|-------------|-----------------|--------------|
| _           | _               | _            |

## Climate System

<!-- Describe your heating/cooling setup -->

- Heating type: (boiler / heat pump / electric / other)
- Zones: _
- TRVs: _
- Thermostat entity: _
- Temperature sensors per room: _

## Lighting

<!-- Describe your lighting setup -->

- Bulb type: (Zigbee / Z-Wave / WiFi / Hue)
- Adaptive Lighting zones: _
- Motion sensors: _
- Scenes used: _

## Energy / Solar

- Whole-home energy monitor: Shelly Pro 3EM (split-phase North American panel; Phase A = L1, Phase C = L2, Phase B unused)
- Integration: native Shelly integration
- Source energy sensor: `sensor.shellypro3em_841fe8904ea0_energy` (lifetime kWh)
- Current power: `sensor.shellypro3em_841fe8904ea0_power` (W)
- Utility meters (package `config/packages/energy_tracking.yaml`):
  - `sensor.shelly_daily_energy` — resets midnight
  - `sensor.shelly_monthly_energy` — resets 1st of month
  - `sensor.shelly_billing_cycle_energy` — resets ~19th (offset: 18 days), next reset July 19
- Cost sensors: `sensor.home_daily_energy_cost`, `sensor.home_monthly_energy_cost`, `sensor.home_billing_cycle_energy_cost`
  - Billing cycle cost includes `input_number.ns_power_service_fee` ($20.08/month fixed charge)
- Rate: `input_number.ns_power_energy_rate` = 0.19128 CAD/kWh (effective 2026-05-01, NS Power)
- Service fee: `input_number.ns_power_service_fee` = 20.08 CAD/month

## Security / Cameras

<!-- Only fill in if you have cameras -->

- Camera integration: _
- Cameras: _
- Notification service: _

## Media

<!-- TVs, speakers, projectors -->

- Media players: _
- Remote entities: _

### Google Cast requires HA to be on the IoT VLAN

Cast devices live on **FLiP-IoT (VLAN 107)** while HA is on **FLiP-Control (VLAN
60)**. As of a Google firmware rollout on **2026-10-31**, Cast devices refuse to
serve their local API to clients on another subnet: the TCP connection to 8008 /
8009 is accepted, then no data flows and pychromecast reports
`_ssl.c:1064: The handshake operation timed out`. mDNS discovery still works, so
the devices appear in HA but every one of them sits at `unavailable`.

Rather than move the speakers out of IoT isolation, **HA is multi-homed onto VLAN
107** so Cast traffic is sourced on-subnet:

```
ha network vlan end0 107 --ipv4-method auto --ipv4-route-metric 1000 --ipv6-method disabled
```

This created `end0.107` (DHCP, currently 192.168.107.17). Two details matter:

- **`--ipv4-route-metric 1000`** keeps the `end0` default route (metric 100)
  primary. Without it the IoT VLAN's gateway could take over egress.
- **DHCP, not static** -- the FLiP-IoT pool spans `.2-.254`, so any static address
  could later be leased to another device.

VLAN 107 was already tagged on HA's switch port (USW Pro Max 16 PoE, port 2), so
no UniFi change was needed. Because Cast now runs on-subnet, it bypasses the
Internal -> IoT firewall rules entirely, and `IOT_GOOGLE_SPEAKERS` group
membership no longer affects it.

> Note: HA OS has no `nmcli` and `ha network` has no delete subcommand. To remove
> a VLAN interface, use the HA UI: Settings > System > Network.

## People / Presence

<!-- Person entities and tracking method -->

- People tracked: _
- Tracking method: (HA companion app / router / BLE)
- Person entities: _

## Notifications / Alerts

All personal push alerts go through a single legacy notify group defined in
`configuration.yaml`:

- `notify.household` → members: `mobile_app_phil_s_iphone_14_pro_max`,
  `mobile_app_kristines_iphone_14_pro_max`
- To add/remove a recipient for **every** alert at once, edit the `services:`
  list of that group. **A HA Core restart is required** — legacy notify groups
  load only at startup (there is no `notify.reload` service).

> **Do not "fix" the `_14_pro_max` in Kristine's service name.** Her phone is now an
> iPhone 18 (device renamed to "Kristine's iPhone 18", entities `kristines_iphone_18_*`),
> but the **legacy notify service name is derived from the config entry's stored
> `device_name`, not the device-registry name** — renaming the device does *not* rename
> the service. `mobile_app_kristines_iphone_14_pro_max` is the correct, live target for
> her iPhone 18. It can only be changed by renaming the device inside the companion app
> (App Configuration → Device Name) so it re-registers.

Consumers of `notify.household`:
- `config/automations.yaml` — Oven Left On, Fridge Door Left Open, Washer Done,
  Dryer Done.
- `config/packages/litter_robot.yaml` — Litter Drawer Full. Unlike the others
  this one **repeats** on `input_number.litter_drawer_reminder_minutes` until
  the drawer is emptied; see "Litter-Robot drawer alerts" below.
- `config/packages/health_check.yaml` — daily silent-failure scan.
- `config/node-red/flows.json` — security posture alerts (Push Critical /
  Warning / Clear). The Node-RED **add-on** (`a0d7b954_nodered`) must be
  restarted to pick up flow changes; a Core restart does not restart add-ons.

`notify.notify` (JARVIS night/exit-mode status messages) is intentionally left
on the default target, not the household group.

## Key Helpers Registry

<!-- Once the setup interview runs, this section will list all helpers created -->

### Input Booleans
<!-- e.g. input_boolean.night_mode — Night Mode -->
- `input_boolean.health_check_enabled` — Health Check Enabled

### Input Selects
<!-- e.g. input_select.climate_mode — Climate Mode (Winter/Summer/Off) -->

### Input Numbers
<!-- e.g. input_number.target_temperature — Target Temperature -->
- `input_number.litter_drawer_threshold_pct` — Litter Drawer Alert Threshold (%)
- `input_number.litter_drawer_reminder_minutes` — Litter Drawer Reminder Interval
- `input_number.health_stale_hours` — Health Check Stale Threshold (h)

### Input Datetimes
<!-- e.g. input_datetime.morning_work_day — Morning Wake Time (Work Day) -->

### Litter-Robot drawer alerts

`config/packages/litter_robot.yaml` follows the Washer Done / Dryer Done shape
(push via `notify.household`, TTS to `media_player.living_room_display` and
`media_player.family_room_wifi`, gated on `input_boolean.quiet_hours`) but
**repeats** until the drawer is emptied.

Two independent "full" signals, whichever fires first:

- `sensor.litter_robot_4_waste_drawer` crossing
  `input_number.litter_drawer_threshold_pct` — early warning, tunable
- `sensor.litter_robot_4_status_code` reporting `df1` / `df2` / `dfs` — the
  robot's own verdict (~2 cycles left / ~1 left / stopped). Catches the case
  where it refuses to cycle at an unexpected fill level.

Repetition is a `repeat … while` loop with a templated `delay`, rather than a
`time_pattern` trigger, because a time pattern cannot take its interval from a
helper. The `while` is re-evaluated each pass, so emptying the drawer or
entering quiet hours ends the reminders with no second automation.

Two triggers exist purely to re-arm that loop: `input_boolean.quiet_hours`
going `off` (the loop exits when quiet hours start) and `homeassistant` start
(a restart cancels any in-flight loop). `max_exceeded: silent` keeps triggers
that land while the loop is already running out of the log.

## Automation Design Decisions

<!-- Explain non-obvious automation design choices here.
     Example: "Bedroom motion light has a 30s stairs-motion guard to avoid
     sleep disturbance from bed movements." -->

## Known Issues / Workarounds

<!-- Document quirks specific to your hardware here.
     Example: "Dishwasher WiFi dies after cycle end (EU ecodesign) — state
     machine uses input_select that persists independently." -->

- **`make push` is unsafe in the current repo state.** It runs
  `rsync --delete`, but `.rsync-excludes-push` does not exclude `.env`,
  `claude-code-ha/`, `CLAUDE.md`, or the remote `esphome/.git`, so a full push
  would delete those from `/config` on HA. Until the exclude file is fixed,
  deploy individual changed files with a targeted `rsync` (no `--delete`)
  instead of `make push`.
