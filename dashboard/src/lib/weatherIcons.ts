// lib/weatherIcons.ts — HA weather condition → Iconify icon + label

const ICON_MAP: Record<string, { day: string; night: string; label: string }> = {
  "clear-night":       { day: "mdi:weather-night",           night: "mdi:weather-night",           label: "Clear night" },
  "cloudy":            { day: "mdi:weather-cloudy",           night: "mdi:weather-cloudy",           label: "Cloudy" },
  "exceptional":       { day: "mdi:weather-lightning",        night: "mdi:weather-lightning",        label: "Exceptional" },
  "fog":               { day: "mdi:weather-fog",              night: "mdi:weather-fog",              label: "Foggy" },
  "hail":              { day: "mdi:weather-hail",             night: "mdi:weather-hail",             label: "Hail" },
  "lightning":         { day: "mdi:weather-lightning",        night: "mdi:weather-lightning",        label: "Lightning" },
  "lightning-rainy":   { day: "mdi:weather-lightning-rainy",  night: "mdi:weather-lightning-rainy",  label: "Thunderstorm" },
  "partlycloudy":      { day: "mdi:weather-partly-cloudy",    night: "mdi:weather-night-partly-cloudy", label: "Partly cloudy" },
  "pouring":           { day: "mdi:weather-pouring",          night: "mdi:weather-pouring",          label: "Pouring" },
  "rainy":             { day: "mdi:weather-rainy",            night: "mdi:weather-rainy",            label: "Rainy" },
  "snowy":             { day: "mdi:weather-snowy",            night: "mdi:weather-snowy",            label: "Snowy" },
  "snowy-rainy":       { day: "mdi:weather-snowy-rainy",      night: "mdi:weather-snowy-rainy",      label: "Sleet" },
  "sunny":             { day: "mdi:weather-sunny",            night: "mdi:weather-night",            label: "Sunny" },
  "windy":             { day: "mdi:weather-windy",            night: "mdi:weather-windy",            label: "Windy" },
  "windy-variant":     { day: "mdi:weather-windy-variant",    night: "mdi:weather-windy-variant",    label: "Windy" },
};

export function weatherIcon(condition: string, isNight: boolean): string {
  const entry = ICON_MAP[condition];
  if (!entry) return "mdi:weather-cloudy";
  return isNight ? entry.night : entry.day;
}

export function conditionLabel(condition: string): string {
  return ICON_MAP[condition]?.label ?? condition;
}
