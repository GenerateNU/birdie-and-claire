import { CaretLeft } from "@phosphor-icons/react";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet, useRouterState } from "@tanstack/react-router";
import { useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

import { Box, Page, Text, TextLink } from "@/design-system";

type RouterContext = { queryClient: QueryClient };

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
  notFoundComponent: NotFound,
});

function Root() {
  const pathname = useRouterState({
    select: (state) => state.resolvedLocation?.pathname ?? state.location.pathname,
  });

  const previousPathname = useRef(pathname);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (pathname === previousPathname.current) {
      return;
    }

    previousPathname.current = pathname;

    if (!reducedMotion) {
      const animation = animate(scope.current, { opacity: [0.94, 1] }, { duration: 0.15 });

      return () => animation.complete();
    }
  }, [animate, pathname, reducedMotion, scope]);

  return (
    <Box ref={scope}>
      <Outlet />
    </Box>
  );
}

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
