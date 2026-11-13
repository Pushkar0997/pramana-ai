# Architecture Decision Records (ADR)

Format: **Context → Decision → Consequences → Status.** An ADR is required to amend any invariant in `CONTRACT.md`.

---

## ADR-001 — $0.00 Zero-Budget Compute

**Context.** A student team must ship a credible enterprise-grade demo with no card-backed infrastructure, while keeping unit economics defensible at scale.

**Decision.** Use Google AI Studio Free Tier API keys for all inference; Vercel Free Tier / GitHub Pages for hosting; stateless Docker containers on Hugging Face Spaces (Free) / GitHub Actions / local Playwright for browser execution; Firebase Spark (no-card) or a local JSON store for state.

**Consequences.** Operating cost is permanently `$0.00` (`INV-01`) and 86% modeled gross margin survives into the paid tier. In exchange we accept hard rate limits (RPD ceilings), cold-start latency on free hosts, and no SLA — all mitigated by ADR-006 and `INV-07`.

**Status.** Accepted.

---

## ADR-002 — Zero-Selector Multimodal Perception over DOM Assertions

**Context.** Selector-based E2E suites produce a ~35% sprint tax and break on refactors that users never notice. Conversely, refactors that users *do* notice (an obscured CTA, a clipped Devanagari label) pass green CI.

**Decision.** Resolve element identity from the union of multimodal visual perception (`Gemini Omni`), the accessibility tree (role + accessible name), and runtime evidence. Selector strings may appear in output for human reporting only.

**Consequences.** Findings survive class renames and DOM restructuring (`INV-03`), and we detect failures no selector test can express (occlusion, contrast, clipping). Cost: perception is token-expensive, which is precisely why pruning (ADR-006) is mandatory rather than optional.

**Status.** Accepted.

---

## ADR-003 — Schema-Bound Inter-Agent Protocol

**Context.** LLM pipelines degrade into unmaintainable prose handoffs; a model swap silently breaks every downstream stage.

**Decision.** Every hop emits schema-versioned JSON validated at both ends, with machine-readable rejection codes (`INV-08`). Required fields include `spec_id`, `severity`, `category`, `component`, `viewport`, `confidence`, `est_conv_drop_pct`. The UI renders the payload verbatim.

**Consequences.** Models become interchangeable, audits become replayable, and the rendered JSON doubles as sales evidence. Cost: no "just pass the text along" shortcuts, and every schema change is a versioned migration.

**Status.** Accepted.

---

## ADR-004 — AST-Verified Patch Protocol with PR-Only Egress

**Context.** LLM-generated diffs routinely invent helpers, target non-existent files, or produce plausible-but-unparseable code. A hallucinated patch destroys trust faster than a missed bug.

**Decision.** `GitPatchSkill` enforces six sequential gates — file existence, AST parse, import integrity, typecheck/lint, blast radius, branch isolation — before a PR may be opened (`INV-04`). Failure returns `PATCH_REJECTED` with a reason code; no partial diff is ever emitted. Direct pushes to `main`/`master` are prohibited.

**Consequences.** "Zero-hallucination" becomes a mechanical claim rather than a marketing one. Cost: recall drops on genuinely novel refactors (we reject more than we could theoretically fix), which we accept — a rejected patch is reputationally cheap, a wrong merged patch is not.

**Status.** Accepted.

---

## ADR-005 — Deterministic Skill Layer, LLM as Planner Only

**Context.** Reproduction steps must produce identical results on every run, but LLM sampling is non-deterministic.

**Decision.** Execution is delegated to four deterministic primitives — `BrowserSandboxSkill`, `TraceCorrelatorSkill`, `ASTBlastRadiusSkill`, `GitPatchSkill`. The model's only job is selecting a skill and its parameters, and emitting a typed plan.

**Consequences.** The reproduction path contains zero LLM calls, so `3/3` reproducibility is a property of the system, not of a lucky sample. Traces are auditable line-by-line (`INV-05`). Cost: the planner must be strictly typed (ADR-003) and cannot improvise novel tool use at runtime.

**Status.** Accepted.

---

## ADR-006 — Multi-Tier Free Quota Cascade & Model Virtualization

**Context.** Google AI Studio free tiers expose wildly different rate limits per model (unlimited RPD on `Gemini 3.8 Live` through 20 RPD on `Gemini 4 Hydrogen` / `3.8 Flash`). A single-model architecture either burns its expensive budget in minutes or under-uses the cheap, high-volume tiers. We also cannot let a model deprecation or quota exhaustion break the product.

**Decision.** Introduce a **quota cascade router** plus **model virtualization**:

1. A stable *logical* model role (`perception`, `pruning`, `routing`, `vision-triage`, `patching`, `escalation`) is defined in the contract. Physical model IDs are resolved at call time from a registry.
2. Routing is cheapest-capable-first in the fixed order documented in `spec/architecture.md` §4:
   `Gemini 3.8 Live` (Unlimited RPD) → `Gemma 4 31B` (14.4K RPD) → `Gemini Decision 1` (10K RPD) → `Gemini 3.5 Flash Lite` (500 RPD) → `Antigravity` (100 RPD) → `Gemini 4 Hydrogen` / `3.8 Flash` (20 RPD).
3. Escalation is **evidence-triggered** — confidence below threshold, ambiguous geometry, AST rejection — never speculative.
4. Quota exhaustion is a routing event: skip the tier, fall forward, and label the degradation in the UI and the audit record (`tier_used`, `escalations`, `cost_usd`).
5. Before any escalation, context is pruned: `T_pruned = T_raw × (1 − 0.952)`, i.e. `25,000 → 1,200` tokens.
6. Hard ceiling `$0.025` per audit (`INV-06`); Tier 6 may serve ≤ 0.4% of audits.

**Consequences.**

- **Positive:** auditable cost ceiling; graceful behavior under 429/rate-limit; model deprecation is a registry edit, not a refactor; `INV-01` holds structurally rather than by discipline.
- **Negative:** more routing code and a mandatory cost-accounting path; occasional quality dips when an audit is served by a lower tier, made acceptable only by explicit degradation labelling.
- **Rejected alternative:** a single flagship model — simplest to build, breaches `INV-06` on the first 500 audits and dies on the first quota reset.

**Status.** Accepted.

---

## ADR-007 — Chef's-Choice Evaluation via a Pre-Registered Benchmark

**Context.** "It works" is not a claim a judge or a CTO can verify, and post-hoc benchmarks are trivially gamed.

**Decision.** Publish `Pramana-Bench-v1` in `spec/evals.md` **before** the live pipeline lands: three canonical scenarios (`S1_HINDI_OVERFLOW`, `S2_UPI_TIMEOUT`, `S3_DARKMODE_CONTRAST`) with precision/recall/F1 ≥ 0.92 gates, latency gates, and cost gates. Failures are reported, not hidden.

**Consequences.** Every claim in the pitch is falsifiable and reproducible by a third party. Cost: we cannot quietly drop a scenario that underperforms — the gate fails in public, which is the point.

**Status.** Accepted.
