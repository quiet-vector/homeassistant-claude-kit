// lib/navigation.ts — dashboard navigation structure

export type ViewId =
  | "home"
  | "climate"
  | "energy"
  | "security"
  | "irrigation"
  | "settings"
  | "health";

export interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
  /** "always" = always show, "seasonal" = hide in winter, "admin" = admins only */
  visible?: "always" | "seasonal" | "admin";
}

export const NAV_ITEMS: NavItem[] = [
  { id: "home",      label: "Home",     icon: "mdi:home-outline" },
  { id: "climate",   label: "Climate",  icon: "lucide:thermometer-sun" },
  { id: "energy",    label: "Energy",   icon: "mdi:solar-power-variant-outline", visible: "seasonal" },
  { id: "security",  label: "Security", icon: "mdi:shield-home-outline" },
  { id: "settings",  label: "Settings", icon: "mdi:cog-outline" },
  { id: "health",    label: "Health",   icon: "mdi:heart-pulse", visible: "admin" },
];
