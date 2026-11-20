# Pramana AI — Google Cloud Run Playwright + Gemini Worker

This container runs all 5 `/api/*` endpoints (`api/health.js`, `api/audit.js`, `api/patch.js`, `api/telemetry.js`, `api/upi/confirm.js`) inside Google Cloud Run with a real headless **Playwright Chromium `390×844` iPhone 15 mobile browser** (`INV-09` ephemeral context) and passes the real rendered JPEG screenshot directly into **`gemini-3.5-flash-lite` multimodal vision** server-side (with `GEMINI_API_KEY` stored strictly as a Cloud Run env/secret, never exposed to the browser).

## Deploy to Google Cloud Run (Buildathon GCP Credits)

1. Install Google Cloud CLI (`gcloud`) and link your Buildathon billing credits to project `pramana-ai`.
2. Run from the repository root:

```powershell
.\cloudrun\deploy-cloudrun.ps1 -ProjectId "pramana-ai" -Region "asia-south1" -GeminiApiKey "<YOUR_ROTATED_GEMINI_API_KEY>"
```

3. Connect Firebase Hosting (`firebase.json`) natively to Cloud Run so `https://pramana-ai-b83d2.web.app/api/**` proxies inside Google Cloud with zero CORS:

```json
"rewrites": [
  {
    "source": "/api/**",
    "run": {
      "serviceId": "pramana-ai-api",
      "region": "asia-south1"
    }
  },
  {
    "source": "**",
    "destination": "/index.html"
  }
]
```

Then run `npm run build && npx -y firebase-tools@latest deploy --only hosting --project pramana-ai`.
