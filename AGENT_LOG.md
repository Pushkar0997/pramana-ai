# Pramana AI (प्रमाण) — Spec-Driven Engineering & Agent Audit Log (`AGENT_LOG.md`)

**Project:** Pramana AI — Autonomous Multimodal QA, Conversion-Leakage Detection & Self-Healing Engineering Agent  
**Team:** Team Vimarsha (Pushkar Kumar) · Startup Buildathon India 2026 (Google DeepMind × Google Cloud)  
**Repository:** `https://github.com/Pushkar0997/pramana-ai`  
**Live Deployment:** `https://pramana-ai-eta.vercel.app/`

---

## 1. Architectural Modes & Honesty Boundaries (Updated 15 Nov 2026)

To prevent any gap between product claims and runtime behavior, Pramana AI explicitly separates its two execution modes in both the `/api/audit` response payload (`auditMode`) and the top UI banner:

1. **`LIVE_PUBLIC_HTML_SCRAPE` (Unauthenticated External URLs — e.g. `google.com`, `github.com`, `example.com`):**
   - **What it does:** Performs a real server-side HTTP `GET` of the public HTML (`api/audit.js`), classifies the page surface (`classifyPageSurface`), detects auth walls / `403` / CAPTCHA / client-only SPA shells (`detectAuditLimitations`), and audits static DOM nodes, `<form>`/`<input>` accessibility labels, `<img>` `alt` attributes, and viewport meta tags.
   - **What it refuses to fabricate:**
     - **No invented revenue or conversion-drop numbers:** `revenueMetricApplicable: false`, `conversionDropPct: null`, `leakedMonthlyUsd: null`.
     - **Calibrated Severity (`PASS` / `LOW` / `MEDIUM` / `HIGH` / `CRITICAL` / `UNVERIFIED`):** Clean static pages (`example.com`) return `PASS` (`99/100`); search/developer portals (`google.com`, `github.com`) return `LOW` or `MEDIUM` for minor markup notes—never false `CRITICAL` alarms.
     - **No fake PR merges:** Because no GitHub repository is connected for an arbitrary public URL, `prAvailable: false` (`remediationType: "SUGGESTED_DOM_CSS_SNIPPET_ONLY"`). The UI provides a copyable HTML/CSS snippet rather than a fake "Merge PR" button.
2. **`BENCHMARK_FIXTURE` (Connected Sandbox Storefronts — `S1_HINDI_OVERFLOW`, `S2_UPI_TIMEOUT`, `S3_DARKMODE_CONTRAST`):**
   - **What it does:** Demonstrates Pramana's full end-to-end connected pipeline when installed on a merchant's staging environment + GitHub repository: isolated mobile/desktop viewport reproduction, HAR network waterfall correlation, AST blast-radius verification (`INV-04` whitelist: `StickyPaymentBar.tsx`, `upiConfirm.ts`, `PlaceOrderButton.tsx`), and sandbox PR simulation.

---

## 2. Chronological Engineering Log (13 Nov 2026 – 15 Nov 2026)

### Phase 1–6: Foundation, Multi-Surface Architecture & Release Candidate (`PR #1` – `PR #6`)
- **PR #1 (`0d5ec0d`):** Implemented `QuotaAwareRouter` (`ADR-006`), `auditReportValidator.js` (`INV-08`), `public/orb.js` (Web Speech API + Web Audio `Lyria` cues), FastAPI backend skills (`BrowserSandboxSkill`, `TraceCorrelatorSkill`, `ASTBlastRadiusSkill`, `GitPatchSkill`), and `tests/test_pramana_bench.py`.
- **PR #2 (`4c4dd95`):** Added Vercel Serverless functions (`api/health.js`, `api/audit.js`), `public/demo-store/index.html` interactive buggy storefront, and `OmniVisionVirtualizer`.
- **PR #3 (`81a74e5`):** Configured `vercel.json` multi-route priority and Hugging Face Spaces Docker manifest (`backend/README.md`).
- **PR #4 (`2fd355f`):** Added `src/hooks/useLiveAudit.js`, `src/components/LiveTelemetryStrip.jsx`, `public/proof/index.html`, and CLI outreach proof generator (`scripts/generate_outreach_proof.py`).
- **PR #5 (`856c22a`):** Added `api/upi/confirm.js` (real HTTP `504` vs `200` race simulator), `api/telemetry.js`, `api/patch.js` (`INV-04` whitelist enforcement), and `public/deck/index.html`.
- **PR #6 (`0d24be8`):** Added cross-surface contract test suite (`tests/test_end_to_end_contracts.py`) and OpenGraph/PWA metadata.

### Phase 7: Editorial Broadsheet UI Restoration & Live Custom-URL Scraper (`88fac6f`, `e845046`)
- Restored the light-paper Editorial Broadsheet design (`--paper: #F6F7FB`, `Bodoni Moda` + `Hanken Grotesk` + `JetBrains Mono`) in `src/App.jsx` and `public/proof/index.html`.
- Removed internal founder outreach email tabs and header redirect clutter; converted the Verifiable Audit Certificate into an in-page broadsheet view.

### Phase 8: Full Product Stress-Test Remediation — P0/P1/P2 Honesty, API Contract & Abuse Protection (15 Nov 2026)
- **P0.1 API Payload Contract Alignment (`api/audit.js` + `src/hooks/useLiveAudit.js`):**
  - Updated `/api/audit` to accept `url`, `target_url`, `targetUrl`, `site`, and `domain` across both `POST` JSON bodies and `GET` query parameters, eliminating silent fallback to ZestKart when callers pass `target_url`.
- **P0.2 Zero Fabricated Revenue/Conversion Metrics on Non-Checkout Sites:**
  - Set `conversionDropPct: null`, `dropNumber: null`, `leakedMonthlyUsd: null`, and `revenueMetricApplicable: false` for all public HTML scrapes (`google.com`, `github.com`, `example.com`, etc.).
- **P0.3 Explicit Execution Mode Badges:**
  - Added `auditMode: "LIVE_PUBLIC_HTML_SCRAPE" | "BENCHMARK_FIXTURE"` in API responses and a top-level status banner in `src/App.jsx`.
- **P0.4 Severity Calibration:**
  - Calibrated severity to actual defect counts (`example.com` → `PASS` `99/100`; `google.com` → `LOW` `94/100`; `github.com` → `MEDIUM` `88/100`; `CRITICAL` reserved strictly for broken payment/checkout flows).
- **P1.6 / P1.7 Honest Remediation Mode:**
  - Disabled fake PR numbers and fake "Merge PR" buttons on unconnected public URLs; replaced with copyable HTML/CSS snippets (`SUGGESTED_DOM_CSS_SNIPPET_ONLY`).
- **P2.9 / P2.10 / P2.11 Edge-Case & Abuse Protection:**
  - Added `detectAuditLimitations()` for HTTP `401`/`403` auth walls, Cloudflare/CAPTCHA challenges, and client-rendered SPA shells.
  - Added sliding-window IP rate limiting (`30 req / 60s` with `X-RateLimit-*` headers) and SSRF host validation blocking loopback/private network ranges.
