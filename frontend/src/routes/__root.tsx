import { CaretLeft } from "@phosphor-icons/react";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import { Page, Text, TextLink } from "@/design-system";

type RouterContext = { queryClient: QueryClient };

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <Page>
      <Text variant="heading" className="mb-xs">
        Page not found
      </Text>
      <TextLink to="/" leadingIcon={CaretLeft}>
        Home
      </TextLink>
    </Page>
  );
}
