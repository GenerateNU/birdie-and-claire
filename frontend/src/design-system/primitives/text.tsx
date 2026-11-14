import type { HTMLAttributes } from "react";
import { joinClasses } from "@/design-system/utils/join-classes";

const variants = {
  display: { tag: "h1", className: "font-serif text-display" },
  headline: { tag: "h2", className: "font-serif text-heading-l" },
  heading: { tag: "h1", className: "font-serif text-heading-m" },
  subheading: { tag: "h2", className: "text-heading-s" },
  "heading-l": { tag: "h1", className: "font-serif text-heading-l" },
  "heading-m": { tag: "p", className: "font-serif text-heading-m" },
  "body-l": { tag: "p", className: "text-body-l" },
  body: { tag: "p", className: "text-body-m" },
  caption: { tag: "span", className: "text-body-s" },
} as const;

type TextVariant = keyof typeof variants;

type TextProps = HTMLAttributes<HTMLElement> & {
  variant: TextVariant;
};

export function Text({ variant, className, ...props }: TextProps) {
  const { tag: Tag, className: variantClassName } = variants[variant];
  const classes = joinClasses(variantClassName, className);

  return <Tag className={classes} {...props} />;
}
