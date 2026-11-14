import { createFileRoute, Outlet } from "@tanstack/react-router";

import { Box } from "@/design-system";
import { AppSidebar } from "@/features/navigation/app-sidebar";

export const Route = createFileRoute("/_signedIn/_onboarded/_nav")({
  component: SidebarLayout,
});

function SidebarLayout() {
  return (
    <Box className="flex min-h-screen">
      <Box className="sticky top-0 h-screen shrink-0">
        <AppSidebar />
      </Box>
      <Box className="min-w-0 flex-1">
        <Outlet />
      </Box>
    </Box>
  );
}
