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

export const AspectRatio = {
  portrait: "3 / 4",
} as const;
