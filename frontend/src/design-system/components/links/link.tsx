import type { Icon } from "@phosphor-icons/react";
import { createLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, Ref } from "react";

import { joinClasses } from "@/design-system/utils/join-classes";

const textClasses =
  "inline-flex items-center gap-xxs text-body text-secondary underline hover:text-primary focus-ring";

type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  ref?: Ref<HTMLAnchorElement>;
  variant?: "plain" | "text";
  leadingIcon?: Icon;
  trailingIcon?: Icon;
};

function Anchor({
  variant = "plain",
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  className,
  children,
  ...props
}: AnchorProps) {
  const classes = variant === "text" ? joinClasses(textClasses, className) : className;

  return (
    <a className={classes} {...props}>
      {LeadingIcon && <LeadingIcon aria-hidden="true" />}
      {children}
      {TrailingIcon && <TrailingIcon aria-hidden="true" />}
    </a>
  );
}

/**
 * A link to a route. Takes the router Link's props, so `to` is type-checked. Unstyled like the
 * router's Link unless `variant="text"` makes it an underlined text link.
 */
export const Link = createLink(Anchor);
