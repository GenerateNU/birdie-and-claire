import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Box, Tabs, Text } from "@/design-system";

type SavedOutfitsTab = "all" | "collections";

const TABS: { label: string; value: SavedOutfitsTab }[] = [
  { label: "All", value: "all" },
  { label: "Collections", value: "collections" },
];

type SavedOutfitsLayoutProps = {
  active: SavedOutfitsTab;
  /** Buttons for the right of the heading. */
  actions?: ReactNode;
  children: ReactNode;
};

/** The Saved Outfits heading and tab strip. Each tab is its own route, so a tab change navigates. */
export function SavedOutfitsLayout({ active, actions, children }: SavedOutfitsLayoutProps) {
  const navigate = useNavigate();

  return (
    <>
      <Box className="mb-lg flex items-center justify-between gap-md">
        <Text variant="heading">Saved Outfits</Text>
        {actions}
      </Box>
      <Tabs
        tabs={TABS}
        value={active}
        disabled={false}
        onValueChange={(tab) =>
          void navigate({ to: tab === "all" ? "/profile/outfits" : "/profile/collections" })
        }
      >
        <Box className="pt-md">{children}</Box>
      </Tabs>
    </>
  );
}
