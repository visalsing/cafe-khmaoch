import React from "react";
import {
  Sun,
  Moon,
  Monitor,
  Computer,
  Palette,
  Sparkles,
  Coffee,
  Flame,
  Sprout,
} from "lucide-react";

/* The database stores only the NAME of an icon (themes.icon = "Sun").
   This list is the only place that turns a name into a real icon, so nothing from the
   database is ever run as code. To allow a new icon: import it above and add it here. */
export const THEME_ICONS = {
  Sun,
  Moon,
  Monitor,
  Computer,
  Palette,
  Sparkles,
  Coffee,
  Flame,
  Sprout,
};

export const THEME_ICON_NAMES = Object.keys(THEME_ICONS);

// an unknown or empty name falls back to the Monitor icon
export function ThemeIcon({ name, className = "w-5 h-5" }) {
  const Icon = THEME_ICONS[name] || Monitor;
  return <Icon className={className} />;
}