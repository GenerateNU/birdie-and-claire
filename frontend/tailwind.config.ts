import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

import { AvatarSize } from "./src/design-system/tokens/avatar-size";
import { BorderWidth } from "./src/design-system/tokens/border-width";
import {
  BackgroundColor,
  BorderColor,
  StatusColor,
  OutlineColor,
  TextColor,
} from "./src/design-system/tokens/color";
import { CornerRadius } from "./src/design-system/tokens/corner-radius";
import { FocusRing } from "./src/design-system/tokens/focus-ring";
import {
  AddTileSize,
  AspectRatio,
  CardOverlayInset,
  CardSize,
  ChoiceRowHeight,
  CollectionCardSize,
  ContentWidth,
  ControlSize,
  EmptyStateIconSize,
  EmptyStateWidth,
  ItemCardSize,
  LogoSize,
  MenuWidth,
  ModalImageWidth,
  ModalWidth,
  OutfitCardSize,
  PageHeaderHeight,
  RowThumbnailSize,
  ScrollAreaHeight,
  SidebarWidth,
  StampSize,
  TextAreaHeight,
  ThumbnailSize,
  TileSize,
} from "./src/design-system/tokens/layout";
import { Opacity } from "./src/design-system/tokens/opacity";
import { Shadow } from "./src/design-system/tokens/shadow";
import { Spacing } from "./src/design-system/tokens/spacing";
import { FontFamily, TypeScale } from "./src/design-system/tokens/typography";

export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    // Replaces Tailwind's default colors, spacing, type, radii, borders, and opacity, so only
    // design tokens produce those classes. Layout scales like w-full and h-screen keep their
    // defaults through extend below.
    colors: { transparent: "transparent", current: "currentColor", ...StatusColor },
    // Status colors work with any utility, like the defaults they replace.
    textColor: { transparent: "transparent", ...StatusColor, ...TextColor },
    backgroundColor: { transparent: "transparent", ...StatusColor, ...BackgroundColor },
    borderColor: { transparent: "transparent", ...StatusColor, ...BorderColor },
    outlineColor: OutlineColor,
    spacing: { 0: "0px", px: "1px", ...Spacing },
    borderRadius: CornerRadius,
    boxShadow: { none: "none", ...Shadow },
    borderWidth: { 0: "0px", ...BorderWidth },
    opacity: { 0: "0", 100: "1", ...Opacity },
    fontFamily: FontFamily,
    fontSize: TypeScale,
    extend: {
      width: {
        "modal-sm": ModalWidth.sm,
        "modal-md": ModalWidth.md,
        "modal-lg": ModalWidth.lg,
        "modal-image": ModalImageWidth,
        menu: MenuWidth,
        "card-sm": CardSize.sm.width,
        "card-lg": CardSize.lg.width,
        "item-md": ItemCardSize.md.width,
        "item-sm": ItemCardSize.sm.width,
        "item-xs": ItemCardSize.xs.width,
        "add-tile-lg": AddTileSize.lg.width,
        "add-tile-sm": AddTileSize.sm.width,
        collection: CollectionCardSize.width,
        "collage-main": CollectionCardSize.mainWidth,
        outfit: OutfitCardSize.width,
        "row-thumbnail": RowThumbnailSize.width,
        thumbnail: ThumbnailSize.width,
        tile: TileSize.width,
        sidebar: SidebarWidth.expanded,
        "sidebar-collapsed": SidebarWidth.collapsed,
        "logo-sidebar": LogoSize.sidebar.width,
        "logo-header": LogoSize.header.width,
        ...Object.fromEntries(
          Object.entries(ContentWidth).map(([key, value]) => [`content-${key}`, value]),
        ),
      },
      maxWidth: {
        "empty-state": EmptyStateWidth,
        ...Object.fromEntries(
          Object.entries(ContentWidth).map(([key, value]) => [`content-${key}`, value]),
        ),
      },
      height: {
        "card-sm": CardSize.sm.photoHeight,
        "card-lg": CardSize.lg.photoHeight,
        "item-md": ItemCardSize.md.photoHeight,
        "item-sm": ItemCardSize.sm.photoHeight,
        "item-xs": ItemCardSize.xs.photoHeight,
        "add-tile-lg": AddTileSize.lg.height,
        "add-tile-sm": AddTileSize.sm.height,
        collection: CollectionCardSize.collageHeight,
        outfit: OutfitCardSize.imageHeight,
        "row-thumbnail": RowThumbnailSize.height,
        thumbnail: ThumbnailSize.height,
        textarea: TextAreaHeight,
        tile: TileSize.height,
        "page-header": PageHeaderHeight,
        "logo-sidebar": LogoSize.sidebar.height,
        "logo-header": LogoSize.header.height,
      },
      maxHeight: { "scroll-area": ScrollAreaHeight },
      minHeight: { "choice-row": ChoiceRowHeight },
      inset: { "card-ring": CardOverlayInset.ring, "card-hover": CardOverlayInset.hover },
      aspectRatio: AspectRatio,
      size: {
        control: ControlSize,
        "empty-state-icon": EmptyStateIconSize,
        "stamp-md": StampSize.md,
        "stamp-sm": StampSize.sm,
        "avatar-sm": AvatarSize.sm,
        "avatar-md": AvatarSize.md,
        "avatar-lg": AvatarSize.lg,
      },
      outlineWidth: { "focus-ring": FocusRing.width },
      outlineOffset: { "focus-ring": FocusRing.offset },
    },
  },
  plugins: [
    plugin(({ addBase, addComponents }) => {
      // An array, because an object can hold only one "@font-face" key.
      addBase([
        {
          "@font-face": {
            fontFamily: FontFamily.sans[0],
            // Emitted into src/index.css, so the path is relative to that file.
            src: 'url("./design-system/assets/fonts/Montserrat-Variable.ttf") format("truetype")',
            fontWeight: "100 900",
            fontDisplay: "swap",
          },
        },
        {
          "@font-face": {
            fontFamily: FontFamily.serif[0],
            src: 'url("./design-system/assets/fonts/InstrumentSerif-Regular.ttf") format("truetype")',
            fontWeight: "400",
            fontDisplay: "swap",
          },
        },
        {
          body: {
            backgroundColor: BackgroundColor.background,
            fontFamily: FontFamily.sans.join(", "),
            color: TextColor.primary,
          },
        },
      ]);

      addComponents({
        ".focus-ring:focus-visible": {
          outlineStyle: "solid",
          outlineWidth: FocusRing.width,
          outlineOffset: FocusRing.offset,
          outlineColor: OutlineColor.focus,
        },
      });
    }),
  ],
} satisfies Config;
