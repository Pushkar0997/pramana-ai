<div align="center">

# प्रमाण · Pramana AI

### The self-healing audit layer for revenue-critical checkout flows.

**Paste any URL → perception → quantified revenue leak → AST-verified fix → merged PR.**

[![Spec Gate](https://img.shields.io/badge/spec__lint-passing-34D399?style=flat-square&labelColor=090A0F)](./scripts/spec_lint.py)
[![Zero Budget](https://img.shields.io/badge/infra-%240.00%20zero--budget-22D3EE?style=flat-square&labelColor=090A0F)](./CONTRACT.md)
[![Google DeepMind](https://img.shields.io/badge/Google%20DeepMind-%C3%97%20Antigravity-4285F4?style=flat-square&labelColor=090A0F)](./spec/architecture.md)
[![Team Vimarsha](https://img.shields.io/badge/team-Vimarsha-FBBF24?style=flat-square&labelColor=090A0F)](./BRIEF.md)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&labelColor=090A0F)](./package.json)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&labelColor=090A0F)](./vite.config.js)
[![Vercel](https://img.shields.io/badge/deploy-Vercel%20Free-000000?style=flat-square&labelColor=090A0F)](./vercel.json)

**Startup Buildathon India 2026** · Team Vimarsha · *Pramana* (Sanskrit) — *verifiable proof*

</div>

---

## 🔗 Live Interactive Surfaces

Four browser surfaces, one zero-budget deployment. Every link below is a real, judge-clickable artifact — no login, no SDK, no install.

| Route | Surface | What judges can do | Source |
|---|---|---|---|
| `/` | **Split-Brain Autonomous QA Command Center & Outreach Studio** | Paste any URL, run the 4-step autonomous audit, inspect the live `/api/health` cascade router, expand the **ADR-006 Quota Cascade Matrix**, and copy the proof-first cold email | [`src/App.jsx`](./src/App.jsx) |
| `/demo-store/index.html` | **Live Buggy ZestKart Target Storefront** (with embedded `/orb.js`) | Toggle S1 Hindi overflow, S2 UPI 504, S3 dark-mode dead-click; speak into the cyan voice orb; watch `?fixed=false` → **HTTP 504** vs `?fixed=true` → **HTTP 200** | [`public/demo-store/index.html`](./public/demo-store/index.html) |
| `/proof/index.html?id=142` | **Shareable Zero-Auth Founder Proof Portal** | Open the standalone CTO proof page: replay, network trace, ready-to-merge PR #142 and ROI math | [`public/proof/index.html`](./public/proof/index.html) |
| `/deck/index.html` | **Interactive 8-Slide Startup Buildathon Pitch Deck** | Click through the pitch narrative and export a **1-click `<5 MB` PDF** for the submission form | [`public/deck/index.html`](./public/deck/index.html) |

---

## Contents

1. [The Problem](#1-the-problem)
2. [The Product — 3 Screens](#2-the-product--3-screens)
3. [Architecture — 4 Tiers, $0.00](#3-architecture--4-tiers-000)
4. [Free-Tier Quota Cascade Router](#4-free-tier-quota-cascade-router)
5. [Benchmark — `Pramana-Bench-v1`](#5-benchmark--pramana-bench-v1)
6. [Unit Economics](#6-unit-economics)
7. [Spec-Driven Governance](#7-spec-driven-governance)
8. [Quickstart](#8-quickstart)
9. [Repository Map](#9-repository-map)

---

## 1. The Problem

QA tooling automates *execution*. It never automated **judgement** — deciding what is broken, why it costs money, and what the fix is. The gap is measured in engineer-hours and lost revenue.

### Global: the selector fragility tax

| Metric | Reality |
|---|---|
| **35%** | of every sprint spent authoring and repairing brittle Playwright/CSS/XPath tests |
| **78%** | of customer bug tickets are unreproducible — no device state, no trace, no DOM snapshot |
| **0** | revenue metrics in a green CI run that ships a 2.1:1 contrast CTA |

Existing tests assert the DOM the author *imagined*. They pass while the primary button sits 48px below the fold, invisible behind a scrim, or renders a clipped Hindi label.

### India: mobile, vernacular, and UPI checkout leaks

| Failure class | Trigger | Revenue impact |
|---|---|---|
| **Viewport overlap** | `390×844` iPhone 15 · throttled Jio 4G · sticky pay bar slides under the trust banner after a coupon | **11–18%** conversion loss |
| **Devanagari clipping** | Hindi (`hi-IN`) labels in `flex-nowrap` / `whitespace-nowrap` | **11–18%** conversion loss |
| **UPI 504 webhook race** | `payment.captured` lands ~212ms before `order.created` → `OrderNotFound` → poller waits on a 504 forever | Money debited, order absent, chargeback risk |
| **Dark-mode dead click** | `#4A4F63` on `#1C2030` = 2.1:1; invisible promo scrim intercepts `Place order` | Silent drop-off, zero error telemetry |

**Why current tools miss all of it:** Playwright asserts a DOM. BrowserStack rents a device. Sentry reports a stack trace. **None of them return a patch.**

---

## 2. The Product — 3 Screens

```
┌──────────────────────────────┐   ┌──────────────────────────────────────────────┐
│ ① ZERO-AUTH AUDIT BAR        │   │ ② SPLIT-BRAIN COMMAND CENTER                 │
│                              │   │                                              │
│  paste URL  ──────────────►  │   │  ┌── THE EYES ────────┬── THE BRAIN ───────┐ │
│  S1_HINDI_OVERFLOW           │   │  │ Gemini Omni vision │ Leak telemetry     │ │
│  S2_UPI_TIMEOUT              │   │  │ Nano Banana patch  │ 4/4 skills trace   │ │
│  S3_DARKMODE_CONTRAST        │   │  │ Gemini Live orb    │ PR diff + merge    │ │
│                              │   │  └────────────────────┴────────────────────┘ │
│  ≤ 3 clicks · no login       │   │  every card collapsible, every stage timed   │
└──────────────────────────────┘   └──────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ ③ PROOF-FIRST COLD OUTREACH STUDIO                                             │
│                                                                                │
│   pramana.dev/proof/{brand}-{pr}   ·  zero login  ·  zero SDK                  │
│   ├── 12s session replay + HAR trace + confidence score                        │
│   ├── ROI calculator (recovered revenue / month, ₹ and $)                      │
│   └── 1-click cold email, auto-personalised to the audited brand               │
└────────────────────────────────────────────────────────────────────────────────┘
```

**The chain never breaks:** *evidence → quantified leak → diff → PR.* A CTO who does not trust us can still verify every step in 30 seconds — that is the entire growth loop.

| Screen | What it proves | Invariant |
|---|---|---|
| Zero-Auth Audit Bar | Value before identity | `INV-02` |
| Split-Brain Command Center | Perception ≡ reality, with receipts | `INV-03`, `INV-05` |
| Proof-First Outreach | The audit is the sales pitch | `INV-06` |

> **Live demo:** `npm run dev` → `#command` / `#outreach`, or open the dependency-free [`public/standalone-demo.html`](./public/standalone-demo.html).

---

## 3. Architecture — 4 Tiers, $0.00

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ TIER 0 · INGESTION & EXPERIENCE                         INV-01 · INV-02      │
│ Vercel Free Tier / GitHub Pages                                               │
│   • Zero-Auth Audit Bar        → paste URL, ≤3 clicks to verdict             │
│   • Split-Brain Command Center → The Eyes ‖ The Brain                        │
│   • Proof-First Outreach Studio→ pramana.dev/proof/{brand}-{pr}              │
└───────────────────────────────────┬───────────────────────────────────────────┘
                                    │  AuditRequest { url, spec_id }   INV-08
┌───────────────────────────────────▼───────────────────────────────────────────┐
│ TIER 1 · PERCEPTION & TRIAGE                    Google AI Studio Free Tier   │
│   • Gemini Omni → multimodal visual DOM, occlusion, overflow, contrast       │
│   • Gemini Live → real-time voice + screen capture (hi-IN / en-IN)           │
│   • Gemma       → HAR + console pruning, root-cause clustering (25k → 1.2k)  │
│                                                                              │
│   Zero selectors: perception = pixels ∪ ARIA tree ∪ runtime evidence  INV-03 │
└───────────────────────────────────┬───────────────────────────────────────────┘
                                    │  Finding[] (schema-validated)    INV-08
┌───────────────────────────────────▼───────────────────────────────────────────┐
│ TIER 2 · ORCHESTRATION & SELF-HEALING                                        │
│   • Google Antigravity  → repo AST dependency map + blast radius             │
│   • Google Agent Skills → 4 deterministic primitives, 0 LLM in repro:        │
│                           BrowserSandboxSkill · TraceCorrelatorSkill         │
│                           ASTBlastRadiusSkill · GitPatchSkill                │
│   • Nano Banana         → before/after visual UI patch synthesis             │
│   • Lyria               → accessible audio cues for captured reports         │
│                                                                              │
│   Patch gates: existence → AST parse → imports → types → blast  INV-04       │
│   → branch isolation, else PATCH_REJECTED (never a partial diff)             │
└───────────────────────────────────┬───────────────────────────────────────────┘
                                    │  PRProposal { branch, diff, ast_proof }
┌───────────────────────────────────▼───────────────────────────────────────────┐
│ TIER 3 · COMPUTE, STATE & EGRESS                              INV-07 · INV-09│
│   • Ephemeral Playwright: cold context, cleared storage, read-only default,  │
│     30s nav / 120s audit timeout, unconditional --rm teardown                │
│   • Runners: GitHub Actions · HF Spaces (Free Docker) · local                │
│   • State: Firebase Spark (Firestore) / local JSON store                     │
│   • Egress: isolated pramana/fix-* branch + PR via GitHub App                │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Token pruning (the cost engine).** Gemma discards 95.2% of raw context *before* any expensive tier sees a token:

```
T_pruned = T_raw × (1 − ρ_prune)
         = 25,000 × (1 − 0.952)
         = 1,200 tokens                    → 95.2% reduction

cost_audit = Σ_tiers (tokens_i × price_i) ≤ $0.025          (INV-06)
free tier  → $0.00                                          (INV-01)
```

Full detail: [`spec/architecture.md`](./spec/architecture.md).

---

## 4. Free-Tier Quota Cascade Router

Cheapest-capable-first. Escalation is **evidence-triggered** (low confidence, ambiguous geometry, AST rejection) — never speculative. Quota exhaustion is a *routing* event, never a billing event.

| # | Model / Surface | Free-Tier Quota | Role | Escalates when |
|---|---|---|---|---|
| 1 | **Gemini 3.8 Live** | **Unlimited RPD** | Voice + screen capture, orb dialogue | intent unclear after 2 turns |
| 2 | **Gemma 4 31B** | **14.4K RPD** | HAR/console pruning, root-cause clustering | evidence unstable (n < 3) |
| 3 | **Gemini Decision 1** | **10K RPD** | Router: pick skills, emit typed plan | confidence < 0.80 |
| 4 | **Gemini 3.5 Flash Lite** | **500 RPD** | Bulk vision triage, secondary viewports | layout anomaly < 0.85 |
| 5 | **Antigravity** | **100 RPD** | AST blast radius + patch synthesis + `ast-check` | patch rejected by lint/typecheck |
| 6 | **Gemini 4 Hydrogen** / **3.8 Flash** | **20 RPD** | Reserved: ambiguous geometry, contested verdicts | budget exhausted → degrade + label |

Rationale and trade-offs: [`ADR-006`](./spec/decisions.md). Every audit records `tier_used`, `escalations`, `tokens_in/out`, `cost_usd` — asserted from the ledger, never estimated.

---

## 5. Benchmark — `Pramana-Bench-v1`

Pre-registered **before** the live pipeline exists, so every claim is falsifiable. Results are reported as-is; a failing gate fails the release.

| Scenario ID | Fixture | Ground truth | Gate |
|---|---|---|---|
| **`S1_HINDI_OVERFLOW`** | iPhone 15 · Safari 17 · Jio 4G · `hi-IN` · `390×844` · coupon applied | 3 defects — sticky-CTA overlap, trust-strip click interception, 118px Devanagari clip | P / R / F1 ≥ 0.92 |
| **`S2_UPI_TIMEOUT`** | iPhone 15 · Safari iOS 17.5 · 5G · UPI intent | 3 defects — 212ms webhook race, `504` @ 30,012ms, infinite spinner + 4 retries | P / R / F1 ≥ 0.92 |
| **`S3_DARKMODE_CONTRAST`** | MacBook · Chrome 126 · dark mode · `1440×900` | 2 defects — 2.1:1 contrast, scrim-intercepted dead clicks (41%) | P / R / F1 ≥ 0.92 |

**Also gated:** simulated latency ≤ 3.5s · live p95 ≤ 45s · cost ≤ $0.025/audit · AST pass rate 100% · fabricated-symbol rate 0% · reproduction determinism 3/3 · `$0.00` free tier.

Scoring protocol (IoU ≥ 0.50 or exact `(category, component)` match, worst-of-3 runs): [`spec/evals.md`](./spec/evals.md).

---

## 6. Unit Economics

| Line | Value |
|---|---|
| Blended infra cost / audit | **$0.024** |
| Cost on buildathon tier | **$0.00** (`INV-01`) |
| Modeled gross margin | **86%** |
| Marginal cost @ >100k audits/mo | **< $0.015** |
| Detection accuracy target | **≥ 0.92** F1 |
| Cost to find + fix one leak | **$0.024** vs **~$18,400/mo** recovered (`S1`) |

| Tier | Segment | Price | Buyer | Win condition |
|---|---|---|---|---|
| **1** | Global B2B SaaS (Series A–C) | **$299–$699/mo** | CTO / VP Eng | Replaces the selector-maintenance backlog |
| **2** | Indian D2C & ONDC | **$199–$499/mo** | Growth / Product | Recovered revenue > 12 months of Pramana in one quarter |
| **3** | FinTech & payments | **$899+/mo** | CISO / Head of Payments | Deterministic evidence trail + reviewable AST-verified patches |

**Distribution:** proof-first cold outreach — audit a public checkout, send `pramana.dev/proof/{brand}-{pr}`. Marginal cost per prospecting touch ≈ $0.024, so outbound is not budget-constrained. Detail: [`BRIEF.md`](./BRIEF.md) §5.

---

## 7. Spec-Driven Governance

This repository is **spec-first**: code is downstream of the contract, and the contract is enforced by a script, not by good intentions.

| Document | Authority | Contents |
|---|---|---|
| [`BRIEF.md`](./BRIEF.md) | Product | Executive thesis, quantified problem, ICP, growth loop, moat, milestones |
| [`CONTRACT.md`](./CONTRACT.md) | **Normative** | `INV-01 … INV-10` with enforcement + verification per invariant |
| [`AGENTS.md`](./AGENTS.md) | Agent ops | Pre-flight read order for humans and coding agents |
| [`spec/product.md`](./spec/product.md) | Product | 3-view experience, personas, audit state machine |
| [`spec/architecture.md`](./spec/architecture.md) | Engineering | 4-tier diagram, 8 stack surfaces, pruning math, cascade router |
| [`spec/decisions.md`](./spec/decisions.md) | Engineering | `ADR-001 … ADR-007` incl. multi-tier quota cascade |
| [`spec/evals.md`](./spec/evals.md) | Quality | `Pramana-Bench-v1`, P/R/F1 ≥ 0.92, latency + cost gates |
| [`spec/tasks.md`](./spec/tasks.md) | Delivery | Active task board (`T-*`) |
| [`spec/smoke.md`](./spec/smoke.md) | QA | `SMK-01 … SMK-06` pre-commit checklist |
| [`spec/plan.md`](./spec/plan.md) | Delivery | Phase plan through the Bengaluru finale |
| [`AGENT_LOG.md`](./AGENT_LOG.md) | Audit trail | Timestamped, task-tagged execution log |

### The ten invariants

| ID | Invariant |
|---|---|
| `INV-01` | **$0.00** zero-budget free-tier infrastructure — no card-backed billing anywhere |
| `INV-02` | Zero-auth, **≤ 3 clicks** to a full verdict |
| `INV-03` | **Zero-selector** perception — pixels ∪ ARIA tree ∪ runtime evidence |
| `INV-04` | **Zero-hallucination** AST-verified patches; PRs only, never direct pushes |
| `INV-05` | Mandatory stack: Google AI Studio · Antigravity · Agent Skills · Gemini Omni · Gemini Live · Gemma · Nano Banana · Lyria |
| `INV-06` | Hybrid cascade routing **≤ $0.025 / audit** |
| `INV-07` | Latency SLAs: simulated **≤ 3.5s**, live **≤ 45s** p95 |
| `INV-08` | Deterministic JSON schema at every stage — prose is not an API |
| `INV-09` | Stateless ephemeral sandbox isolation, read-only by default |
| `INV-10` | Spec-first discipline: task → lint → smoke → log → PR |

**Enforcement pipeline:** `python scripts/spec_lint.py` (required docs present, zero-budget declared, task IDs well-formed) runs locally, via `.githooks/`, and in CI. A red gate blocks the merge.

---

## 8. Quickstart

```bash
# 1 · install (Node 18+)
npm install

# 2 · run the Command Center locally  →  http://localhost:5173
npm run dev

# 3 · production build  →  ./dist   (Vercel: framework = Vite, output = dist)
npm run build && npm run preview

# 4 · spec gate  (must print "spec lint passed")
python scripts/spec_lint.py
```

**Views:** `#command` — Split-Brain Command Center · `#outreach` — Proof-First Outreach Studio.

**Zero-dependency fallback:** open [`public/standalone-demo.html`](./public/standalone-demo.html) directly in a browser — no build, no network, no install.

**Deploy (Free Tier):** import the repo → framework **Vite** → build `npm run build` → output `dist`. [`vercel.json`](./vercel.json) rewrites all paths to `index.html` so hash routes deep-link.

---

## 9. Repository Map

```
pramana-ai/
├── BRIEF.md                 # executive thesis, ICP, unit economics
├── CONTRACT.md              # INV-01 … INV-10 (normative)
├── AGENTS.md · CLAUDE.md    # operating instructions for agents
├── AGENT_LOG.md             # timestamped, task-tagged audit trail
├── README.md                # this file
├── vercel.json              # SPA rewrite → index.html
├── index.html               # Vite entry
├── src/                     # App.jsx · main.jsx · index.css (Tailwind theme)
├── public/
│   └── standalone-demo.html # zero-dependency single-file demo
├── scripts/
│   └── spec_lint.py         # mechanical spec gate
└── spec/
    ├── product.md · plan.md · tasks.md · smoke.md
    ├── architecture.md · decisions.md · evals.md
```

---

<div align="center">

**Pramana** — we don't ask you to trust the demo. **We give you the diff.**

Built by **Team Vimarsha** · Startup Buildathon India 2026 · Pune → Bengaluru

*Operating cost: $0.00. Pre-registered F1: ≥ 0.92. Patch discipline: AST-verified, PR-only.*

</div>
