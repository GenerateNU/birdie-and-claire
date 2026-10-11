import type { HTMLAttributes } from "react";

const variants = {
  heading: { tag: "h2", className: "text-heading" },
  subheading: { tag: "h3", className: "text-subheading" },
  body: { tag: "p", className: "text-body" },
  caption: { tag: "span", className: "text-caption" },
} as const;

type TextVariant = keyof typeof variants;

type TextProps = HTMLAttributes<HTMLElement> & {
  variant: TextVariant;
};

export function Text({ variant, className, ...props }: TextProps) {
  const { tag: Tag, className: variantClassName } = variants[variant];
  const classes = className ? `${variantClassName} ${className}` : variantClassName;

  return <Tag className={classes} {...props} />;
}
