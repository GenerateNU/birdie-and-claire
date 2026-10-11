export const ButtonBase =
  "rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus data-[disabled]:opacity-50";

export const ButtonVariant = {
  primary: "bg-brand-500 text-white",
  secondary: "border bg-background text-primary",
} as const;

export const ButtonSize = {
  sm: "px-xs py-xxs text-caption",
  md: "px-md py-xs text-body",
  lg: "px-lg py-sm text-subheading",
} as const;
