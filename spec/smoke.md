# Smoke Test Checklist

- [x] **SMK-01:** All 3 scenario pills update the Split-Brain Command Center state cleanly.
- [x] **SMK-02:** Gemini Omni, Nano Banana, and Gemini Live tabs render without console errors.
- [x] **SMK-03:** "Merge Verified Fix" button transitions to merged PR state.
- [x] **SMK-04:** Every scenario pill and the structured JSON payload carry their canonical `specId` (`[S1_HINDI_OVERFLOW]`, `[S2_UPI_TIMEOUT]`, `[S3_DARKMODE_CONTRAST]` / `"spec_id"`).
- [x] **SMK-05:** The Google Agent Skills card reports `4/4 deterministic skills passed` for all three scenarios, including `GitPatchSkill`.
- [x] **SMK-06:** Editing the audit URL rewrites the cold-email `To`, `Subject`, body and `pramana.dev/proof/...` slug with the derived brand, and the nav/stack bar read zero-cost (`Google AI Studio Free API`, `Zero-Cost Docker`).
