import type { Icon } from "@phosphor-icons/react";
import { createLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, Ref } from "react";

import { textLinkClasses } from "@/design-system/components/links/text-link-classes";
import { joinClasses } from "@/design-system/utils/join-classes";

type TextAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  ref?: Ref<HTMLAnchorElement>;
  leadingIcon?: Icon;
  trailingIcon?: Icon;
};

const iconSize = 16;

function TextAnchor({
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  className,
  children,
  ...props
}: TextAnchorProps) {
  const classes = joinClasses(`inline-flex items-center gap-xxs ${textLinkClasses}`, className);

  return (
    <a className={classes} {...props}>
      {LeadingIcon && <LeadingIcon size={iconSize} aria-hidden="true" />}
      {children}
      {TrailingIcon && <TrailingIcon size={iconSize} aria-hidden="true" />}
    </a>
  );
}

/** A type-checked route link styled as Figma's Text Link: underlines on hover. */
export const TextLink = createLink(TextAnchor);
