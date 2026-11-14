---
title: Pramana AI Sandbox Engine
emoji: ⚡
colorFrom: cyan
colorTo: slate
sdk: docker
app_port: 7860
pinned: false
---

# Pramana AI — Zero-Cost Sandbox & Skills Engine

Stateless FastAPI + Playwright + Google Agent Skills backend (`BrowserSandboxSkill`, `TraceCorrelatorSkill`, `OmniVisionVirtualizer`, `ASTBlastRadiusSkill`, `GitPatchSkill`).

## 1. Free 16GB RAM Deployment on Hugging Face Spaces (INV-01: $0.00)
1. Create a new **Space** on Hugging Face with **SDK: Docker** and **CPU Basic (16 GB RAM, Free)**.
2. Push the `backend/` directory contents (`Dockerfile`, `requirements.txt`, `main.py`, `skills/`, `README.md`).
3. Optional: Add `GEMINI_API_KEY` (Google AI Studio Free Tier) in **Space Settings → Variables and secrets**. If omitted or rate-limited (`HTTP 429`), the engine automatically falls back to deterministic `Pramana-Bench-v1` fixtures.
4. Health check: `GET /api/v1/health` on port `7860`.

## 2. 1-Command Deployment on Google Cloud Run (OCI-Compatible)
`Dockerfile` binds to `${PORT:-7860}`, so the same container deploys directly to Cloud Run:

```bash
gcloud run deploy pramana-engine \
  --source ./backend \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_aistudio_free_key
```

## 3. Local Run
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 7860
```
