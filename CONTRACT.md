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
