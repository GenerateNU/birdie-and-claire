// A modal's width (`w-modal-<key>`), from Figma. The split modal is the large width.
export const ModalWidth = { sm: "480px", md: "640px", lg: "880px" } as const;

// The photo beside a split modal's content (`w-modal-image`), from Figma.
export const ModalImageWidth = "360px";

// The onboarding screens' widths (`w-onboarding-<key>`), from Figma's Get To Know You frames: the
// photo down the left, the welcome card, the answer rows, the stepper, and the Next button.
export const OnboardingWidth = {
  photo: "400px",
  card: "591px",
  choices: "565px",
  stepper: "468px",
  next: "200px",
} as const;

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
  xs: { width: "80px", photoHeight: "80px" },
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

// The home hero's height and the photo's width (`h-hero`, `w-hero-photo`), from Figma.
export const HomeHeroSize = { height: "19.375rem", photoWidth: "27.0625rem" } as const;

// An outfit slot's width and photo heights (`w-outfit-slot`, `h-outfit-slot-*`), from Figma.
export const OutfitSlotSize = {
  width: "258px",
  photoHeight: "168px",
  emptyHeight: "208px",
} as const;

// The thumbnail in a piece row (`w-row-thumbnail`, `h-row-thumbnail`), from Figma.
export const RowThumbnailSize = { width: "64px", height: "80px" } as const;

// How far a card's hover outline reaches past the card (`p-card-hover`, `-m-card-hover`), from
// Figma: 10px outside the whole card, which is 0.625rem at the default font size. A list pads itself
// by this much, so the outline stays inside it.
export const CardHoverOutlineWidth = "0.625rem";

// How far a card's overlays reach past its box (`inset-card-ring`, `inset-card-hover`), from Figma:
// the selected ring's outer edge sits 6px outside the photo (4px gap plus 2px border), the hover
// outline CardHoverOutlineWidth outside the whole card. The hover reach is derived, not set by hand,
// so it always equals the list's padding and margin.
export const CardOverlayInset = { ring: "-6px", hover: `-${CardHoverOutlineWidth}` } as const;

// The space between rows of outfit cards (`gap-y-outfit-row`), from Figma: 20px, which is 1.25rem
// at the default font size. No spacing token has this value.
export const OutfitGridRowGap = "1.25rem";

export const ThumbnailSize = { width: "92px", height: "112px" } as const;

// The checkbox and radio box (`size-control`), from Figma.
export const ControlSize = "1.25rem";

// A progress stepper step's width (`w-step`), from Figma. The last step hugs its label.
export const StepWidth = "180px";

// The selected radio's dot (`size-radio-dot`), from Figma.
export const RadioDotSize = "10px";

// The text area's fixed box (`h-textarea`), from Figma.
export const TextAreaHeight = "7rem";

// A choice row's smallest height (`min-h-choice-row`), from Figma.
export const ChoiceRowHeight = "3.75rem";

// An option tile's fixed size (`w-tile`, `h-tile`), from Figma.
export const TileSize = { width: "10rem", height: "11rem" } as const;

// The icon on an option tile, for Phosphor's `size` prop.
export const TileIconSize = "2.75rem";

// A sidebar's width (`w-sidebar`, `w-sidebar-collapsed`), from Figma.
export const SidebarWidth = { expanded: "15rem", collapsed: "4.5rem" } as const;

// The page header's height (`h-page-header`), from Figma.
export const PageHeaderHeight = "5rem";

// The logo's box in the sidebar and the page header (`w-logo-*`, `h-logo-*`), from Figma. The image
// has an empty top edge that the box crops with `object-cover object-bottom`.
export const LogoSize = {
  sidebar: { width: "9.375rem", height: "2.9375rem" },
  header: { width: "11.25rem", height: "3.5625rem" },
  onboarding: { width: "20.75rem", height: "6.5625rem" },
} as const;

// The padding around the canvas inside its gray panel (`px-canvas-panel-x`,
// `py-canvas-panel-y`), from Figma's Builder Space: 56px at the sides, 20px above and below.
// No spacing token has these values.
export const CanvasPanelPadding = { x: "3.5rem", y: "1.25rem" } as const;

export const AspectRatio = {
  portrait: "3 / 4",
  landscape: "3 / 2",
} as const;
