// Hi-fi palette from the Figma style guide. Private on purpose: pages and components use the
// semantic tokens below, never a raw color.
const Palette = {
  ink: "#242424",
  inkHover: "#484846",
  paper: "#FDFDFD",
  white: "#FFFFFF",
  tan: "#F0EFE9",
  slateSubtle: "#E3E5E9",
  slate: "#808798",
  slateStrong: "#5F6677",
  red: "#B3261E",
  redHover: "#8F1E18",
  redPressed: "#721813",
  redSubtle: "#F6E3E1",
  green: "#2E6B4F",
  greenSubtle: "#E4EEE8",
} as const;

// warning and info stay raw because Figma has no counterpart for them yet. They are the only
// values outside Palette.
export const StatusColor = {
  success: Palette.green,
  error: Palette.red,
  warning: "#D97706",
  info: "#2563EB",
} as const;

export const TextColor = {
  primary: Palette.ink,
  secondary: Palette.slateStrong,
  disabled: Palette.slate,
  inverse: Palette.paper,
} as const;

export const BackgroundColor = {
  background: Palette.paper,
  surface: Palette.tan,
  card: Palette.white,
  placeholder: Palette.slateSubtle,
  // Hover on neutral surfaces such as rows and secondary controls.
  hover: Palette.slateSubtle,
  primary: Palette.ink,
  "primary-hover": Palette.inkHover,
  "error-hover": Palette.redHover,
  "error-pressed": Palette.redPressed,
  "error-subtle": Palette.redSubtle,
  "success-subtle": Palette.greenSubtle,
  "control-off": Palette.slate,
  overlay: "rgba(0, 0, 0, 0.4)",
  // Darkens a photo enough for inverse text to read on it. The opacity is the lofi homescreen's.
  "photo-overlay": "rgba(0, 0, 0, 0.69)",
} as const;

// DEFAULT is the color the plain `border` class uses.
export const BorderColor = {
  DEFAULT: Palette.slateSubtle,
  primary: Palette.ink,
} as const;

// focus-inverse is for controls on a dark surface, where the ink ring disappears.
export const OutlineColor = {
  focus: Palette.ink,
  "focus-inverse": Palette.paper,
} as const;
