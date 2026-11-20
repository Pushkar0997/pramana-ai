import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function resolveGeminiEnvKey() {
  if (process.env.VITE_GEMINI_API_KEY) return process.env.VITE_GEMINI_API_KEY.trim();
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
      for (const line of lines) {
        if (/^\s*(?:VITE_)?GEMINI_API_KEY\s*=/.test(line)) {
          const val = line.split(/=(.*)/s)[1] || "";
          return val.trim().replace(/^["']|["']$/g, "");
        }
      }
    }
  } catch {
    // ignore
  }
  return "";
}

/*
 * Zero-config static build. `base: "./"` keeps the emitted asset URLs relative so the
 * same `dist/` deploys unchanged to Firebase Hosting, Vercel Free Tier, or GitHub Pages (CONTRACT.md #1).
 */
export default defineConfig({
  base: "./",
  plugins: [react()],
  define: {
    "import.meta.env.VITE_GEMINI_API_KEY": JSON.stringify(resolveGeminiEnvKey()),
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2020",
  },
});
