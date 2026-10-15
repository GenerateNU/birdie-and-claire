import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // The router plugin has to run before the React plugin.
  plugins: [tanstackRouter({ target: "react" }), react()],
  resolve: {
    alias: { "@": "/src" },
  },
  server: {
    proxy: {
      // Proxy API requests to the Go backend.
      "/api": "http://localhost:8080",
      // The docs page loads the spec from /openapi.json.
      "/docs": "http://localhost:8080",
      "/openapi.json": "http://localhost:8080",
    },
  },
});
