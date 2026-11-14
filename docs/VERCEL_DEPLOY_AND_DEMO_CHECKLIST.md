# Pramana AI — Vercel Deployment & Jury Demo Checklist

## 1. 1-Click Vercel Deployment Settings
* **Framework Preset:** `Vite`
* **Build Command:** `npm run build`
* **Output Directory:** `dist`
* **Optional Environment Variable:** `GEMINI_API_KEY` (Google AI Studio Free Tier key).  
  * *Note:* When `GEMINI_API_KEY` is unset or rate-limited (`HTTP 429`), all `/api/*` endpoints automatically fall back in `<50ms` to deterministic `Pramana-Bench-v1` fixtures (`ADR-004`).

---

## 2. Pre-Submission Live URL Verification Matrix
Verify each route returns HTTP `200` after Vercel deployment:

| Surface / Endpoint | Expected Behaviour |
| :--- | :--- |
| `/` | Split-Brain Command Center + `LiveTelemetryStrip` + `[Run Autonomous Audit ⚡]` |
| `/demo-store/index.html` | Interactive ZestKart Checkout with `S1_HINDI_OVERFLOW`, `S2_UPI_TIMEOUT`, `S3_DARKMODE_CONTRAST` & `/orb.js` |
| `/proof/index.html?id=142&brand=ZestKart` | Shareable Founder Proof Portal with Before/After diff & `[Copy Git Patch (.diff)]` |
| `/deck/index.html` | Interactive 8-Slide Pitch Deck (`←` / `→` nav) |
| `/api/health` | HTTP `200` JSON showing active Google AI Studio Free-Tier Cascade Router |

---

## 3. Exporting the `< 5 MB` PDF Deck in 10 Seconds
1. Open `/deck/index.html` in Chrome or Edge.
2. Click **`🖨️ Export 8-Slide PDF (< 5 MB)`** in the top control bar.
3. Choose **Destination: Save as PDF** (Layout: Landscape, Margins: None, Background graphics: On) — exports an 8-page widescreen `16in × 9in` PDF under `1 MB`.

---

## 4. CLI Live Demo Command
```bash
python scripts/generate_outreach_proof.py \
  --url https://checkout.zestkart.in/v2/payment \
  --scenario S1_HINDI_OVERFLOW
```
