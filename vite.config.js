import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/*
 * Zero-config static build. `base: "./"` keeps the emitted asset URLs relative so the
 * same `dist/` deploys unchanged to Vercel Free Tier or GitHub Pages (CONTRACT.md #1).
 */
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2020",
  },
});
