// Floating panels. Figma's component notes give menu and toast as 0 4 16 black, but set the opacity
// per component: menu 8%, toast 12%. The modal's drop shadow is on the Figma modal itself.
export const Shadow = {
  menu: "0 4px 16px rgba(0, 0, 0, 0.08)",
  toast: "0 4px 16px rgba(0, 0, 0, 0.12)",
  modal: "0 24px 32px rgba(26, 20, 13, 0.18)",
} as const;
