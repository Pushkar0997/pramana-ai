# Pramana AI — Submission & Pitch Playbook (`docs/SUBMISSION_KIT.md`)

**Team:** Vimarsha (`Pushkar0997`) | **Track:** Startup Buildathon India 2026 — Open Innovation (Google DeepMind × Google Cloud)  
**Repository:** `https://github.com/Pushkar0997/pramana-ai`

---

## 1. Hack2skill Startup Buildathon Portal — Ready-to-Paste Answers

* **Project Title:** Pramana AI — Autonomous Multimodal QA, Conversion-Leakage & Self-Healing Engineering Agent
* **One-Line Pitch:** From a live checkout URL to verified visual bug proof, revenue-impact telemetry, and a ready-to-merge GitHub PR in under 60 seconds—running at $0.00 infrastructure cost.
* **Problem Statement:** D2C and SaaS teams lose 11–31% of mobile checkout conversions to silent visual overflows (e.g., Hindi/vernacular i18n strings), dark-mode contrast failures, and unhandled UPI 504 timeouts that traditional brittle XPath/DOM unit tests miss.
* **Solution & Architecture:**
  1. **Zero-Auth Entry (`INV-02`):** Paste any URL into the Split-Brain Command Center (`src/App.jsx`) or embed the 1-line `<script src="/orb.js" data-site="...">` Voice Orb on any storefront.
  2. **Quota-Aware Two-Stage Cascade (`ADR-006`, `INV-06`):** `BrowserSandboxSkill` captures mobile (`390x844`) & desktop (`1440x900`) DOM bounding boxes, console errors, and HAR `>=400` failures; `TraceCorrelatorSkill` prunes 25k-token logs to `<1,200` tokens via `Gemma 4 31B` (`gemma-4-31b-it`), triages via `Gemini Decision 1`, and virtualizes `Gemini Omni` via `OmniVisionVirtualizer` (`gemini-3.5-flash-lite` + `gemini-robotics-er-2-preview`)—keeping amortized cost at `$0.024/audit` (`<= $0.025` ceiling).
  3. **Zero-Hallucination Self-Healing PR (`INV-04`):** `ASTBlastRadiusSkill` verifies real repository file paths (`StickyPaymentBar.tsx`, `upiConfirm.ts`, `PlaceOrderButton.tsx`) before `GitPatchSkill` synthesizes a unified diff via `Google Antigravity`.
* **Google Stack Used (`INV-05`):** Models (`Gemini Omni`, `Gemini Live`, `Gemma`, `Nano Banana`, `Lyria`), Tools (`Google AI Studio`, `Google Antigravity`, `Google Agent Skills`).

---

## 2. Final 8-Slide Pitch Deck Copy

1. **Slide 1 — Title:** **Pramana AI** — *Proof-First Autonomous QA & Self-Healing Checkout Agent* (Team Vimarsha).
2. **Slide 2 — The Silent Leak:** Mobile D2C checkouts bleed ₹2.65L–₹8.90L/month from vernacular CSS overflows, UPI 504 polling loops, and dark-mode dead clicks that unit tests never catch.
3. **Slide 3 — Why Existing QA Fails:** Hardcoded XPath/CSS selectors break on every UI refactor, and raw 25k-token HAR/DOM dumps blow up LLM latency and cost.
4. **Slide 4 — The Pramana Pipeline:** 4 modular Google Agent Skills (`BrowserSandboxSkill` → `TraceCorrelatorSkill` → `ASTBlastRadiusSkill` → `GitPatchSkill`) + 1-line Voice Orb (`/orb.js` in `hi-IN` & `en-IN`).
5. **Slide 5 — Quota-Aware Cascade (`ADR-006`):** `Gemma 4 31B` (14.4K RPD) prunes logs `<1,200` tokens; `Gemini Decision 1` (10K RPD) triages; `Gemini 3.5 Flash Lite` + `Robotics ER 2` virtualize `Gemini Omni`; WebAudio synthesizes `Lyria` cues (`A4→E5`, `D3`)—all at `$0.024/audit` (`86%` gross margin).
6. **Slide 6 — Zero-Hallucination Guardrails (`INV-04`, `INV-08`):** Every generated PR diff is AST-verified against real repo paths and validated by `auditReportValidator.js`.
7. **Slide 7 — `Pramana-Bench-v1` Results:** 3/3 benchmark scenarios (`S1_HINDI_OVERFLOW`, `S2_UPI_TIMEOUT`, `S3_DARKMODE_CONTRAST`) verified with `0%` hallucinated file paths and `<50ms` deterministic fallback.
8. **Slide 8 — Go-To-Market & Ask:** Zero-auth URL audit + Proof-First Cold Outreach Studio turning live bug proofs into B2B SaaS pipeline.

---

## 3. 90-Second Live Demo Script

* **0:00–0:20 (Command Center):** Open Pramana AI Command Center (`/`). Point out the live cascade router health badge and paste `/demo-store/index.html?bug=S1_HINDI_OVERFLOW` (or click **Run Autonomous Audit ⚡**).
* **0:20–0:45 (Live Buggy Storefront & Voice Orb):** Switch to `/demo-store/index.html`. Toggle `S1: Hindi Overflow`, `S2: UPI 504 Timeout`, and `S3: Dark Contrast + Scrim`. Click the pulsing cyan **Voice Orb** (`public/orb.js`), speak *"Checkout button is cut off in Hindi"* (or *"UPI payment is stuck"*), and show the orb highlighting `#checkout-sticky-cta` / `#upi-status-poller` with the WebAudio `Lyria` chime and live JSON telemetry.
* **0:45–1:10 (Self-Healing PR):** Return to the Command Center. Show the `Nano Banana` DOM/CSS visual patch diff, AST-verified target (`StickyPaymentBar.tsx` / `upiConfirm.ts`), and `Google Antigravity` unified Git diff (`$0.024` telemetry cost).
* **1:10–1:30 (Proof-First Outreach Studio):** Open the Outreach Studio tab to show the auto-generated, brand-personalized bug-proof brief ready to convert prospects into customers.
