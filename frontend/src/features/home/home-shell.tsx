import { BookmarkSimpleIcon, CoatHangerIcon, HouseIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import { Box, Sidebar } from "@/design-system";

type HomeShellProps = {
  accountName: string;
  children: ReactNode;
};

export function HomeShell({ accountName, children }: HomeShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  return (
    <Box className="flex min-h-screen">
      {/* Sidebar fills its parent's height, so the parent is pinned to the viewport's height. */}
      <Box className="sticky top-0 h-screen shrink-0">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((current) => !current)}
          logoTo="/"
          action={{
            label: "Create New Outfit",
            onClick: () => void navigate({ to: "/create-outfit" }),
          }}
          items={[
            { label: "Home", icon: HouseIcon, to: "/", active: true },
            { label: "Saved outfits", icon: BookmarkSimpleIcon, to: "/profile/outfits" },
          ]}
          secondaryItems={[{ label: "My pieces", icon: CoatHangerIcon, to: "/profile/pieces" }]}
          account={{ name: accountName, detail: "My Account", to: "/profile" }}
        />
      </Box>
      <main className="min-w-0 flex-1 p-xxxl">{children}</main>
    </Box>
  );
}
