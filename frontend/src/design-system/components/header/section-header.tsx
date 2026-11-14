import { ArrowRightIcon } from "@phosphor-icons/react";
import type { LinkProps } from "@tanstack/react-router";

import { TextLink } from "@/design-system/components/links/text-link";
import { Box } from "@/design-system/primitives/box";

type SectionHeaderProps = {
  title: string;
  /** The "See all" link at the right edge. */
  link?: { label: string; to: LinkProps["to"] };
};

/** A section's title with an optional link, stretched to the width of its content. */
export function SectionHeader({ title, link }: SectionHeaderProps) {
  return (
    <Box className="flex h-xxl w-full items-center justify-between gap-sm">
      <h2 className="truncate text-heading-s text-primary">{title}</h2>
      {link && (
        <TextLink to={link.to} trailingIcon={ArrowRightIcon} className="shrink-0">
          {link.label}
        </TextLink>
      )}
    </Box>
  );
}
