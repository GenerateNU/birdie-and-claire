import type { Icon } from "@phosphor-icons/react";
import { createLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, Ref } from "react";

import {
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from "@/design-system/components/buttons/variant";
import { textLinkClasses } from "@/design-system/components/links/text-link-classes";
import { joinClasses } from "@/design-system/utils/join-classes";

const textClasses = `inline-flex items-center gap-xxs ${textLinkClasses}`;

type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  ref?: Ref<HTMLAnchorElement>;
  leadingIcon?: Icon;
  trailingIcon?: Icon;
} & ({ variant?: "plain" | "text"; size?: never } | { variant: ButtonVariant; size?: ButtonSize });

function linkClasses(variant: AnchorProps["variant"], size: ButtonSize) {
  if (variant === undefined || variant === "plain") {
    return undefined;
  }

  if (variant === "text") {
    return textClasses;
  }

  return buttonClasses(variant, size, true);
}

function Anchor({
  variant,
  size = "md",
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  className,
  children,
  ...props
}: AnchorProps) {
  const ownClasses = linkClasses(variant, size);
  const classes = ownClasses === undefined ? className : joinClasses(ownClasses, className);

  return (
    <a className={classes} {...props}>
      {LeadingIcon && <LeadingIcon aria-hidden="true" />}
      {children}
      {TrailingIcon && <TrailingIcon aria-hidden="true" />}
    </a>
  );
}

/** A type-checked route link, unstyled unless `variant` styles it as a text link or a Button. */
export const Link = createLink(Anchor);
