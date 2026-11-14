import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, ErrorComponent, RouterProvider } from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@/index.css";
import "@/api/client";
import { ToastProvider } from "@/design-system";
import { routeTree } from "@/routeTree.gen";
import { supabase } from "@/lib/supabase";

// Pages show a fixed message for what failed, so the error itself is only logged.
function logError(error: Error) {
  console.error(error);
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: logError }),
  mutationCache: new MutationCache({ onError: logError }),
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  // Without a default, a crash in any page would bubble up to the account error screen.
  defaultErrorComponent: ErrorComponent,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

let signedInUserId: string | undefined;

// Only SIGNED_OUT, not every null session: INITIAL_SESSION is also null for signed-out
// visitors, and reloading on it would send them from the not-found page to /login.
// The full reload drops every cached query, so the next user starts clean.
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    window.location.replace("/login");

    return;
  }

  const userId = session?.user.id;

  // Another tab signed in as someone else. Reload so this tab drops the previous user's cache.
  if (signedInUserId !== undefined && userId !== undefined && userId !== signedInUserId) {
    window.location.reload();

    return;
  }

  signedInUserId = userId;
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.15, ease: "easeOut" }}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>,
);
