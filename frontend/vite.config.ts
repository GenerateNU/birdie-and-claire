import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // The router plugin has to run before the React plugin.
  plugins: [
    tanstackRouter({ target: "react" }),
    react(),
    {
      // Matches the redirect in vercel.json, so /docs opens the backend's own docs page.
      name: "redirect-docs",
      configureServer(server) {
        server.middlewares.use("/docs", (_req, res) => {
          res.writeHead(302, { Location: "http://localhost:8080/docs" });
          res.end();
        });
      },
    },
  ],
  resolve: {
    alias: { "@": "/src" },
  },
  server: {
    proxy: {
      // Proxy API requests to the Go backend.
      "/api": "http://localhost:8080",
    },
  },
});
