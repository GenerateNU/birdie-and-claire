import { ArrowRightIcon } from "@phosphor-icons/react";
import { createLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, Ref } from "react";

import { textLinkClasses } from "@/design-system/components/links/text-link-classes";
import { joinClasses } from "@/design-system/utils/join-classes";

type TextAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  ref?: Ref<HTMLAnchorElement>;
  /** Figma's Show arrow, on by default. */
  arrow?: boolean;
};

function TextAnchor({ arrow = true, className, children, ...props }: TextAnchorProps) {
  const classes = joinClasses(`inline-flex items-center gap-xxs ${textLinkClasses}`, className);

  return (
    <a className={classes} {...props}>
      {children}
      {arrow && <ArrowRightIcon size={16} aria-hidden="true" />}
    </a>
  );
}

/** A type-checked route link styled as Figma's Text Link, like "See all →". */
export const TextLink = createLink(TextAnchor);
