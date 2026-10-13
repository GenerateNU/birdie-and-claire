import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, ErrorComponent, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import { ToastProvider } from "@/design-system";
import { routeTree } from "@/routeTree.gen";
import { supabase } from "@/supabase/client";

const queryClient = new QueryClient();

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

// Only SIGNED_OUT, not every null session: INITIAL_SESSION is also null for signed-out
// visitors, and reloading on it would send them from the not-found page to /login.
// The full reload drops every cached query, so the next user starts clean.
supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") {
    window.location.replace("/login");
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
