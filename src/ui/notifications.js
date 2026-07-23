// Auto-generated during the modularization refactor (2026-07-23).
import { G } from "../core/state.js";

export function banner(txt) {
        G.banner = { txt, t: 2.2 };
      }

export function toast(txt, col) {
        G.toasts.unshift({ txt, col: col || "#e9e3d5", t: 3.2 });
        if (G.toasts.length > 5) G.toasts.pop();
      }
