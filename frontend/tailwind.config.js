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
} from "./src/design-system/tokens/layout";
import { Opacity } from "./src/design-system/tokens/opacity";
import { Spacing } from "./src/design-system/tokens/spacing";
import { FontFamily, TypeScale } from "./src/design-system/tokens/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    // Replaces Tailwind's default colors, spacing, type, radii, borders, and opacity, so only
    // design tokens produce those classes. Layout scales like w-full and h-screen keep their
    // defaults through extend below.
    colors: { transparent: "transparent", current: "currentColor", ...StatusColor },
    // Status colors work with any utility, like the defaults they replace.
    textColor: { ...StatusColor, ...TextColor },
    backgroundColor: { ...StatusColor, ...BackgroundColor },
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
        ...Object.fromEntries(
          Object.entries(ContentWidth).map(([key, value]) => [`content-${key}`, value]),
        ),
      },
      maxWidth: Object.fromEntries(
        Object.entries(ContentWidth).map(([key, value]) => [`content-${key}`, value]),
      ),
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
  plugins: [],
};
