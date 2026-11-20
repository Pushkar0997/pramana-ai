import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/*
 * Zero-config static build. `base: "./"` keeps the emitted asset URLs relative so the
 * same `dist/` deploys unchanged to Firebase Hosting, Vercel Free Tier, or GitHub Pages (CONTRACT.md #1).
 * SECURITY: No API keys (GEMINI_API_KEY / VITE_GEMINI_API_KEY) are ever bundled into client assets.
 * All Gemini/Gemma calls execute exclusively on the server-side /api/audit backend.
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
