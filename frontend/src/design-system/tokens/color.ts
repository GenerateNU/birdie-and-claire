// Placeholder palette until designers hand over branding. Private on purpose: pages
// and components use the semantic tokens below, never a raw color.
const Palette = {
  ink: "#282828",
  slate: "#8B91A3",
  paper: "#FDFDFD",
  cream: "#F2F1EB",
  mist: "#E7E8EC",
} as const;

export const StatusColor = {
  success: "#16A34A",
  error: "#DC2626",
  warning: "#D97706",
  info: "#2563EB",
} as const;

export const TextColor = {
  primary: Palette.ink,
  secondary: Palette.slate,
  inverse: Palette.paper,
} as const;

export const BackgroundColor = {
  background: Palette.paper,
  surface: Palette.cream,
  placeholder: Palette.mist,
  primary: Palette.ink,
  "control-off": Palette.slate,
  overlay: "rgba(0, 0, 0, 0.4)",
} as const;

// DEFAULT is the color the plain `border` class uses.
export const BorderColor = {
  DEFAULT: Palette.mist,
  primary: Palette.ink,
} as const;

export const OutlineColor = {
  focus: Palette.ink,
} as const;
