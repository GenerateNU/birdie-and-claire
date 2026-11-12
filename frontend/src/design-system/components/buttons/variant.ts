const buttonBaseClasses = "rounded-none uppercase focus-ring data-[disabled]:opacity-disabled";

const buttonLayoutClasses = "inline-flex items-center justify-center gap-xxs";

const buttonVariantClasses = {
  primary: "bg-primary text-inverse",
  secondary: "border-thick border-primary bg-background font-semibold text-primary",
} as const;

const buttonSizeClasses = {
  sm: "px-xs py-xxs text-caption",
  md: "px-md py-xs text-body",
  lg: "px-lg py-sm text-subheading",
} as const;

export type ButtonVariant = keyof typeof buttonVariantClasses;

export type ButtonSize = keyof typeof buttonSizeClasses;

export function buttonClasses(variant: ButtonVariant, size: ButtonSize, withLayout: boolean) {
  const classes = `${buttonBaseClasses} ${buttonVariantClasses[variant]} ${buttonSizeClasses[size]}`;

  return withLayout ? `${classes} ${buttonLayoutClasses}` : classes;
}
