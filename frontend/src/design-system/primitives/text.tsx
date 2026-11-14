import type { HTMLAttributes } from "react";
import { joinClasses } from "@/design-system/utils/join-classes";

const variants = {
  display: { tag: "h1", className: "font-serif text-display-sm lg:text-display-lg" },
  headline: { tag: "h2", className: "font-serif text-display-sm lg:text-display-md" },
  heading: { tag: "h1", className: "text-heading uppercase" },
  subheading: { tag: "h2", className: "text-subheading uppercase" },
  subsubheading: { tag: "h3", className: "text-subheading uppercase" },
  body: { tag: "p", className: "text-body" },
  caption: { tag: "span", className: "text-caption" },
  // Hi-fi styles. `-hifi` only where a lofi variant already has the name.
  "display-hifi": { tag: "h1", className: "font-serif text-display" },
  "body-l": { tag: "p", className: "text-body-l" },
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
