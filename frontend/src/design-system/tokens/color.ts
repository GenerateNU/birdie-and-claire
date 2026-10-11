// Placeholder values until designers hand over branding. Change values here;
// keep the names stable so components don't have to change.

const Gray = {
  50: "#F9FAFB",
  100: "#F3F4F6",
  200: "#E5E7EB",
  300: "#D1D5DB",
  400: "#9CA3AF",
  500: "#6B7280",
  600: "#4B5563",
  700: "#374151",
  800: "#1F2937",
  900: "#111827",
  950: "#030712",
} as const;

const Brand = {
  50: "#FDF2F8",
  100: "#FCE7F3",
  200: "#FBCFE8",
  300: "#F9A8D4",
  400: "#F472B6",
  500: "#EC4899",
  600: "#DB2777",
  700: "#BE185D",
  800: "#9D174D",
  900: "#831843",
  950: "#500724",
} as const;

export const ColorScale = {
  gray: Gray,
  brand: Brand,
} as const;

export const StatusColor = {
  success: "#16A34A",
  error: "#DC2626",
  warning: "#D97706",
  info: "#2563EB",
} as const;

export const TextColor = {
  primary: Gray[900],
  secondary: Gray[600],
  disabled: Gray[400],
} as const;

export const BackgroundColor = {
  background: "#FFFFFF",
  surface: Gray[50],
  overlay: "rgba(0, 0, 0, 0.4)",
} as const;

// DEFAULT is the color the plain `border` class uses.
export const BorderColor = {
  DEFAULT: Gray[200],
  focus: Brand[500],
} as const;
