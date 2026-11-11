import type { ReactNode } from "react";

import { Box, Link, Logo } from "@/design-system";

type OutfitDetailsFrameProps = {
  children: ReactNode;
};

/** The details page's full-height layout, with the logo header above its content. */
export function OutfitDetailsFrame({ children }: OutfitDetailsFrameProps) {
  return (
    <Box className="flex h-screen flex-col">
      {/* The Figma's navigation bar height and logo size. */}
      <header className="flex h-[120px] shrink-0 items-end justify-center border-y">
        <Link to="/profile/outfits">
          {/* object-bottom repeats the Figma's crop of the image's empty top edge. */}
          <Logo className="h-[118px] w-[373px] object-cover object-bottom" />
        </Link>
      </header>
      {children}
    </Box>
  );
}
