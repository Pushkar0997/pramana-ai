# Product Specification: Pramana AI

## Core 3-View Experience
1. **Zero-Auth Audit Bar:** Input URL + preset scenario pills (iPhone 15 Hindi Overflow, Safari UPI 504 Timeout, Desktop Dark-Mode Dead Click).
2. **Split-Brain Command Center:**
   - **Left Pane (The Eyes):** Live sandbox viewport toggling between Gemini Omni Live Vision, Nano Banana Visual Patch (Before/After), and Pramana Live Customer Voice Orb (Gemini Live + Lyria).
   - **Right Pane (The Brain):** 3 cards — Critical Revenue Leak Telemetry (Gemma), Google Agent Skills Execution Trace, and Self-Healed PR Diff (Google Antigravity).
3. **Proof-First Cold Outreach View:** Shareable founder proof card (`pramana.dev/proof/...`) with ROI calculator and 1-click cold email copy.

## User Personas and Jobs
- **SaaS engineering lead:** Verify visual and functional integrity across mobile and desktop after each deployment, without maintaining brittle selectors.
- **D2C growth lead:** Identify mobile checkout, localization, and payment callback leaks with evidence that engineers can act on.
- **Mobile customer:** Report a failure through a short voice interaction in English or Hinglish and link it to the affected UI node.

## Audit State Machine
`IDLE_READY` accepts a URL or one of `S1_HINDI_OVERFLOW`, `S2_UPI_TIMEOUT`, and `S3_DARKMODE_CONTRAST`.

It transitions to `AUDIT_RUNNING`, then `AUDIT_COMPLETE_SPLIT_BRAIN` after browser capture, visual/telemetry triage, visual patch synthesis, and AST-checked diff generation. The verified-fix action transitions the UI to `PR_MERGED_VERIFIED` and displays CI, commit, and compute-cost telemetry.
