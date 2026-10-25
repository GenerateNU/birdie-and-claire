// Width of floating panels: dialogs and the toast stack.
export const PopupWidth = "384px";

// Max widths for page content, narrowest first. Each becomes `max-w-content-<key>`.
export const ContentWidth = {
  sm: "448px",
  md: "576px",
  lg: "672px",
  xl: "896px",
} as const;

// Max height of a scrolling list (`max-h-scroll-area`).
export const ScrollAreaHeight = "384px";

// Smallest size of a selectable image card (`min-w-card`, `min-h-card`), from the onboarding
// cards in Figma. Keeps cards the same size however many share a row.
export const CardSize = {
  width: "236px",
  height: "408px",
} as const;

export const AspectRatio = {
  portrait: "3 / 4",
} as const;
