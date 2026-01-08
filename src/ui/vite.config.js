import { defineConfig } from "vite";

export default defineConfig({
  // Base path para quando servido sob /admin/
  base: "/admin/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/admin/api": "http://localhost:3000",
    },
  },
});
