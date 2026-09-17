import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API requests to the Go backend.
      "/api": "http://localhost:8080",
    },
  },
});
