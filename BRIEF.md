# Project Brief: Pramana AI (by Team Vimarsha)

> **Pramana** (Sanskrit: *प्रमाण* — "verifiable proof"). Not a test runner. Not a bug tracker. The audit layer that turns a customer's silent rage-click into a merged, AST-verified pull request.

**One line:** Paste any live URL. Pramana perceives the checkout like a human, quantifies the revenue leaking through it, synthesizes the visual fix, and opens a ready-to-merge GitHub PR — for **$0.00** of infrastructure.

---

## 1. Executive Thesis

Autonomous QA is the last un-automated line item in the software delivery loop. Teams have automated *build*, *test execution*, and *deployment* — but the decision of **what to test, what "broken" looks like, and what the fix should be** still requires a human staring at a screen.

Pramana AI replaces that human-in-the-loop triage with a **multimodal perception → schema-bound triage → AST-verified self-healing** pipeline. The wedge is not "better Playwright." The wedge is that Pramana needs **zero selectors, zero test authoring, and zero auth** to produce evidence an engineer will actually act on:

| Legacy QA | Pramana AI |
|---|---|
| Human authors `.spec.ts` with CSS/XPath selectors | Agent perceives pixels + ARIA tree, no selectors (`INV-03`) |
| Test breaks on every refactor → sprint tax | Nothing to maintain; perception is refactor-invariant |
| Bug ticket = prose + screenshot, 78% unreproducible | Replay + HAR + DOM mutation timeline + confidence score |
| "Here's a failure" | "Here's the failure, the ₹ leak, the diff, and PR #142" |
| Requires a paid browser cloud | $0.00 free-tier stack (`INV-01`) |

**Category we are defining:** *Conversion-Leakage Engineering* — QA measured in recovered revenue, not in test coverage percentage.

---

## 2. The Problem (Quantified)

### 2.1 Global: the selector fragility tax

- **35% sprint tax.** Engineering teams spend roughly a third of every sprint authoring and repairing brittle CSS/XPath selector tests. The work produces no product value; it only defends against regressions the tests themselves introduced.
- **78% of customer bug reports are unreproducible.** Tickets arrive as prose ("checkout is broken on my phone") with no device state, network trace, or DOM snapshot. Triage cost is paid in senior-engineer hours, and the bug is usually closed as `cannot reproduce`.
- **Selector tests assert the DOM, not the experience.** A test can pass while the primary CTA is 48px below the fold, obscured by a z-index regression, or rendered at 2.1:1 contrast. Green CI, dead revenue.

### 2.2 India: the mobile, vernacular, and UPI checkout leak

India is not a "smaller desktop." It is a different failure surface:

| Failure class | Trigger | Revenue impact |
|---|---|---|
| **Viewport overlap** | `390×844` iPhone 15 on throttled Jio 4G; sticky pay bar slides under trust banners after a coupon | **11–18%** checkout conversion loss |
| **Devanagari clipping** | Hindi (`hi-IN`) labels in `flex-nowrap` / `whitespace-nowrap` containers | **11–18%** checkout conversion loss |
| **UPI 504 webhook race** | `payment.captured` arrives ~212ms before `order.created`; handler throws `OrderNotFound`; client polls a 504 that never resolves | Money debited, order absent, support cost + chargeback risk |
| **Dark-mode contrast & dead clicks** | `#4A4F63` on `#1C2030` = 2.1:1; invisible promo scrim intercepts `Place order` | Silent drop-off, zero error telemetry |

**Why existing tools miss it:** Playwright/Cypress assert a DOM the author imagined. BrowserStack gives you a *device*, not a *verdict*. Sentry gives you a *stack trace*, not a *layout overlap*. None of them return a patch.

---

## 3. The Solution — Three Screens, One Proof Chain

1. **Zero-Auth Audit Bar** — paste a URL, or pick a pre-registered scenario (`S1_HINDI_OVERFLOW`, `S2_UPI_TIMEOUT`, `S3_DARKMODE_CONTRAST`). Value in ≤3 clicks, no login (`INV-02`).
2. **Split-Brain Command Center** — *The Eyes* (Gemini Omni live vision, Nano Banana before/after visual patch, Gemini Live customer voice orb with Lyria cues) next to *The Brain* (Gemma revenue-leak telemetry, Google Agent Skills trace, Google Antigravity PR diff).
3. **Proof-First Cold Outreach Studio** — a zero-login proof card at `pramana.dev/proof/{brand}-{pr}`, a live ROI calculator, and a 1-click cold email that auto-personalises to the audited brand.

The chain is deliberately unbroken: **evidence → quantified leak → diff → PR**. Every step is inspectable by a CTO who does not trust us yet.

---

## 4. Ideal Customer Profile

| Tier | Segment | Price | Primary buyer | Pain they already feel | Win condition |
|---|---|---|---|---|---|
| **Tier 1** | Global B2B SaaS (Series A–C, 30–250 eng) | **$299–$699 / mo** | CTO / VP Engineering / Head of Platform | 35% sprint tax on brittle E2E suites; flaky CI erodes trust | Pramana replaces the selector-maintenance backlog and catches what CI passes over |
| **Tier 2** | Indian D2C & ONDC platforms | **$199–$499 / mo** | Growth lead / Head of Product / Founder | 11–18% mobile-and-vernacular checkout loss with no attribution | Recovered revenue per audit exceeds 12 months of Pramana within one quarter |
| **Tier 3** | FinTech & payments infrastructure | **$899+ / mo** | CISO / Head of Payments Engineering | Webhook race conditions, reconciliation gaps, audit evidence for regulators | Deterministic, replayable evidence trail + AST-verified, reviewable patches |

**Beachhead:** Indian D2C checkout flows on mobile web — the pain is acute, quantifiable in rupees, seasonal (festive sale spikes), and reachable without a sales team.

---

## 5. Distribution Wedge — "Proof-First Cold Outreach"

Pramana's GTM is the product. There is no cold pitch, because **the audit is the pitch**.

```
Prospect URL ──► Autonomous audit (no permission needed, public page)
                        │
                        ├─► 12s replay + HAR trace + confidence score
                        ├─► ₹/$ leak estimate for that exact flow
                        └─► Ready-to-merge PR (isolated branch, never main)
                                    │
                                    ▼
                    pramana.dev/proof/{brand}-{pr}   (zero login, zero SDK)
                                    │
                                    ▼
              Cold email: "Found why {Brand} loses ~14.8% of iPhone checkouts"
                                    │
                                    ▼
              CTO verifies every claim in 30s ──► reply rate >> cold outbound
```

Loop properties that make this compound:

- **Marginal cost per prospecting touch ≈ $0.024** (`INV-06`), so outbound volume is not budget-constrained.
- **The proof link is shareable inside the prospect's org** — the CTO forwards it to the engineer, who forwards it to the founder. Distribution is embedded in the artefact.
- **Every reply is a training signal** for which failure classes convert to paid pilots.
- **The PR is the land motion**, not a demo call: we arrive with a fix already written against their repository structure.

---

## 6. Business Model & Unit Economics

| Line | Value | Note |
|---|---|---|
| Blended infra cost / audit | **$0.024** | Free-tier models, cascade-routed (`INV-06`) |
| Cost on the student/buildathon tier | **$0.00** | `INV-01` — no card-backed API anywhere |
| Modeled gross margin | **86%** | At Tier 1 list price, after support + retry overhead |
| Tier 1 ACV | $3,588–$8,388 | $299–$699 × 12 |
| Tier 2 ACV | $2,388–$5,988 | $199–$499 × 12 |
| Tier 3 ACV | $10,788+ | $899+ × 12 |
| Payback | < 1 audit | Recovered revenue on a single 14.8% leak dwarfs the subscription |

Expansion path: seat-based → **audit-volume-based** → **per-repository self-healing CI** (the highest-retention surface, because removing Pramana removes the PRs the team now depends on).

---

## 7. Defensibility

1. **Schema-bound inter-agent protocol (`INV-08`)** — every stage emits validated JSON, so any model can be swapped underneath without re-architecting. Model-agnostic by construction (`ADR-006`).
2. **Benchmark moat** — `spec/evals.md` pre-registers `Pramana-Bench-v1` before the product is finished. Precision/Recall/F1 ≥ 0.92 is a public, falsifiable claim.
3. **Deterministic skill layer** — `BrowserSandboxSkill`, `TraceCorrelatorSkill`, `ASTBlastRadiusSkill`, `GitPatchSkill` are deterministic primitives; the LLM only chooses *which* to run, never *what the result means*.
4. **AST-verified patch discipline (`INV-04`)** — zero-hallucination PRs are the trust primitive. Competitors shipping LLM-generated diffs cannot make this claim without the same verification rig.
5. **Zero-cost floor** — a $0.00 prototype stack means we can out-spend competitors on *prospecting volume* while they pay per browser-minute.

---

## 8. Competitive Landscape

| Alternative | What it does | What it structurally cannot do |
|---|---|---|
| Playwright / Cypress | Deterministic selector assertions | Perceive what a human sees; author itself; return a patch |
| BrowserStack / Sauce | Device + browser matrix | Decide whether the page is *broken* or *ugly-but-shipping* |
| Sentry / Datadog RUM | Runtime error + session telemetry | See a layout overlap or a contrast failure that throws nothing |
| Percy / Chromatic | Visual diffing against baselines | Explain *why* it matters in revenue terms, or fix it |
| Generic LLM browser agents | Ad-hoc navigation | Schema-bound determinism, AST proof, PR hygiene, $0 cost ceiling |
| **Pramana AI** | **Perceive → quantify → patch → PR, $0.00 infra** | — |

---

## 9. Milestones

| Date | Milestone | Status |
|---|---|---|
| Nov 13, 2026 | Spec lock + interactive Command Center on Vercel Free Tier + Round 1 deck | **Shipped** (`T-103`, `T-104`) |
| Nov 20–21, 2026 | Pune City Buildathon — live Playwright + Google AI Studio Free API + Antigravity integration | Planned (`T-04`) |
| Dec 2, 2026 | Bengaluru Finale — live customer outreach telemetry + `Pramana-Bench-v1` validation | Planned (Phase 3) |

## 10. Success Metrics

- **Detection:** Precision / Recall / F1 ≥ **0.92** across all three `Pramana-Bench-v1` scenarios.
- **Latency:** simulated audit ≤ **3.5s**; live end-to-end ≤ **45s** p95 (`INV-07`).
- **Cost:** **$0.00** on free tier; ≤ **$0.024** blended per audit (`INV-06`).
- **Value:** ≥ **1** merged, AST-verified PR per 3 audits on prospect repositories.
- **GTM:** ≥ **20%** cold-email reply rate on proof-first outreach (vs ~2–3% category baseline).

---

## 11. Explicit Non-Goals

- **No paid cloud lock-in** during the prototype phase (`INV-01`).
- **No penetration testing, destructive fuzzing, load or DDoS activity.**
- **No blind direct pushes** to `main`/`master`; every generated change is reviewed through a pull request (`INV-04`).
- **No login wall** before first value (`INV-02`).
- **No hardcoded XPath/CSS selectors** in perception or assertions (`INV-03`).

---

## 12. Team

**Team Vimarsha** — Startup Buildathon India 2026.
*Pramana is the Sanskrit word for valid proof. Our product claim is the same as our name: we do not ask you to trust the demo, we give you the diff.*
