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
  AspectRatio,
  CardSize,
  ContentWidth,
  PopupWidth,
  ScrollAreaHeight,
  ThumbnailSize,
} from "./src/design-system/tokens/layout";
import { Opacity } from "./src/design-system/tokens/opacity";
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
    borderWidth: { 0: "0px", ...BorderWidth },
    opacity: { 0: "0", 100: "1", ...Opacity },
    fontFamily: FontFamily,
    fontSize: TypeScale,
    extend: {
      width: {
        popup: PopupWidth,
        "card-sm": CardSize.sm.width,
        "card-lg": CardSize.lg.width,
        thumbnail: ThumbnailSize.width,
        ...Object.fromEntries(
          Object.entries(ContentWidth).map(([key, value]) => [`content-${key}`, value]),
        ),
      },
      maxWidth: Object.fromEntries(
        Object.entries(ContentWidth).map(([key, value]) => [`content-${key}`, value]),
      ),
      height: { thumbnail: ThumbnailSize.height },
      maxHeight: { "scroll-area": ScrollAreaHeight },
      minHeight: { "card-sm": CardSize.sm.height, "card-lg": CardSize.lg.height },
      aspectRatio: AspectRatio,
      size: {
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
      addBase({
        "@font-face": {
          fontFamily: FontFamily.sans[0],
          // Emitted into src/index.css, so the path is relative to that file.
          src: 'url("./design-system/assets/fonts/Montserrat-Variable.ttf") format("truetype")',
          fontWeight: "100 900",
          fontDisplay: "swap",
        },
        body: {
          backgroundColor: BackgroundColor.background,
          fontFamily: FontFamily.sans.join(", "),
          color: TextColor.primary,
        },
      });

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
