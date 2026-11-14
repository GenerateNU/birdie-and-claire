import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Box, TextLink } from "@/design-system";

type HomeSectionProps = {
  title: string;
  link: { label: string; to: LinkProps["to"] };
  children: ReactNode;
};

/** A Home row: a serif title over a rule with a "See all" link, then the row's content. */
export function HomeSection({ title, link, children }: HomeSectionProps) {
  return (
    <Box className="flex flex-col gap-xxxl">
      <Box className="flex items-end justify-between border-b border-primary pb-sm">
        <h2 className="font-serif text-heading-m">{title}</h2>
        <TextLink to={link.to}>{link.label}</TextLink>
      </Box>
      {children}
    </Box>
  );
}
