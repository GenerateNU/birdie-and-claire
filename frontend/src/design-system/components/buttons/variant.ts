export const buttonBaseClasses =
  "rounded-none uppercase focus-ring data-[disabled]:opacity-disabled";

export const buttonVariantClasses = {
  primary: "bg-primary text-inverse",
  secondary: "border-thick border-primary bg-background font-semibold text-primary",
} as const;

export const buttonSizeClasses = {
  sm: "px-xs py-xxs text-caption",
  md: "px-md py-xs text-body",
  lg: "px-lg py-sm text-subheading",
} as const;

export type ButtonVariant = keyof typeof buttonVariantClasses;
