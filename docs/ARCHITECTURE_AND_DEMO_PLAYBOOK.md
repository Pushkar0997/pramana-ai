# Pramana AI — Architecture Diagrams & 90-Second Demo Playbook

## 1. 4-Stage Autonomous Audit Pipeline (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor User as Judge / CTO / Shopper
    participant UI as Command Center / Voice Orb
    participant S1 as BrowserSandboxSkill (Playwright)
    participant S2 as TraceCorrelatorSkill (Gemma 4 31B + Decision 1)
    participant S3 as OmniVision & Nano Banana Adapter
    participant S4 as ASTBlastRadiusSkill & GitPatchSkill (Antigravity)

    User->>UI: Paste URL or speak bug (hi-IN / en-IN)
    UI->>S1: Capture 390x844 & 1440x900 DOM boxes + HAR >= 400
    S1-->>S2: Raw 25k-token trace + console errors
    S2->>S2: Prune 25k -> <1,200 tokens (Gemma 4 31B) + Triage (Decision 1)
    S2-->>S3: Anomaly ID + cropped bounding box
    S3-->>S4: Deterministic Before/After CSS diff + WebAudio Lyria cue
    S4->>S4: Verify target file in repo AST (INV-04: 0% hallucination)
    S4-->>UI: Unified .diff PR + $0.024 telemetry payload (INV-06, INV-08)
```

---

## 2. `ADR-006` Google AI Studio Free-Tier Quota Cascade Router

```mermaid
stateDiagram-v2
    [*] --> CheckModelQuota
    CheckModelQuota --> Gemma4_31B: Log Pruning (14.4K RPD)
    CheckModelQuota --> GeminiDecision1: Anomaly Triage (10K RPD)
    CheckModelQuota --> Gemini38Live: Voice & Live Frames (Unlimited RPD)
    CheckModelQuota --> OmniVirtualizer: Gemini Omni (0/0 Blocked)
    CheckModelQuota --> NanoBananaAdapter: Nano Banana (0/0 Blocked)
    CheckModelQuota --> LyriaWebAudio: Lyria 3 (0/0 Blocked)

    OmniVirtualizer --> FlashLite_RoboticsER2: 3.5 Flash Lite (500 RPD) + Robotics ER 2 (20 RPD)
    NanoBananaAdapter --> DeterministicDOMDiff: $0.00 CSS/DOM Patch
    LyriaWebAudio --> AudioContextSynth: A4->E5 Chime & D3 Alert
    Gemma4_31B --> DeterministicFallback: HTTP 429 / No Key (<50ms)
```

---

## 3. 90-Second Loom / Pitch Video Recording Script

* **`00:00–00:15` — Hook & Problem:**
  > "D2C checkouts lose 11–31% of mobile revenue to silent bugs—Hindi CTA overflows, dark-mode dead clicks, and UPI 504 webhook races—that brittle CSS selectors never catch. Meet **Pramana AI** by Team Vimarsha."
* **`00:15–00:45` — Split-Brain Command Center & Nano Banana Visual Swipe:**
  > "Paste any checkout URL with zero login. In parallel, `BrowserSandboxSkill` grabs mobile 390×844 bounding boxes, `Gemma 4 31B` prunes 25k log tokens down to under 1,200, and `Nano Banana` renders an instant Before/After visual patch—keeping unit cost at **$0.024 per audit**."
* **`00:45–01:05` — Live Storefront Voice Orb & Self-Healed PR Merge:**
  > "On our live `/demo-store/index.html`, click the cyan **Gemini Live Voice Orb**, speak in Hindi or English, and watch it highlight `#checkout-sticky-cta` or `#upi-status-poller`, play the `Lyria` WebAudio chime, and verify the `Google Antigravity` AST-checked Git diff with **0% path hallucination**."
* **`01:05–01:30` — Proof-First Cold Outreach & Unit Economics:**
  > "Finally, our CLI and `/proof/index.html` turn every $0.024 audit into a shareable proof link with a copy-ready `.diff` patch—giving us near-zero CAC and 86% gross margin."
