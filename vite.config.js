import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset paths: works from a plain static host, and keeps the
  // door open for wrapping dist/ in Electron (Steam) or Capacitor
  // (Android) later, both of which load the build from file:// or a
  // custom scheme rather than a domain root. See docs/ROADMAP.md.
  base: "./",
  build: {
    outDir: "dist",
    rollupOptions: {
      // Vite solo empaqueta index.html por defecto -- tools/level-editor/ es
      // una segunda página independiente (propio HTML/JS/CSS, sin relación
      // con src/main.js) y hay que declararla aquí explícitamente o el botón
      // "Editor de niveles" del menú da 404 en el build de producción.
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        editorNiveles: fileURLToPath(
          new URL("./tools/level-editor/index.html", import.meta.url),
        ),
        masterEditor: fileURLToPath(
          new URL("./tools/master-editor/index.html", import.meta.url),
        ),
      },
    },
  },
});
