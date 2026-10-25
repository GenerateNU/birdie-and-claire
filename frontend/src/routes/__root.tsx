import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";

import { Text } from "@/design-system";

type RouterContext = { queryClient: QueryClient };

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <div className="min-h-screen p-xl">
      <Text variant="heading" className="mb-xs">
        Page not found
      </Text>
      <Link className="text-secondary text-body underline hover:text-primary" to="/">
        ← Home
      </Link>
    </div>
  );
}
