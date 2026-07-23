import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset paths: works from a plain static host, and keeps the
  // door open for wrapping dist/ in Electron (Steam) or Capacitor
  // (Android) later, both of which load the build from file:// or a
  // custom scheme rather than a domain root. See docs/ROADMAP.md.
  base: "./",
  build: {
    outDir: "dist",
  },
});
