#!/usr/bin/env python3
"""Home Assistant silent-failure health check.

Catches the class of problem that does not raise an error anywhere: a config
file referencing an entity that does not exist, a phone whose companion app
stopped reporting months ago, an entity frozen since the last restart.

Three checks:
  1. broken references -- entity IDs referenced in config (recursively, plus
     node-red/flows.json) that are not present on the instance
  2. dead mobile_app registrations -- a registered phone whose entities have
     all gone unavailable
  3. stale entities -- unavailable/unknown for longer than the threshold

Read-only: it never calls a service or mutates state unless --notify is passed.
"""

import argparse
import json
import os
import re
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Set, Tuple

import requests

# Entity IDs used as placeholders in templates, not real references.
PLACEHOLDER_RE = re.compile(r"^[a-z_]+\.(your|example|my)_")

# Directories whose YAML is not real config for this instance.
# zigbee2mqtt/configuration.yaml uses z2m's own schema, where e.g.
# "light.primary_bdrm" is a friendly-name mapping, not an HA entity.
SKIP_DIRS = {
    "blueprints",
    ".storage",
    "deps",
    "tts",
    "www",
    "custom_components",
    "zigbee2mqtt",
}

SKIP_FILES = {"secrets.yaml"}

# Node-RED node fields that actually hold entity IDs. Everything else --
# notably `func` bodies -- is code, where `update.person` and `text.trim`
# are property access and string methods, not entity references.
NR_ENTITY_KEYS = {"entity", "entityId", "entity_id"}


def load_env_file() -> None:
    """Load environment variables from .env file."""
    env_file = Path(".env")
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip().strip('"').strip("'")


def api_get(path: str) -> object:
    """GET a Home Assistant API endpoint and return decoded JSON."""
    ha_url = os.getenv("HA_URL", "http://homeassistant.local:8123")
    token = os.getenv("HA_TOKEN", "")
    resp = requests.get(
        f"{ha_url}/api/{path}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def load_service_names() -> Set[str]:
    """Every `domain.service` the instance exposes.

    Needed because a service call is spelled exactly like an entity ID.
    Without this, `light.turn_on`, `tts.speak` and `notify.household` all
    look like missing entities.
    """
    try:
        raw = api_get("services")
    except requests.RequestException:
        return set()
    names = set()
    for entry in raw:
        domain = entry.get("domain", "")
        for service in entry.get("services", {}):
            names.add(f"{domain}.{service}")
    return names


def _walk_node_red(node: object, sink: Set[str]) -> None:
    """Collect entity IDs from entity-bearing Node-RED fields only."""
    if isinstance(node, dict):
        for key, value in node.items():
            if key in NR_ENTITY_KEYS:
                if isinstance(value, str):
                    sink.add(value)
                elif isinstance(value, list):
                    sink.update(v for v in value if isinstance(v, str))
            elif key == "data" and isinstance(value, str):
                # service-call payloads are JSON embedded in a string
                try:
                    _walk_node_red(json.loads(value), sink)
                except (json.JSONDecodeError, TypeError):
                    pass
            else:
                _walk_node_red(value, sink)
    elif isinstance(node, list):
        for item in node:
            _walk_node_red(item, sink)


def collect_referenced_entities(config_dir: Path, domains: Set[str]) -> Dict[str, Set[Path]]:
    """Find every entity ID referenced in config, mapped to the files using it.

    Walks recursively (unlike reference_validator, which only globs the top
    level), so packages/ is covered. Node-RED flows are parsed as JSON rather
    than scanned as text, so code in `func` bodies is not mistaken for
    entity references.
    """
    pattern = re.compile(r"\b(" + "|".join(sorted(domains)) + r")\.[a-z0-9_]+\b")
    found: Dict[str, Set[Path]] = {}

    def record(entity_id: str, path: Path) -> None:
        if PLACEHOLDER_RE.match(entity_id):
            return
        if entity_id.split(".", 1)[0] not in domains:
            return
        found.setdefault(entity_id, set()).add(path)

    for path in sorted(config_dir.rglob("*")):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.name in SKIP_FILES:
            continue

        if path.name == "flows.json":
            try:
                flows = json.loads(path.read_text(encoding="utf-8", errors="ignore"))
            except (OSError, json.JSONDecodeError):
                continue
            sink: Set[str] = set()
            _walk_node_red(flows, sink)
            for entity_id in sink:
                record(entity_id, path)
            continue

        if path.suffix not in {".yaml", ".yml"}:
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for match in pattern.finditer(text):
            record(match.group(0), path)

    return found


def load_registry_ids(config_dir: Path) -> Set[str]:
    """Entity IDs known to the registry snapshot, including disabled ones."""
    registry = config_dir / ".storage" / "core.entity_registry"
    if not registry.exists():
        return set()
    try:
        data = json.loads(registry.read_text())
    except (OSError, json.JSONDecodeError):
        return set()
    entities = data.get("data", {}).get("entities", [])
    return {e["entity_id"] for e in entities if "entity_id" in e}


def load_mobile_app_devices(config_dir: Path) -> List[Tuple[str, List[str]]]:
    """Return (device_name, entity_ids) for each mobile_app device."""
    dev_path = config_dir / ".storage" / "core.device_registry"
    ent_path = config_dir / ".storage" / "core.entity_registry"
    if not (dev_path.exists() and ent_path.exists()):
        return []
    try:
        devices = json.loads(dev_path.read_text())["data"]["devices"]
        entities = json.loads(ent_path.read_text())["data"]["entities"]
    except (OSError, KeyError, json.JSONDecodeError):
        return []

    by_device: Dict[str, List[str]] = {}
    for ent in entities:
        if ent.get("platform") == "mobile_app" and ent.get("device_id"):
            by_device.setdefault(ent["device_id"], []).append(ent["entity_id"])

    result = []
    for dev in devices:
        if dev["id"] not in by_device:
            continue
        name = dev.get("name_by_user") or dev.get("name") or dev["id"]
        result.append((name, by_device[dev["id"]]))
    return result


def check_broken_references(
    states: Dict[str, dict], config_dir: Path, services: Set[str]
) -> List[str]:
    """Entity IDs referenced in config that do not exist on the instance."""
    domains = {eid.split(".", 1)[0] for eid in states}
    referenced = collect_referenced_entities(config_dir, domains)
    registry_ids = load_registry_ids(config_dir)

    problems = []
    for entity_id in sorted(referenced):
        if entity_id in states or entity_id in services:
            continue
        where = ", ".join(sorted(str(p.relative_to(config_dir)) for p in referenced[entity_id]))
        if entity_id in registry_ids:
            problems.append(f"  ⚠️  {entity_id} -- registered but not loaded (disabled?)  [{where}]")
        else:
            problems.append(f"  ❌ {entity_id} -- does not exist  [{where}]")
    return problems


def _parse_ts(raw: str) -> datetime:
    return datetime.fromisoformat(raw)


def detect_last_restart(states: Dict[str, dict]) -> Tuple[datetime, int]:
    """Infer the last HA start from the timestamp entities were restored at.

    On start, HA stamps every entity it cannot yet reach with the same
    last_updated. That cluster is a reliable marker, and it is what makes a
    dead-but-cached integration distinguishable from a live one.
    """
    counts: Counter = Counter()
    for state in states.values():
        raw = state.get("last_updated")
        if not raw:
            continue
        try:
            counts[_parse_ts(raw).replace(microsecond=0)] += 1
        except ValueError:
            continue
    if not counts:
        return (datetime.now(timezone.utc), 0)
    when, count = counts.most_common(1)[0]
    return (when, count)


def check_dead_phones(
    states: Dict[str, dict], config_dir: Path, restart: datetime
) -> List[str]:
    """mobile_app devices that have not reported since the last restart.

    Checking for `unavailable` alone is not enough: a phone whose companion
    app has stopped still shows its last cached battery level, so it looks
    healthy. What gives it away is that nothing has updated since boot.
    """
    cutoff = restart + timedelta(minutes=2)
    problems = []
    for name, entity_ids in sorted(load_mobile_app_devices(config_dir)):
        # Only entities the phone itself pushes prove it is alive. A
        # notify entity's state is the last time HA *attempted* a send,
        # which keeps advancing against a phone that never receives it.
        live = [
            e
            for e in entity_ids
            if e in states and e.split(".", 1)[0] in ("sensor", "binary_sensor", "device_tracker")
        ]
        if not live:
            continue
        newest = None
        for entity_id in live:
            raw = states[entity_id].get("last_updated")
            if not raw:
                continue
            try:
                ts = _parse_ts(raw)
            except ValueError:
                continue
            if newest is None or ts > newest:
                newest = ts
        if newest is None or newest <= cutoff:
            seen = f"{newest:%Y-%m-%d %H:%M} UTC" if newest else "never"
            problems.append(
                f"  ❌ {name} -- nothing reported since the last restart "
                f"(newest update {seen}); companion app is not running"
            )
    return problems


def check_stale_entities(
    states: Dict[str, dict], stale_hours: int, include_unknown: bool
) -> List[str]:
    """Entities stuck `unavailable` for longer than the threshold.

    Only `unavailable` counts by default. `unknown` is the normal resting
    state for input_button, scene and friends -- treating it as a fault
    buries the real signal under hundreds of healthy entities.
    """
    bad_states = {"unavailable", "unknown"} if include_unknown else {"unavailable"}
    cutoff = datetime.now(timezone.utc) - timedelta(hours=stale_hours)
    stale = []

    for entity_id, state in states.items():
        if state["state"] not in bad_states:
            continue
        raw = state.get("last_changed") or state.get("last_updated")
        if not raw:
            continue
        try:
            changed = _parse_ts(raw)
        except ValueError:
            continue
        if changed < cutoff:
            stale.append((changed, entity_id))

    stale.sort()
    return [f"  ⚠️  {eid} -- since {ts:%Y-%m-%d %H:%M} UTC" for ts, eid in stale]


def send_notification(summary: str) -> None:
    """Push the summary through notify.household."""
    ha_url = os.getenv("HA_URL", "")
    token = os.getenv("HA_TOKEN", "")
    requests.post(
        f"{ha_url}/api/services/notify/household",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"title": "HA health check", "message": summary},
        timeout=30,
    ).raise_for_status()


def main() -> int:
    parser = argparse.ArgumentParser(description="Home Assistant silent-failure health check")
    parser.add_argument(
        "--stale-hours",
        type=int,
        default=int(os.getenv("HEALTH_STALE_HOURS", "24")),
        help="flag unavailable/unknown entities older than this (default: 24)",
    )
    parser.add_argument("--config-dir", type=Path, default=Path("config"))
    parser.add_argument(
        "--include-unknown",
        action="store_true",
        help="also flag `unknown` entities (noisy: normal for input_button, scene, …)",
    )
    parser.add_argument(
        "--notify",
        action="store_true",
        help="also push a summary through notify.household (sends a real push)",
    )
    args = parser.parse_args()

    load_env_file()
    if not os.getenv("HA_TOKEN"):
        print("❌ HA_TOKEN not found in environment or .env file")
        return 2

    try:
        raw_states = api_get("states")
    except requests.RequestException as exc:
        print(f"❌ Could not reach Home Assistant: {exc}")
        return 2

    states = {s["entity_id"]: s for s in raw_states}
    restart, restored = detect_last_restart(states)
    print(f"🔎 Checked {len(states)} entities on the live instance")
    print(f"   Last restart inferred as {restart:%Y-%m-%d %H:%M} UTC ({restored} entities restored)\n")

    sections = []

    services = load_service_names()
    broken = check_broken_references(states, args.config_dir, services)
    errors = [line for line in broken if line.lstrip().startswith("❌")]
    print("📄 Config references")
    print("\n".join(broken) if broken else "  ✅ every referenced entity exists")
    if errors:
        sections.append(f"{len(errors)} broken entity reference(s)")
    print()

    dead = check_dead_phones(states, args.config_dir, restart)
    print("📱 mobile_app registrations")
    print("\n".join(dead) if dead else "  ✅ all registered phones are reporting")
    if dead:
        sections.append(f"{len(dead)} dead phone registration(s)")
    print()

    stale = check_stale_entities(states, args.stale_hours, args.include_unknown)
    print(f"🕰  Entities unavailable > {args.stale_hours}h")
    if stale:
        for line in stale[:25]:
            print(line)
        if len(stale) > 25:
            print(f"  … and {len(stale) - 25} more")
        sections.append(f"{len(stale)} unavailable entities")
    else:
        print("  ✅ nothing stuck unavailable")
    print()

    if sections:
        summary = "; ".join(sections)
        print(f"⚠️  Health check found: {summary}")
        if args.notify:
            send_notification(summary)
            print("📨 Summary sent to notify.household")
        return 1

    print("✅ All health checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
