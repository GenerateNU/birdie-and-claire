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

// Fixed width and smallest height of an image card (`w-card-*`, `min-h-card-*`), from Figma: sm is
// the settings cards, lg the onboarding cards. A fixed width makes long labels wrap instead of
// widening one card.
export const CardSize = {
  sm: { width: "193px", height: "200px" },
  lg: { width: "236px", height: "408px" },
} as const;

export const AspectRatio = {
  portrait: "3 / 4",
  landscape: "3 / 2",
} as const;
