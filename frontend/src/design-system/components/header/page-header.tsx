import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Link } from "@/design-system/components/links/link";
import { Logo } from "@/design-system/components/logo/logo";
import { Box } from "@/design-system/primitives/box";

type PageHeaderProps = {
  title: string;
  /** Where the logo goes. */
  logoTo: LinkProps["to"];
  /** Buttons for the right edge, such as Save. */
  actions: ReactNode;
};

/** The top bar of a full-screen flow, which has no sidebar: title, logo, then actions. */
export function PageHeader({ title, logoTo, actions }: PageHeaderProps) {
  return (
    <header className="grid h-page-header shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b bg-card px-xxxl">
      <h1 className="truncate font-serif text-heading-m text-primary">{title}</h1>
      <Link to={logoTo} className="focus-ring">
        <Logo className="h-logo-header w-logo-header object-cover object-bottom" />
      </Link>
      <Box className="flex items-center justify-end gap-sm">{actions}</Box>
    </header>
  );
}
