# Agent Operating Instructions (Spec-Driven Development)

Before writing or modifying any code in `src/`:
1. Read `BRIEF.md` and `CONTRACT.md`. Never violate the $0 Zero-Budget invariant in `CONTRACT.md`.
2. Check `spec/product.md` and `spec/architecture.md` to ensure UI/backend changes match the spec.
3. Check `spec/tasks.md` for the active task and log completed milestones in `AGENT_LOG.md`.
4. Run `python scripts/spec_lint.py` and the checks in `spec/smoke.md` before committing.

Before modifying `scripts/`, read the same specification set and preserve the zero-budget and spec-first invariants.
