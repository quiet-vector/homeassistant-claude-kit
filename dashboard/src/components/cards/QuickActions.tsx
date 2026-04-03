import { useHass } from "@hakit/core";
import type { HassEntities } from "home-assistant-js-websocket";
import { Icon } from "@iconify/react";
import { ModeButton } from "../controls/ModeButton";
import type { QuickActionsConfig } from "../../lib/entities";

interface QuickActionsProps {
  config: QuickActionsConfig;
}

export function QuickActions({ config }: QuickActionsProps) {
  const entities = useHass((s) => s.entities) as HassEntities;
  const timeOfDay = entities[config.timeOfDay]?.state ?? "day";
  const presenceState = entities[config.presenceState]?.state ?? "Unknown";

  const isEvening = timeOfDay === "evening" || timeOfDay === "night";
  const projector = entities[config.projector];
  const projectorAvailable = projector && projector.state !== "unavailable";

  const isAway = presenceState === "Away";
  const presenceColor = isAway
    ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
    : "bg-bg-card text-text-secondary";

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none">
      {isEvening && (
        <ModeButton
          entityId={config.nightMode}
          label="Night"
          icon="mdi:weather-night"
          activeColor="bg-indigo-600"
        />
      )}
      {projectorAvailable && (
        <ModeButton
          entityId={config.projector}
          label="Projector"
          icon="mdi:projector"
          activeColor="bg-purple-600"
        />
      )}
      <div className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium ${presenceColor}`}>
        <Icon icon={isAway ? "mdi:home-export-outline" : "mdi:home"} width={16} />
        {presenceState}
      </div>
    </div>
  );
}
