# Evaluation Benchmarks — `Pramana-Bench-v1`

> **Pre-registered.** These gates are published *before* the live pipeline exists and may not be relaxed after the first measurement without an ADR (`spec/decisions.md` ADR-007). A failed gate is reported as a failure, not re-scoped.

---

## 1. Scorecard Gates

| Gate | Threshold | Invariant | Blocks ship |
|---|---|---|---|
| Detection **Precision** (per scenario) | **≥ 0.92** | `INV-03` | Yes |
| Detection **Recall** (per scenario) | **≥ 0.92** | `INV-03` | Yes |
| Detection **F1** (per scenario) | **≥ 0.92** | `INV-03` | Yes |
| Simulated audit latency | **≤ 3.5 s** | `INV-07` | Yes |
| Live audit latency (p95) | **≤ 45 s** | `INV-07` | Yes |
| Blended cost / audit | **≤ $0.025** | `INV-06` | Yes |
| Free-tier infra cost | **$0.00** | `INV-01` | Yes |
| Marginal cost @ >100k audits/mo | **< $0.015** | `INV-06` | No (report only) |
| Patch AST pass rate | **100%** | `INV-04` | Yes |
| Fabricated file / symbol rate | **0%** | `INV-04` | Yes |
| Regressions introduced in blast radius | **0** | `INV-04` | Yes |
| Reproduction determinism | **3/3** runs | `INV-09` | Yes |

---

## 2. `Pramana-Bench-v1` — Canonical Scenarios

Every scenario is a **pre-registered fixture**: fixed viewport, fixed network profile, fixed locale, fixed ground-truth defect set. `spec_id` is the contract-level identifier shared by the UI, the JSON payload, and this benchmark.

| Scenario ID | Fixture | Viewport / state | Ground-truth defects | Expected categories | Reference confidence |
|---|---|---|---|---|---|
| **`S1_HINDI_OVERFLOW`** | iPhone 15 · Safari 17 · Jio 4G throttle · `hi-IN` · coupon `ZEST300` applied | `390 × 844` | **3** — (a) sticky pay bar slides under trust banner (`bottom: -48px`), (b) trust-strip intercepts 3 clicks on `#checkout-sticky-cta`, (c) Devanagari pay label clipped by 118px in `flex-nowrap` | `layout_overflow`, `dead_click`, `i18n_clipping` | 0.994 |
| **`S2_UPI_TIMEOUT`** | iPhone 15 · Safari iOS 17.5 · 5G · UPI intent → PhonePe | `390 × 844` | **3** — (a) `payment.captured` arrives 212 ms before `order.created` → `OrderNotFound`, (b) `/api/upi/confirm` returns `504` at 30,012 ms, (c) status poller never resolves → infinite spinner, 4 retry taps | `race_condition`, `http_5xx`, `infinite_loading` | 0.981 |
| **`S3_DARKMODE_CONTRAST`** | MacBook · Chrome 126 · `prefers-color-scheme: dark` | `1440 × 900` | **2** — (a) Apply-coupon `#4A4F63` on `#1C2030` = 2.1:1 contrast (needs 4.5:1), (b) `div.promo-scrim` (z-index 40) intercepts 5 clicks on `#place-order-cta` → 0 handlers, 41% dead-click rate | `a11y_contrast`, `dead_click` | 0.991 |

**Total ground truth: 8 defects across 3 scenarios.**

---

## 3. Scoring Protocol

**Matching rule.** A reported anomaly is a **true positive** when *either*
1. its bounding box achieves `IoU ≥ 0.50` with a ground-truth box, **or**
2. its `(category, component)` pair matches a ground-truth defect exactly.

**Confusion set.**

| Term | Definition |
|---|---|
| `TP` | Reported anomaly matched to a distinct ground-truth defect (one-to-one; extra matches count as FP) |
| `FP` | Reported anomaly with no unmatched ground-truth counterpart — includes duplicate reports of the same defect and correct findings attributed to the wrong component |
| `FN` | Ground-truth defect with no matched report |
| `Precision` | `TP / (TP + FP)` |
| `Recall` | `TP / (TP + FN)` |
| `F1` | `2·P·R / (P + R)` |

**Run protocol.** Each scenario runs **3 times** from a cold ephemeral context (`INV-09`). The reported score is the **worst** run — no best-of-3 crediting. A scoreboard entry is invalid if any run leaked state from a previous run.

**Decision rule.** Ship gate **passes** only if every per-scenario gate in §1 is green. A single sub-threshold scenario fails the release, even if the macro-average passes.

---

## 4. Latency Measurement Points

| Measurement | Start | Stop |
|---|---|---|
| Simulated audit | `Run Autonomous Audit` click | all three Brain cards populated |
| Live audit (p95) | URL submission | PR opened with `ast-check PASS` evidence |
| Perception frame | frame dispatch | anomaly localised |
| Voice round-trip | user stops speaking | transcript + DOM node mapping rendered |

Timings include network and model latency; they exclude human think-time. Simulated vs live mode MUST be labelled in the UI so a measured demo is never presented as a live run.

---

## 5. Cost Accounting

| Metric | Definition | Gate |
|---|---|---|
| Free-tier infra cost | Real billing exposure of the whole stack | **$0.00** (`INV-01`) |
| Blended cost / audit | `Σ(tokens_i × price_i)` across all tiers touched, from the cascade ledger | **≤ $0.025** (`INV-06`) |
| Marginal cost @ scale | Blended cost at >100k audits/month, all free tiers exhausted | **< $0.015** (report) |
| Pruning ratio | `1 − T_pruned / T_raw`, tracked per audit | ≥ 95% (`25,000 → 1,200`) |
| Escalation rate | % of audits reaching Tier 5–6 | ≤ 8% (report) |

Cost is asserted from the router ledger, not estimated. An audit with no cost record fails the cost gate by definition.

---

## 6. Reporting Format

```
Pramana-Bench-v1 · run <utc timestamp> · commit <sha>
┌──────────────────────┬───────────┬────────┬──────┬───────────┬──────────┬──────────┐
│ Scenario             │ Precision │ Recall │ F1   │ Latency   │ Cost     │ Verdict  │
├──────────────────────┼───────────┼────────┼──────┼───────────┼──────────┼──────────┤
│ S1_HINDI_OVERFLOW    │           │        │      │           │          │          │
│ S2_UPI_TIMEOUT       │           │        │      │           │          │          │
│ S3_DARKMODE_CONTRAST │           │        │      │           │          │          │
├──────────────────────┼───────────┼────────┼──────┼───────────┼──────────┼──────────┤
│ MACRO AVERAGE        │  ≥ 0.92   │ ≥ 0.92 │≥0.92 │ ≤ 3.5s/45s│ ≤ $0.025 │          │
└──────────────────────┴───────────┴────────┴──────┴───────────┴──────────┴──────────┘
Release: PASS | FAIL   ·   Failing gates: <list>
```

Results are append-only in `AGENT_LOG.md`, one line per run, referencing the commit SHA. Re-running a failed benchmark to obtain a passing run without a code change is treated as a fabricated result.
