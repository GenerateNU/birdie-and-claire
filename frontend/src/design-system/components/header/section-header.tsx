import type { LinkProps } from "@tanstack/react-router";

import { TextLink } from "@/design-system/components/links/text-link";
import { Box } from "@/design-system/primitives/box";

const sizeClasses = {
  md: { row: "h-xxl", title: "text-heading-s" },
  sm: { row: "", title: "text-label-l-strong" },
} as const;

type SectionHeaderProps = {
  title: string;
  /** A count beside the title, such as "6 pieces". */
  count?: string;
  /** The "See all" link at the right edge. */
  link?: { label: string; to: LinkProps["to"] };
  size?: keyof typeof sizeClasses;
};

/** A section's title with an optional count or link, stretched to the width of its content. */
export function SectionHeader({ title, count, link, size = "md" }: SectionHeaderProps) {
  const { row, title: titleClasses } = sizeClasses[size];

  return (
    <Box className={`flex w-full items-center gap-sm ${row}`}>
      <Box className="flex min-w-0 flex-1 items-baseline gap-sm">
        <h2 className={`truncate text-primary ${titleClasses}`}>{title}</h2>
        {count && <Box className={`shrink-0 text-primary ${titleClasses}`}>{count}</Box>}
      </Box>
      {link && (
        <TextLink to={link.to} className="shrink-0">
          {link.label}
        </TextLink>
      )}
    </Box>
  );
}
