# Technical Architecture — 4-Tier Zero-Budget Pipeline

> Normative companion to [`CONTRACT.md`](../CONTRACT.md). Operating cost: **$0.00** on free tier. Blended audit cost ceiling: **$0.025** (`INV-06`).

---

## 1. Four-Tier ASCII Architecture

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ TIER 0 · INGESTION & EXPERIENCE                         INV-01 · INV-02      │
│ Vercel Free Tier / GitHub Pages                                               │
│   • Zero-Auth Audit Bar        → paste URL, ≤3 clicks to verdict             │
│   • Split-Brain Command Center → The Eyes ‖ The Brain                        │
│   • Proof-First Outreach Studio→ pramana.dev/proof/{brand}-{pr}              │
│   • 1-line Gemini Live voice widget (orb.js) on the target site              │
└───────────────────────────────────┬───────────────────────────────────────────┘
                                    │  AuditRequest { url, spec_id }   INV-08
┌───────────────────────────────────▼───────────────────────────────────────────┐
│ TIER 1 · PERCEPTION & TRIAGE                    Google AI Studio Free Tier   │
│   • Gemini Omni   → multimodal visual DOM, occlusion, overflow, contrast     │
│   • Gemini Live   → real-time voice + screen bug capture (hi-IN / en-IN)     │
│   • Gemma         → HAR + console pruning, root-cause clustering (25k→1.2k)  │
│                                                                              │
│   Zero selectors: perception = pixels ∪ ARIA tree ∪ runtime evidence  INV-03 │
└───────────────────────────────────┬───────────────────────────────────────────┘
                                    │  Finding[] (schema-validated)    INV-08
┌───────────────────────────────────▼───────────────────────────────────────────┐
│ TIER 2 · ORCHESTRATION & SELF-HEALING                                        │
│   • Google Antigravity     → repo AST dependency map + blast radius          │
│   • Google Agent Skills    → 4 deterministic primitives, 0 LLM in repro:     │
│                              BrowserSandboxSkill · TraceCorrelatorSkill      │
│                              ASTBlastRadiusSkill · GitPatchSkill             │
│   • Nano Banana            → before/after visual UI patch synthesis          │
│   • Lyria                  → accessible audio cues for captured reports      │
│                                                                              │
│   PatchCandidate must pass existence → parse → imports → types →  INV-04     │
│   blast-radius → branch isolation, else PATCH_REJECTED (no partial diff)     │
└───────────────────────────────────┬───────────────────────────────────────────┘
                                    │  PRProposal { branch, diff, ast_proof }
┌───────────────────────────────────▼───────────────────────────────────────────┐
│ TIER 3 · COMPUTE, STATE & EGRESS                              INV-07 · INV-09│
│   • Ephemeral Playwright sandbox: fresh context, cleared storage,            │
│     read-only by default, 30s nav / 120s audit timeout, --rm teardown        │
│   • Runners: GitHub Actions · Hugging Face Spaces (Free Docker) · local      │
│   • State: Firebase Spark (Firestore) / local JSON store                     │
│   • Egress: isolated `pramana/fix-*` branch + PR via GitHub App              │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Data-flow contract:** every arrow carries a schema-versioned JSON payload (`INV-08`). No stage passes prose. The UI renders the payload verbatim so any claim is auditable.

---

## 2. Required Stack Surfaces (`INV-05`)

| Surface | Tier | Role |
|---|---|---|
| **Google AI Studio** | 1 | Free-tier API access, model registry, strict schema enforcement |
| **Gemini Omni** | 1 | Multimodal visual DOM comprehension and anomaly localisation |
| **Gemini Live** | 1 | Real-time voice/screen capture and orb dialogue |
| **Gemma** | 1 | Log/HAR pruning and root-cause clustering at zero marginal cost |
| **Google Antigravity** | 2 | AST dependency mapping, blast radius, patch synthesis |
| **Google Agent Skills** | 2 | Deterministic execution primitives (`BrowserSandboxSkill`, `TraceCorrelatorSkill`, `ASTBlastRadiusSkill`, `GitPatchSkill`) |
| **Nano Banana** | 2 | Before/after visual UI patch rendering |
| **Lyria** | 2 | Accessible audio cues for voice-reported defects |

---

## 3. Token Pruning — The Cost Equation

Raw audit context (HAR, console, DOM snapshots, screenshots) is unbounded. Sending it to a reasoning tier is the single largest cost risk, so **Gemma prunes before any expensive model sees a token**:

```
T_pruned = T_raw × (1 − ρ_prune)          ρ_prune = fraction discarded by Gemma

T_raw    = 25,000 tokens   (typical checkout HAR + console + DOM)
ρ_prune  = 0.952
T_pruned = 25,000 × (1 − 0.952) = 1,200 tokens     → 95.2% reduction
```

Per-audit cost ceiling:

```
cost_audit = Σ_over_tiers ( tokens_i × price_i )  ≤  $0.025        (INV-06)

Free tier  → dprice/dtoken = 0        cost_audit = $0.00            (INV-01)
Paid scale → marginal cost < $0.015 / audit at >100k audits/month
```

**Why it holds:** pruning is deterministic and model-independent. The reasoning tier receives 1,200 ranked evidence tokens — never a transcript, never a raw HAR, never a base64 screenshot.

---

## 4. Google AI Studio Free-Tier Quota Cascade Router

Routing is **cheapest-capable-first**, escalating only on evidence (low confidence, ambiguous geometry, AST rejection). Exhausting an RPD quota is a *routing* event, never a billing event (`INV-01`).

| # | Model / Surface | Free-Tier Quota | Assigned role | Escalation trigger |
|---|---|---|---|---|
| 1 | **Gemini 3.8 Live** | **Unlimited RPD** | Voice + screen capture, session narration, orb dialogue | User intent unclear after 2 turns |
| 2 | **Gemma 4 31B** | **14.4K RPD** | HAR/console pruning, root-cause clustering, severity pre-scoring | Evidence cluster unstable (n < 3 corroborations) |
| 3 | **Gemini Decision 1** | **10K RPD** | Router: pick skills, choose tier, emit typed plan | Plan schema invalid or confidence < 0.80 |
| 4 | **Gemini 3.5 Flash Lite** | **500 RPD** | Bulk vision triage on secondary viewports | Layout anomaly below 0.85 confidence |
| 5 | **Antigravity** | **100 RPD** | AST blast radius + patch synthesis + `ast-check` | Patch rejected by typecheck/lint |
| 6 | **Gemini 4 Hydrogen** / **3.8 Flash** | **20 RPD** | Reserved: ambiguous geometry, cross-frame occlusion, contested verdicts | Budget-exhausted → degrade and label |

**Router invariants.**
- A tier is skipped if its RPD budget for the current window is exhausted.
- Tier 6 is *reserved*: it may serve at most 0.4% of audits, or the cost ceiling breaks.
- Every verdict records `tier_used`, `escalations`, `tokens_in`, `tokens_out`, `cost_usd` for the bench (`spec/evals.md`).
- Degradation is explicit in the UI — never silently presented as a Tier-6-quality verdict.

---

## 5. Deterministic Skill Layer

| Skill | Deterministic guarantee | Emitted evidence |
|---|---|---|
| `BrowserSandboxSkill` | Reproduces the journey in a cold ephemeral context (`INV-09`) | Device profile, network throttle, reproduction count `n/n` |
| `TraceCorrelatorSkill` | Aligns HAR timestamps with DOM mutations and click targets | Correlation delta in ms, matched event IDs |
| `ASTBlastRadiusSkill` | Computes the reverse dependency closure of touched files | File list, test surface, breakage count |
| `GitPatchSkill` | Enforces the 6-gate patch protocol (`INV-04`) | `ast-check PASS`, branch name, PR number |

**Rule:** the LLM decides *which skill to run and with what parameters*. The skill decides *what the result means*. This is what makes the trace auditable: no model output is ever interpreted as evidence.

---

## 6. State Machine

```
IDLE_READY
   │  url | S1_HINDI_OVERFLOW | S2_UPI_TIMEOUT | S3_DARKMODE_CONTRAST
   ▼
AUDIT_RUNNING                       (Tier 1 capture → triage → Tier 2 synthesis)
   │  schema-valid Finding[] + PatchCandidate with ast_proof
   ▼
AUDIT_COMPLETE_SPLIT_BRAIN          (Eyes ‖ Brain populated; PR proposed, not merged)
   │  verified-fix action → CI 14/14
   ▼
PR_MERGED_VERIFIED                  (commit + CI + compute-cost telemetry)
```

Transitions are one-directional except explicit `reset`. `PR_MERGED_VERIFIED` is reachable only through the verified-fix action, never automatically — the human stays in the loop on merge.

---

## 7. Deployment Topology

| Component | Free-tier host | Fallback |
|---|---|---|
| Static UI (`dist/`) | Vercel Free Tier | GitHub Pages (`base: "./"` keeps assets relative) |
| Single-file demo | `public/standalone-demo.html` | Served statically, zero network deps |
| Sandbox runner | GitHub Actions (ephemeral job) | HF Spaces Free Docker · local Playwright |
| State | Firebase Spark Firestore | Local JSON store |
| Patch egress | GitHub App on isolated branch | Manual `git apply` of the emitted diff |

`vercel.json` rewrites all paths to `index.html` so hash-routed views (`#command`, `#outreach`) deep-link correctly.
