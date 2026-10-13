type TypeStyle = [fontSize: string, config: { lineHeight: string; fontWeight: string }];

export const FontFamily = {
  sans: ["system-ui", "sans-serif"],
};

// Each key becomes a `text-<key>` class that sets size, line height, and weight.
export const TypeScale = {
  heading: ["32px", { lineHeight: "40px", fontWeight: "700" }],
  subheading: ["20px", { lineHeight: "28px", fontWeight: "600" }],
  body: ["16px", { lineHeight: "24px", fontWeight: "400" }],
  caption: ["12px", { lineHeight: "16px", fontWeight: "400" }],
} satisfies Record<string, TypeStyle>;
