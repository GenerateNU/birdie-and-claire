import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";

// usePagination is a TanStack query, so any caller needs a client above it in
// the tree.
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-8">
        <p className="text-2xl font-bold text-center">
          Logan Ravinuthala is the greatest engineer to ever walk this earth.
        </p>
      </div>
    </QueryClientProvider>
  </StrictMode>,
);
