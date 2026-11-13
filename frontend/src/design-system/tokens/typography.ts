type TypeStyle = [fontSize: string, config: { lineHeight: string; fontWeight: string }];

export const FontFamily = {
  sans: ["Montserrat", "system-ui", "sans-serif"],
  serif: ["Instrument Serif", "Georgia", "serif"],
};

// Each key becomes a `text-<key>` class that sets size, line height, and weight.
export const TypeScale = {
  "display-lg": ["105px", { lineHeight: "116px", fontWeight: "400" }],
  "display-md": ["86px", { lineHeight: "96px", fontWeight: "400" }],
  "display-sm": ["44px", { lineHeight: "52px", fontWeight: "400" }],
  heading: ["32px", { lineHeight: "40px", fontWeight: "700" }],
  subheading: ["20px", { lineHeight: "28px", fontWeight: "600" }],
  body: ["16px", { lineHeight: "24px", fontWeight: "400" }],
  caption: ["12px", { lineHeight: "16px", fontWeight: "400" }],
} satisfies Record<string, TypeStyle>;
