// Width of floating panels: dialogs and the toast stack.
export const PopupWidth = "384px";

// Widths for page content, narrowest first. Each becomes `max-w-content-<key>` and
// `w-content-<key>`.
export const ContentWidth = {
  sm: "448px",
  md: "576px",
  lg: "672px",
  xl: "896px",
  "2xl": "1339px",
} as const;

export const ScrollAreaHeight = "384px";

// Fixed width and smallest height of an image card (`w-card-*`, `min-h-card-*`), from Figma: sm is
// the settings cards, lg the onboarding cards. A fixed width makes long labels wrap instead of
// widening one card.
export const CardSize = {
  sm: { width: "193px", height: "200px" },
  lg: { width: "236px", height: "408px" },
} as const;

export const ThumbnailSize = { width: "92px", height: "112px" } as const;

// The checkbox and radio box (`size-control`), from Figma.
export const ControlSize = "20px";

// The text area's fixed box (`h-textarea`), from Figma.
export const TextAreaHeight = "112px";

// A choice row's smallest height (`min-h-choice-row`), from Figma.
export const ChoiceRowHeight = "60px";

// An option tile's fixed size (`w-tile`, `h-tile`), from Figma.
export const TileSize = { width: "160px", height: "176px" } as const;

// The icon on an option tile, in pixels for Phosphor's `size` prop.
export const TileIconSize = 44;

export const AspectRatio = {
  portrait: "3 / 4",
  landscape: "3 / 2",
} as const;
