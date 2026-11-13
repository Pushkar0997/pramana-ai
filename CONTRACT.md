# System Contract & Invariants (DO NOT VIOLATE)

1. **Strict Zero-Budget ($0.00) Infrastructure:**
   - All model inference MUST run through **Google AI Studio Free Tier API** (Gemini, Gemma, Nano Banana) or local weights—zero paid billing APIs.
   - Frontend hosting MUST run on **Vercel Free Tier** or **GitHub Pages**.
   - Headless browser sandboxes MUST run locally, on **GitHub Actions**, or on **Hugging Face Spaces (Free Docker tier)** + **Firebase Spark (Free No-Card Plan)**.
2. **Zero-Auth Instant Value:** The landing view MUST allow pasting a URL and triggering an audit without forcing a login wall.
3. **Mandatory Google DeepMind Tool Alignment:**
   - **Tools:** Google AI Studio, Google Antigravity, Google Agent Skills.
   - **Models:** Gemini Omni, Gemini Live, Gemma, Nano Banana, Lyria.
4. **No Brittle Selectors:** Navigation and assertions rely on multimodal visual + semantic comprehension, never hardcoded XPath strings.

5. **AST-Verified Patches:** Generated changes must reference existing files and valid syntax before a pull request is proposed.
6. **Schema-Bound Pipeline:** Inter-agent payloads must use deterministic JSON schemas; free-form prose is not an inter-stage API.
7. **Safe Sandbox Isolation:** Browser runs use ephemeral contexts, cleared storage, safe mutations only, and a strict execution timeout.
8. **Spec-First Delivery:** Changes under `src/` must map to an active task in `spec/tasks.md` and pass `python scripts/spec_lint.py`.
