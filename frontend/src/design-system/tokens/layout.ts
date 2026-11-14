// A modal's width (`w-modal-<key>`), from Figma. The split modal is the large width.
export const ModalWidth = { sm: "480px", md: "640px", lg: "880px" } as const;

// The photo beside a split modal's content (`w-modal-image`), from Figma.
export const ModalImageWidth = "360px";

// A menu's fixed width (`w-menu`), from Figma.
export const MenuWidth = "200px";

// The widest an empty state grows (`max-w-empty-state`), from Figma.
export const EmptyStateWidth = "400px";

// The square behind an empty state's icon (`size-empty-state-icon`), from Figma.
export const EmptyStateIconSize = "56px";

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

// Fixed width and photo height of an image option card (`w-card-*`, `h-card-*`), from Figma: sm is
// for neckline, bottoms and shoes, lg for occasion and style vibe. A fixed width makes long labels
// wrap instead of widening one card.
export const CardSize = {
  sm: { width: "140px", photoHeight: "140px" },
  lg: { width: "236px", photoHeight: "290px" },
} as const;

// Fixed width and photo height of an item card (`w-item-*`, `h-item-*`), from Figma.
export const ItemCardSize = {
  md: { width: "180px", photoHeight: "225px" },
  sm: { width: "120px", photoHeight: "150px" },
} as const;

// The B&C stamp on an item card's photo (`size-stamp-*`), from Figma.
export const StampSize = { md: "48px", sm: "36px" } as const;

// An add tile's fixed size (`w-add-tile-*`, `h-add-tile-*`), from Figma. Lg matches the photo height
// of an image option card.
export const AddTileSize = {
  lg: { width: "196px", height: "290px" },
  sm: { width: "140px", height: "140px" },
} as const;

// A collection card's width and collage height (`w-collection`, `h-collection`), and the width of
// the collage's large image (`w-collage-main`), from Figma. The two stacked images take the rest.
export const CollectionCardSize = {
  width: "340px",
  collageHeight: "255px",
  mainWidth: "208px",
} as const;

// An outfit card's width and image height (`w-outfit`, `h-outfit`), from Figma.
export const OutfitCardSize = { width: "240px", imageHeight: "300px" } as const;

// The thumbnail in a piece row (`w-row-thumbnail`, `h-row-thumbnail`), from Figma.
export const RowThumbnailSize = { width: "64px", height: "80px" } as const;

// How far a card's overlays reach past its box (`inset-card-ring`, `inset-card-hover`), from Figma:
// the selected ring sits 4px outside the photo (2px border plus 4px gap), the hover outline 10px
// outside the whole card.
export const CardOverlayInset = { ring: "-6px", hover: "-10px" } as const;

export const ThumbnailSize = { width: "92px", height: "112px" } as const;

// The checkbox and radio box (`size-control`), from Figma.
export const ControlSize = "1.25rem";

// The text area's fixed box (`h-textarea`), from Figma.
export const TextAreaHeight = "7rem";

// A choice row's smallest height (`min-h-choice-row`), from Figma.
export const ChoiceRowHeight = "3.75rem";

// An option tile's fixed size (`w-tile`, `h-tile`), from Figma.
export const TileSize = { width: "10rem", height: "11rem" } as const;

// The icon on an option tile, for Phosphor's `size` prop.
export const TileIconSize = "2.75rem";

export const AspectRatio = {
  portrait: "3 / 4",
  landscape: "3 / 2",
} as const;
