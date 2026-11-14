type TypeStyle = [
  fontSize: string,
  config: { lineHeight: string; fontWeight: string; letterSpacing?: string },
];

export const FontFamily = {
  sans: ["Montserrat", "system-ui", "sans-serif"],
  serif: ["Instrument Serif", "Georgia", "serif"],
};

// Each key becomes a `text-<key>` class that sets size, line height, and weight. A class can't set
// the font family, so display, heading-l, and heading-m also need `font-serif`, and
// heading-m-italic needs `font-serif italic`; label-m, label-s, and overline are uppercase in Figma
// and need `uppercase`.
// Named after the Figma "B&C Type" styles.
export const TypeScale = {
  display: ["65px", { lineHeight: "1", fontWeight: "400" }],
  "heading-l": ["50px", { lineHeight: "1.05", fontWeight: "400" }],
  "heading-m": ["36px", { lineHeight: "1.1", fontWeight: "400" }],
  "heading-s": ["20px", { lineHeight: "1.3", fontWeight: "600" }],
  "heading-m-italic": ["24px", { lineHeight: "1.1", fontWeight: "400" }],
  "body-l": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
  "body-m": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
  "body-s": ["13px", { lineHeight: "1.45", fontWeight: "400" }],
  "label-l-strong": ["14px", { lineHeight: "1", fontWeight: "600" }],
  "label-l": ["14px", { lineHeight: "1", fontWeight: "500" }],
  "label-m": ["14px", { lineHeight: "1.2", fontWeight: "400", letterSpacing: "0.05em" }],
  "label-s": ["13px", { lineHeight: "1", fontWeight: "500", letterSpacing: "0.05em" }],
  overline: ["12px", { lineHeight: "1.3", fontWeight: "400", letterSpacing: "0.14em" }],
} satisfies Record<string, TypeStyle>;
