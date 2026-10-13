export const buttonBaseClasses = "rounded-md focus-ring data-[disabled]:opacity-50";

export const buttonVariantClasses = {
  primary: "bg-brand-500 text-inverse",
  secondary: "border bg-background text-primary",
} as const;

export const buttonSizeClasses = {
  sm: "px-xs py-xxs text-caption",
  md: "px-md py-xs text-body",
  lg: "px-lg py-sm text-subheading",
} as const;

export type ButtonVariant = keyof typeof buttonVariantClasses;
