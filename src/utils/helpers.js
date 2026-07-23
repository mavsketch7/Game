// Auto-generated during the modularization refactor (2026-07-23).

export const rnd = (a, b) => a + Math.random() * (b - a);

export const ri = (a, b) => Math.floor(rnd(a, b + 1));

export const az = (a) => a[Math.floor(Math.random() * a.length)];

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function lighten(hex, amt) {
        const n = parseInt(hex.slice(1), 16);
        if (isNaN(n)) return hex;
        let r = (n >> 16) + amt,
          g = ((n >> 8) & 0xff) + amt,
          b = (n & 0xff) + amt;
        r = r < 0 ? 0 : r > 255 ? 255 : r;
        g = g < 0 ? 0 : g > 255 ? 255 : g;
        b = b < 0 ? 0 : b > 255 ? 255 : b;
        return (
          "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
        );
      }
