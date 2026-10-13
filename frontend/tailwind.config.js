import {
  BackgroundColor,
  BorderColor,
  ColorScale,
  StatusColor,
  TextColor,
} from "./src/design-system/tokens/color";
import { CornerRadius } from "./src/design-system/tokens/corner-radius";
import { Spacing } from "./src/design-system/tokens/spacing";
import { FontFamily, TypeScale } from "./src/design-system/tokens/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    // Extends Tailwind's defaults rather than replacing them.
    extend: {
      colors: { ...ColorScale, ...StatusColor },
      textColor: TextColor,
      backgroundColor: BackgroundColor,
      borderColor: BorderColor,
      outlineColor: { focus: BorderColor.focus },
      spacing: Spacing,
      borderRadius: CornerRadius,
      fontFamily: FontFamily,
      fontSize: TypeScale,
    },
  },
  plugins: [],
};
