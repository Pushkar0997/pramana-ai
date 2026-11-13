# System Contract & Invariants — `INV-01 … INV-10` (DO NOT VIOLATE)

This document is the **normative** contract for Pramana AI. It outranks convenience, deadlines, and demo aesthetics. Code under `src/`, `scripts/`, and any future backend is compliant **only** if it satisfies every invariant below.

> **Amendment rule:** an invariant may be changed only by (a) adding an ADR to [`spec/decisions.md`](./spec/decisions.md), and (b) a spec-only commit titled `docs(spec): amend INV-XX — <reason>`. Silent drift in `src/` is a build failure, not a judgement call.

---

## `INV-01` — $0.00 Zero-Budget Free-Tier Infrastructure

**Statement.** The entire system MUST operate at **$0.00** recurring cost, with **no card-backed billing account** attached to any component.

**Technical definition.**
- All model inference MUST route through the **Google AI Studio Free Tier API** (`Gemini Omni`, `Gemini Live`, `Gemma`, `Nano Banana`, `Lyria`) or locally-hosted weights. No paid inference endpoint, no paid vector DB, no paid observability SaaS.
- Frontend hosting MUST be **Vercel Free Tier** or **GitHub Pages**.
- Headless browser sandboxes MUST run **locally**, on **GitHub Actions**, on **Hugging Face Spaces (Free Docker tier)**, or on **Firebase Spark (Free, no-card plan)**.
- Demo/seed data MUST be static or generated in-process. No dependency on a paid runtime service to render a view.

**Enforcement.** No paid SDK is installed or importable. Every quota-consuming call goes through the cascade router (`spec/architecture.md`), never direct.

**Verification.** Billing dashboards for the org show `$0.00` for the duration of the buildathon; `package.json` and `requirements` contain zero paid-service clients.

**Violation examples.** A Cloud Run service with billing enabled. A hosted Postgres with a paid tier. A paid vision API fallback "just for the demo."

---

## `INV-02` — Zero-Auth, ≤3 Clicks to Value

**Statement.** A first-time visitor MUST reach a full audit verdict **without creating an account**, in **at most 3 clicks**.

**Technical definition.** The canonical path is exactly three interactions:

1. **Click 1** — focus/paste a URL (or select a preset scenario pill).
2. **Click 2** — `Run Autonomous Audit`.
3. **Click 3** — open the verdict / proof view (`Merge Verified Fix` or the proof card).

No login wall, no email capture, no cookie consent interstitial, no SDK install, no CLI, and no API key may gate any of the three. Authentication, if it ever exists, is strictly **post-value**.

**Enforcement.** The audit bar is rendered on the landing route with no guard component between it and `App`.

**Verification.** `smoke.md` SMK-01 / SMK-04. Manual: private-window session → verdict reachable in ≤3 clicks.

**Violation examples.** "Sign in with Google to continue." An "installation required" modal. A waitlist form before the audit bar.

---

## `INV-03` — Zero-Selector Multimodal Visual + ARIA Perception

**Statement.** Perception and assertion MUST NOT depend on hardcoded CSS, XPath, or DOM-path selectors.

**Technical definition.** A finding is produced from the union of:

- **Visual perception** (`Gemini Omni`): pixel-level layout, occlusion, contrast, clipping, overflow, z-index stacking.
- **Semantic accessibility tree**: role, accessible name, state, landmark.
- **Runtime evidence**: console output, HAR network waterfall, DOM mutation timeline.

Element identity is resolved by **role + accessible name + visual geometry**, with confidence scoring. A selector string MAY appear in output *for human reporting only*; it MUST NOT be the resolution mechanism. Perception MUST remain valid across a component refactor that changes class names and DOM depth.

**Enforcement.** No `page.$('#id')`, no `document.querySelector` used as an identity primitive, no XPath literals in assertion paths.

**Verification.** Rename every class and wrap the target node in 3 extra `div`s → the finding MUST persist with unchanged severity.

**Violation examples.** `cy.get('.checkout button:nth-child(2)')`. `//div[@id='root']/div[2]/button`. Asserting on `data-testid` as the source of truth.

---

## `INV-04` — Zero-Hallucination, AST-Verified Patch Generation

**Statement.** A generated patch MUST reference real files, parse to a valid AST, and pass static analysis **before** a pull request is proposed. `main`/`master` is never pushed to directly.

**Technical definition.** A `PatchCandidate` is mergeable only if **all** gates pass, in order:

1. **Existence** — every touched path exists in the repository at the PR base SHA.
2. **Parse** — full-file parse to AST (`ts-morph` / Babel / language-native parser) with **zero syntax errors**.
3. **Import integrity** — every newly introduced symbol resolves to an existing module or a stdlib export; no fabricated imports.
4. **Type / lint** — project typecheck and lint pass for the touched files.
5. **Blast radius** — the dependency closure is reported; tests in the closure must not regress.
6. **Branch isolation** — changes are committed to `pramana/fix-<slug>-<pr>` and proposed as a PR with CI evidence.

Any failure aborts the PR and returns a structured `PATCH_REJECTED` reason — never a partial diff.

**Enforcement.** `GitPatchSkill` is the only path to a PR, and it emits `ast-check PASS` evidence into the execution trace.

**Verification.** Feed a deliberately invalid hunk → the pipeline MUST reject it with `SYNTAX_ERROR` and open no PR.

**Violation examples.** Emitting a diff with invented helper functions. Pushing directly to `main`. "It compiles in my head" patch acceptance.

---

## `INV-05` — Mandatory Google Stack

**Statement.** The product MUST use all eight required surfaces. Substitution is a contract breach, not an implementation detail.

| Required surface | Binding role in Pramana |
|---|---|
| **Google AI Studio** | Free-tier API access, structured JSON enforcement, prompt/model registry |
| **Google Antigravity** | Repository AST dependency mapping, blast-radius analysis, patch synthesis |
| **Google Agent Skills** | Deterministic execution primitives (`BrowserSandboxSkill`, `TraceCorrelatorSkill`, `ASTBlastRadiusSkill`, `GitPatchSkill`) |
| **Gemini Omni** | Multimodal visual DOM comprehension, layout-shift and occlusion detection |
| **Gemini Live** | Real-time voice + screen bug capture (Hinglish/Hindi/English) and orb dialogue |
| **Gemma** | High-speed, zero-cost HAR / console log pruning and root-cause clustering |
| **Nano Banana** | Before/after visual UI patch synthesis |
| **Lyria** | Accessible audio cues for voice-captured bug reports |

**Enforcement.** All eight names appear in the stack telemetry bar and the architecture spec. The Command Center renders a **4/4 deterministic skills** trace per scenario.

**Verification.** `smoke.md` SMK-02 / SMK-05; stack bar lists models and tools with live status.

**Violation examples.** Swapping Gemma for a competitor classifier. Dropping Lyria cues. Shipping 3/4 skills.

---

## `INV-06` — Hybrid Cascade Routing ≤ $0.025 / Audit

**Statement.** Every audit MUST be served by the cheapest capable model first, escalating only on low confidence, and MUST NOT exceed **$0.025** blended cost per audit.

**Technical definition.**
- Routing order is fixed by the quota cascade router (`spec/architecture.md` §4): `Gemini 3.8 Live` → `Gemma 4 31B` → `Gemini Decision 1` → `Gemini 3.5 Flash Lite` → `Antigravity` → `Gemini 4 Hydrogen / 3.8 Flash`.
- Escalation is **evidence-triggered** (confidence below threshold, geometry ambiguity, AST rejection), never speculative.
- Raw context is pruned before the expensive tier: `T_pruned = T_raw × (1 − ρ_prune)`; with `T_raw = 25,000` and `ρ_prune = 0.952` → **1,200 tokens** reach the reasoning tier.
- Hard ceiling: `Σ (tokens_i × price_i) ≤ $0.025` per audit. The router MUST short-circuit and return a degraded-but-labelled verdict rather than breach the ceiling.
- Exhausting a free-tier RPD quota is a **routing** event (fall to the next tier), never a billing event (`INV-01`).

**Enforcement.** Token counts and chosen tier are emitted in the audit's cost telemetry; the UI displays the realized cost.

**Verification.** Any audit whose computed cost exceeds `$0.025` fails the cost gate in `Pramana-Bench-v1` (`spec/evals.md`).

**Violation examples.** Sending raw 25k-token HAR to the most expensive model "to be safe." Paid overflow burst capacity.

---

## `INV-07` — Latency SLAs

**Statement.** Perceived speed is part of the proof. The demo MUST feel instant; the live pipeline MUST finish inside a single meeting beat.

| Surface | SLA | Measurement point |
|---|---|---|
| **Simulated audit (demo / Command Center)** | **≤ 3.5 s** | `Run Autonomous Audit` click → all three Brain cards populated |
| **Live audit (real URL, end-to-end)** | **≤ 45 s p95** | URL submission → PR opened with AST evidence |
| **Perception frame budget** | ≤ 412 ms / frame | Omni vision pass per viewport |
| **Voice capture round-trip** | ≤ 1.8 s | User stops speaking → orb transcript + DOM node mapping |

Simulated and live modes MUST be visually distinguishable so a judge is never misled about which is running.

**Enforcement.** Stage timers and progress telemetry are surfaced in the audit bar; every stage reports duration.

**Verification.** `Pramana-Bench-v1` latency gates (`spec/evals.md`) fail the run on breach.

**Violation examples.** An unbounded retry loop that "eventually" returns. Hiding a 90s live audit behind a fake spinner.

---

## `INV-08` — Deterministic JSON Schema Enforcement

**Statement.** Inter-agent payloads MUST be schema-bound. Free-form prose is **not** an inter-stage API.

**Technical definition.**
- Every hop (`Perception → Triage → Orchestration → Patch`) emits a typed JSON object with a `schema_version`.
- Payloads are **validated at both ends**. A schema violation is a hard error with a machine-readable code (`SCHEMA_MISMATCH`, `MISSING_FIELD`, `UNKNOWN_ENUM`) — never a silent coercion.
- Required finding fields include `spec_id`, `severity`, `category`, `component`, `viewport`, `confidence`, and `est_conv_drop_pct`.
- The UI renders the schema payload verbatim (structured JSON panel) so evidence is auditable.

**Enforcement.** No stage returns a Markdown blob or JSON-in-a-string. Validation runs before persistence and before rendering.

**Verification.** `smoke.md` SMK-04 asserts `spec_id` appears in the rendered JSON for every scenario.

**Violation examples.** `"The button is broken, probably CSS"` crossing a stage boundary. A model returning JSON wrapped in prose fences and the parser "handling it."

---

## `INV-09` — Stateless Ephemeral Sandbox Isolation

**Statement.** Every browser run MUST be ephemeral, isolated, and non-destructive to the target.

**Technical definition.**
- Fresh browser context per audit: new profile, cleared cookies/localStorage/sessionStorage/IndexedDB, empty cache.
- **Read-only by default.** The only permitted mutations are safe, reversible form interactions necessary to reach the flow under test (typing a coupon code, selecting a payment method).
- Never: real payments, account deletion, data export, destructive admin actions, or requests against production write endpoints.
- Strict execution timeout (30 s per navigation, 120 s per audit) with hard teardown.
- Egress restricted to the audited origin plus declared third parties. Containers are `--rm`, no persistent volume, no cross-audit state.
- No crawling beyond the declared journey; no load generation, no fuzzing (`BRIEF.md` §11).

**Enforcement.** Sandbox flags are part of the run config, not optional arguments. Teardown is unconditional (`finally`).

**Verification.** Two consecutive audits of the same URL produce byte-identical cold state; storage snapshots are empty at entry.

**Violation examples.** Reusing a warmed context to "save 300ms." Clicking a real `Pay ₹4,299`. Leaving a container alive between audits.

---

## `INV-10` — Spec-First Commit Discipline

**Statement.** No change lands without a task, a lint pass, and an audit trail.

**Technical definition.** Every commit that touches `src/` or `scripts/` MUST satisfy:

1. **Traceability** — it maps to an active, checkable task ID in [`spec/tasks.md`](./spec/tasks.md).
2. **Spec lint** — `python scripts/spec_lint.py` exits `0` (required files present, zero-budget declared, task IDs well-formed).
3. **Smoke evidence** — the relevant `spec/smoke.md` items are exercised and checked off.
4. **Changelog** — a timestamped entry is appended to [`AGENT_LOG.md`](./AGENT_LOG.md) referencing the task IDs.
5. **Human review** — generated changes arrive as PRs (`INV-04`), never as direct pushes to `main`.

**Enforcement.** `scripts/spec_lint.py` is the mechanical gate; the pre-commit hook and CI mirror it. A doc-only commit may skip smoke evidence but never traceability or the changelog.

**Verification.** CI red on a commit lacking a task reference; `spec_lint` non-zero on missing files.

**Violation examples.** "Quick UI fix" commits with no task. Updating `src/` and forgetting `spec/tasks.md`. Marking smoke items `[x]` without running them.

---

## Compliance Matrix

| Invariant | Mechanical gate | Human gate |
|---|---|---|
| `INV-01` $0.00 | No paid clients in manifests | Billing dashboard = $0.00 |
| `INV-02` Zero-auth | Landing route unguarded | Private-window 3-click test |
| `INV-03` Zero-selector | No selector literals in perception | Refactor-invariance replay |
| `INV-04` AST patch | `ast-check PASS` required pre-PR | PR review on isolated branch |
| `INV-05` Mandatory stack | All 8 surfaces in stack telemetry | 4/4 skills trace visible |
| `INV-06` ≤ $0.025 | Router ceiling + cost telemetry | Bench cost gate |
| `INV-07` Latency | Stage timers | Bench latency gate |
| `INV-08` JSON schema | Validator on every hop | Rendered JSON panel |
| `INV-09` Sandbox | Ephemeral context + timeout flags | Cold-state snapshot check |
| `INV-10` Spec-first | `scripts/spec_lint.py` + CI | `AGENT_LOG.md` entry |
