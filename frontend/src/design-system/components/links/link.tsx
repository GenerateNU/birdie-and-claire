import type { Icon } from "@phosphor-icons/react";
import { createLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, Ref } from "react";

import {
  buttonClasses,
  buttonIconSize,
  type ButtonSize,
  type ButtonVariant,
} from "@/design-system/components/buttons/variant";
import { joinClasses } from "@/design-system/utils/join-classes";

type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  ref?: Ref<HTMLAnchorElement>;
  leadingIcon?: Icon;
  trailingIcon?: Icon;
} & ({ variant?: "plain"; size?: never } | { variant: ButtonVariant; size?: ButtonSize });

function Anchor({
  variant,
  size = "md",
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  className,
  children,
  ...props
}: AnchorProps) {
  const isButton = variant !== undefined && variant !== "plain";

  const classes = isButton
    ? joinClasses(
        `${buttonClasses(variant, size)} motion-safe:transition-transform motion-safe:active:scale-95`,
        className,
      )
    : className;

  // 1em is Phosphor's own default, so an unstyled link's icons follow its text.
  const iconSize = isButton ? buttonIconSize[size] : "1em";

  return (
    <a className={classes} {...props}>
      {LeadingIcon && <LeadingIcon size={iconSize} aria-hidden="true" />}
      {children}
      {TrailingIcon && <TrailingIcon size={iconSize} aria-hidden="true" />}
    </a>
  );
}

/** A type-checked route link, unstyled unless `variant` styles it like a Button. */
export const Link = createLink(Anchor);
