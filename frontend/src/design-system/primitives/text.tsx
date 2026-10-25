import type { HTMLAttributes } from "react";
import { joinClasses } from "../utils/join-classes";

const variants = {
  heading: { tag: "h1", className: "text-heading uppercase" },
  subheading: { tag: "h3", className: "text-subheading uppercase" },
  body: { tag: "p", className: "text-body" },
  caption: { tag: "span", className: "text-caption" },
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
