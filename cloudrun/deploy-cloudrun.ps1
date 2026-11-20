# One-command Google Cloud Run deploy for Pramana AI (100% Google Cloud + Firebase + Gemini)
# Usage:
#   .\cloudrun\deploy-cloudrun.ps1 -ProjectId "pramana-ai" -Region "asia-south1" -GeminiApiKey "<NEW_ROTATED_KEY>"
param(
  [string]$ProjectId = "pramana-ai",
  [string]$Region = "asia-south1",
  [string]$ServiceName = "pramana-ai-api",
  [Parameter(Mandatory=$true)][string]$GeminiApiKey,
  [string]$PageSpeedApiKey = ""
)

$ErrorActionPreference = "Stop"

Write-Host "Deploying $ServiceName to Google Cloud Run ($ProjectId / $Region)..." -ForegroundColor Cyan

# Build container image with Cloud Build using cloudrun/Dockerfile from repo root
$image = "gcr.io/$ProjectId/$ServiceName:latest"
gcloud builds submit --project $ProjectId --config - . @"
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-f', 'cloudrun/Dockerfile', '-t', '$image', '.']
images:
  - '$image'
"@

$envVars = "GEMINI_API_KEY=$GeminiApiKey"
if ($PageSpeedApiKey) {
  $envVars = "$envVars,PAGESPEED_API_KEY=$PageSpeedApiKey"
}

gcloud run deploy $ServiceName `
  --project $ProjectId `
  --region $Region `
  --image $image `
  --platform managed `
  --allow-unauthenticated `
  --memory 2Gi `
  --cpu 1 `
  --timeout 60 `
  --set-env-vars $envVars

Write-Host "Cloud Run deploy complete! Next, set VITE_API_BASE to the Cloud Run URL (or add the Firebase Hosting 'run' rewrite in firebase.json) and redeploy Firebase Hosting." -ForegroundColor Green
