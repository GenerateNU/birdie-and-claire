// A disabled control sets data-disabled, which comes after hover and active in Tailwind's
// variant order, so the data-[disabled] classes win those ties.
export const buttonVariantClasses = {
  primary:
    "bg-primary text-inverse hover:bg-primary-hover active:bg-primary-pressed data-[disabled]:bg-placeholder data-[disabled]:text-disabled",
  secondary:
    "border border-primary bg-card text-primary hover:bg-hover active:bg-pressed data-[disabled]:border-disabled data-[disabled]:bg-card data-[disabled]:text-disabled",
  ghost:
    "text-primary hover:bg-hover active:bg-pressed data-[disabled]:bg-transparent data-[disabled]:text-disabled",
  destructive:
    "bg-error text-inverse hover:bg-error-hover active:bg-error-pressed data-[disabled]:bg-placeholder data-[disabled]:text-disabled",
} as const;

const buttonBaseClasses =
  "inline-flex items-center justify-center gap-xs rounded-none uppercase focus-ring";

// Heights are Figma's 40px and 32px, which are the xxl and xl spacing steps.
const buttonSizeClasses = {
  md: "h-xxl text-label-m",
  sm: "h-xl text-overline",
} as const;

// Ghost buttons read as text, so Figma pads them less.
const buttonPaddingClasses = {
  solid: { md: "px-lg", sm: "px-md" },
  ghost: { md: "px-sm", sm: "px-xs" },
} as const;

export const buttonIconSize = { md: 16, sm: 14 } as const;

export type ButtonVariant = keyof typeof buttonVariantClasses;

export type ButtonSize = keyof typeof buttonSizeClasses;

export function buttonClasses(variant: ButtonVariant, size: ButtonSize) {
  const padding = buttonPaddingClasses[variant === "ghost" ? "ghost" : "solid"][size];

  return `${buttonBaseClasses} ${buttonVariantClasses[variant]} ${buttonSizeClasses[size]} ${padding}`;
}
