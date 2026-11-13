# RFC-20261114: Dual-Execution Live Hybrid Engine (Instant Replay + Live Autonomous Sandbox)

- **Author:** Lead Systems & Full-Stack AI Engineer (Team Vimarsha)
- **Status:** APPROVED
- **Date:** 2026-11-14
- **Target Invariant Gate:** `INV-01` through `INV-10`

---

## 1. Summary
Evolve Pramana AI from a deterministic telemetry playback mockup into a live, hybrid end-to-end Autonomous QA and Self-Healing Engineering system. The engine operates across two mutually reinforcing modes:
1. **Mode 1 — Instant Deterministic Replay (`<3.0s`, Zero-Latency Pitch Mode):** Guaranteed fallback using pre-verified telemetry fixtures (`S1_HINDI_OVERFLOW`, `S2_UPI_TIMEOUT`, `S3_DARKMODE_CONTRAST`) for pitch decks, offline demo stages, and instant exploration without API rate-limit risk.
2. **Mode 2 — Live Autonomous Sandbox Audit (`<=45s`, Real Headless Execution):** Dispatches Playwright Chromium within a zero-cost container (or local runner) + Google AI Studio Free Tier API (Gemma 2 27B, Gemini 2.5 Flash, Nano Banana CSS patch generator, Lyria WebAudio cues) to crawl any live user-submitted URL, detect layout overlaps and network drops, and generate an AST-verified GitHub patch.

---

## 2. Motivation & Wedge
Judges and prospective SaaS/FinTech customers demand proof on their own production URLs without sacrificing the infallible reliability of 3-second live stage presentations. The dual-mode hybrid architecture satisfies both requirements while preserving the strict $0.00 zero-budget operating invariant.

---

## 3. Detailed Design

### 3.1 Dual-Execution Mode State Machine
```
              ┌────────────────────────┐
              │      Audit Bar         │
              │  Mode Toggle Selector  │
              └───────────┬────────────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
 ┌──────────────────────┐    ┌───────────────────────────┐
 │ Mode 1: Instant      │    │ Mode 2: Live Sandbox      │
 │ Deterministic Replay │    │ (FastAPI + Playwright     │
 │ (<3.0s Latency)      │    │  + Google AI Studio Free) │
 └──────────┬───────────┘    └─────────────┬─────────────┘
            │                              │
            ▼                              ▼
 ┌───────────────────────────────────────────────────────┐
 │               Schema-Bound AuditReport                │
 │       (product.md / INV-06 / INV-08 Conformance)      │
 └──────────────────────────┬────────────────────────────┘
                            │
                            ▼
 ┌───────────────────────────────────────────────────────┐
 │            Modular Split-Brain Command Center         │
 │   Eyes Pane (Vision/Patch/Voice) + Brain Pane (Cards) │
 └───────────────────────────────────────────────────────┘
```

### 3.2 Backend Service Architecture (`backend/`)
- **FastAPI Core (`backend/main.py`)**: Asynchronous, lightweight REST microservice runnable locally, on Hugging Face Spaces (Free 16GB RAM Docker tier), or Google Cloud Run.
- **Skills Pipeline (`backend/skills/`)**:
  - `BrowserSandboxSkill`: Ephemeral Chromium instance, mobile (`390x844`) or desktop (`1440x900`), capturing bounding boxes, layout intersections, network HAR, and console logs.
  - `TraceCorrelatorSkill`: Summarizes HAR spikes and console errors using Gemma 2 / Google AI Studio.
  - `OmniVisionSkill`: Multimodal visual bug localization using Gemini 2.5 Flash with strict `response_schema`, generating CSS patch directives and Before/After captures.
  - `GitPatchSkill`: Verifies file paths, AST integrity, and prepares unified diff and pull request metadata.

### 3.3 Live Customer Voice Orb with WebAudio / WebSpeech
- Browser native speech recognition in English and Hindi/Hinglish.
- Real-time `AudioContext` frequency analysis feeding the 30-bar waveform visualization.
- Ascending fifth harmonic chime (A4 440Hz -> E5 659.25Hz) synthesized via `OscillatorNode` for Lyria cue playback.

---

## 4. Invariant Impact Verification
- `INV-01` ($0.00 Zero-Budget): All inference uses Google AI Studio Free Tier keys or fallback mocks; hosting stays on free serverless/Docker tiers.
- `INV-03` (Zero-Selector Perception): Navigation and localisation are visual/semantic (`Gemini Omni` + ARIA tree); no hardcoded XPath/CSS selectors.
- `INV-04` (AST-Verified Patch): Diffs pass existence, parse, import, typecheck and blast-radius gates before a PR is proposed.
- `INV-05` (Mandatory Stack): Gemini Omni, Gemini Live, Gemma, Nano Banana, Lyria + Google AI Studio, Antigravity, Agent Skills.
- `INV-06` (Cost Ceiling): Cascade routing keeps blended cost ≤ $0.025 per audit.
- `INV-08` (Schema-Bound): All audit payloads validate against canonical `AuditReportPayload`.
- `INV-09` (Safe Ephemeral Sandbox): Isolated browser contexts destroyed after run.

---

## 5. Rollout Tasks
- `T-201`: Dual-Execution RFC and specification expansion.
- `T-202`: Modular frontend refactor (`src/types/`, `src/data/`, `src/components/`).
- `T-203`: Fast zero-budget Python backend with Google Agent Skills (`backend/`).
- `T-204`: Live WebAudio & WebSpeech integration in Voice Stage with Lyria audio cues.
- `T-205`: Automated benchmark verification test suite (`tests/`).
- `T-206`: CI spec gate workflow update (`.github/workflows/spec-gate.yml`).
- `T-207`: Spec lint and smoke test execution (`scripts/spec_lint.py`, `spec/smoke.md`).
- `T-208`: Agent milestone logging in `AGENT_LOG.md`.
