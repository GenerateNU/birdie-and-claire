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
    // Extends Tailwind's defaults rather than replacing them.
    extend: {
      colors: StatusColor,
      textColor: TextColor,
      backgroundColor: BackgroundColor,
      borderColor: BorderColor,
      outlineColor: OutlineColor,
      spacing: Spacing,
      width: { popup: PopupWidth, "card-sm": CardSize.sm.width, "card-lg": CardSize.lg.width },
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
      borderRadius: CornerRadius,
      borderWidth: BorderWidth,
      outlineWidth: { "focus-ring": FocusRing.width },
      outlineOffset: { "focus-ring": FocusRing.offset },
      opacity: Opacity,
      fontFamily: FontFamily,
      fontSize: TypeScale,
    },
  },
  plugins: [],
};
