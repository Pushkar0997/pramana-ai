<div align="center">

# प्रमाण · Pramana AI

### Pramana finds conversion-killing bugs on checkout pages and drafts the fix.

**Paste any public URL for a live HTML & accessibility audit + copyable fix, or explore worked examples on our connected demo storefront.**

[![Spec Gate](https://img.shields.io/badge/spec__lint-passing-34D399?style=flat-square&labelColor=090A0F)](./scripts/spec_lint.py)
[![Zero Budget](https://img.shields.io/badge/infra-%240.00%20zero--budget-22D3EE?style=flat-square&labelColor=090A0F)](./CONTRACT.md)
[![Google DeepMind](https://img.shields.io/badge/Google%20DeepMind-%C3%97%20Antigravity-4285F4?style=flat-square&labelColor=090A0F)](./spec/architecture.md)
[![Team Vimarsha](https://img.shields.io/badge/team-Vimarsha-FBBF24?style=flat-square&labelColor=090A0F)](./BRIEF.md)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&labelColor=090A0F)](./package.json)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&labelColor=090A0F)](./vite.config.js)
[![Vercel](https://img.shields.io/badge/deploy-Vercel%20Free-000000?style=flat-square&labelColor=090A0F)](./vercel.json)

**Startup Buildathon India 2026** · Team Vimarsha · *Pramana* (Sanskrit) — *valid evidence*

</div>

---

## 🔍 What Pramana Can & Cannot Do Today (Live Mode vs. Worked Examples)

To keep our engineering claims verifiable for judges and users, Pramana explicitly separates its two execution modes in both the UI and the `/api/audit` response (`auditMode`):

| Capability | 🌐 Live Public URL Mode (`LIVE_PUBLIC_HTML_SCRAPE`) | 🧪 Connected Sandbox Examples (`BENCHMARK_FIXTURE`) |
|---|---|---|
| **Target URLs** | Any public website (`https://google.com`, `https://github.com`, `https://example.com`, or your own site) via `url` or `target_url` | Our fictional connected demo apps: **ZestKart** (`checkout.zestkart.in`) and **ScaleGrid** (`app.scalegrid.io`) |
| **How it inspects** | Real server-side HTTP GET + static HTML/DOM parser (titles, headings, buttons/links, form inputs, ARIA labels, missing `alt` attributes, auth/CAPTCHA/SPA detection) | Full browser viewport simulation (`390×844` mobile & `1440×900` desktop), network trace correlation, and connected repository AST mapping |
| **Revenue & conversion metrics** | **Disabled (`null` / "No Revenue Metric Applicable")** — Pramana never fabricates conversion drops or dollar losses on unauthenticated public scrapes | **Modeled Demo Benchmark** (`-14.8%` / `~$18,400/mo` on our fictional ZestKart demo store) to illustrate connected merchant analytics |
| **Severity calibration** | Calibrated to actual markup findings (`example.com` → `PASS` `99/100`, `google.com` → `LOW` `94/100`, `github.com` → `LOW/MEDIUM` `88–91/100`) | Pre-registered checkout blockers (`S1_HINDI_OVERFLOW`, `S2_UPI_TIMEOUT`, `S3_DARKMODE_CONTRAST`) |
| **Remediation output** | **Copyable HTML/CSS Snippet** (`prAvailable: false` — never pretends to open or merge PRs on third-party repos) | **Sample Pull Request Diff & Simulated Sandbox Merge** against our demo storefront repository |

---

## 🔗 Live Interactive Surfaces

Four browser surfaces on one zero-budget deployment (`https://pramana-ai-eta.vercel.app/`):

| Route | Surface | What judges & visitors can do | Source |
|---|---|---|---|
| `/` | **Pramana Audit Workstation** | Paste any public URL (or click `google.com` / `github.com` / `example.com`) for a live HTML & accessibility audit, or explore the 3 worked examples on our ZestKart demo store | [`src/App.jsx`](./src/App.jsx) |
| `/demo-store/index.html` | **Connected Demo Storefront (ZestKart)** | Trigger our 3 intentional checkout bugs (`S1_HINDI_OVERFLOW`, `S2_UPI_TIMEOUT`, `S3_DARKMODE_CONTRAST`), test the voice orb (`/orb.js`), and replay `/api/upi/confirm` (`504` vs `200`) | [`public/demo-store/index.html`](./public/demo-store/index.html) |
| `/proof/index.html?id=142` | **Shareable Audit Summary** | View a clean, standalone summary of any worked example or live URL audit with a copyable `.diff` snippet | [`public/proof/index.html`](./public/proof/index.html) |
| `/deck/index.html` | **Interactive 8-Slide Buildathon Pitch Deck** | Browse the 8-slide architecture & business pitch and export a printable PDF | [`public/deck/index.html`](./public/deck/index.html) |

---

## 1. The Problem

QA tooling automates *execution*, but teams still spend ~35% of every sprint maintaining brittle CSS/XPath selectors while 78% of customer-reported checkout bugs arrive without device state, network logs, or a reproducible DOM snapshot.

In Indian mobile commerce, three failure modes routinely slip past selector-based CI:
1. **Mobile viewport overlaps & Hindi (`hi-IN`) text clipping** on `390×844` screens after a coupon banner expands.
2. **UPI webhook race conditions (`HTTP 504`)** where `payment.captured` lands milliseconds before `order.created`.
3. **Dark-mode contrast traps & invisible overlay scrims** that swallow clicks on primary checkout buttons.

---

## 2. Architecture & Free-Tier Quota Cascade Router

Pramana routes tasks across Google AI Studio free-tier models (`ADR-006`) and deterministic skills (`BrowserSandboxSkill`, `TraceCorrelatorSkill`, `ASTBlastRadiusSkill`, `GitPatchSkill`), keeping infrastructure cost at **$0.00** on the free tier (`INV-01`) and **≤ $0.025 / audit** at scale (`INV-06`).

Full technical specifications:
- [`BRIEF.md`](./BRIEF.md) — Executive thesis, target segments, and unit economics
- [`CONTRACT.md`](./CONTRACT.md) — System invariants (`INV-01 … INV-10`)
- [`spec/architecture.md`](./spec/architecture.md) — 4-tier pipeline & quota cascade router
- [`spec/evals.md`](./spec/evals.md) — `Pramana-Bench-v1` benchmark scenarios
- [`AGENT_LOG.md`](./AGENT_LOG.md) — Timestamped engineering & stress-test remediation log

---

## 3. Quickstart & Verification

```bash
# 1. Install dependencies (Node 18+)
npm install

# 2. Run local dev server
npm run dev

# 3. Run spec gate & all 24 unit/contract tests
python scripts/spec_lint.py
python -m unittest discover -s tests -p "test_*.py" -v
```
