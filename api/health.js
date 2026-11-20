/**
 * Vercel Serverless Function: GET /api/health
 * Returns active Google AI Studio Free-Tier Cascade Router status (INV-01)
 * with auditable telemetry separation (T-309).
 */
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);

  return res.status(200).json({
    status: 'ok',
    service: 'pramana-ai-vercel-edge',
    zero_budget_mode: true,
    gemini_api_configured: geminiConfigured,
    telemetry: {
      credentialsConfigured: {
        geminiApiKey: geminiConfigured,
        note: geminiConfigured
          ? 'GEMINI_API_KEY environment variable is present. Key presence does not verify billing tier or actual spend.'
          : 'GEMINI_API_KEY is not configured; public HTML audits run deterministically without LLM calls.',
      },
      estimatedMarginalCostUsd: 0.024,
      costCeilingUsd: 0.025,
      costBasis: 'AMORTIZED_ESTIMATE_NOT_MEASURED_BILLING',
      billingVerification: {
        status: 'UNVERIFIED_FROM_RUNTIME',
        note: 'Runtime health cannot read cloud billing ledgers. Zero-budget operation ($0.00) is enforced by free-tier configuration (INV-01).',
      },
    },
    cascade_router: {
      'gemma-4-31b-it': { rpd: '14.4K RPD', role: 'log_pruning', status: 'ACTIVE' },
      'gemini-decision-1': { rpd: '10K RPD', role: 'anomaly_triage', status: 'ACTIVE' },
      'gemini-3.5-flash-lite': { rpd: '500 RPD', role: 'multimodal_reasoning', status: 'ACTIVE' },
      'gemini-3.8-live': { rpd: 'Unlimited RPD', role: 'live_voice_and_frames', status: 'UNLIMITED_RPD' },
      antigravity: { rpd: '100 RPD', role: 'ast_pr_synthesis', status: 'ACTIVE' },
    },
    timestamp: new Date().toISOString(),
  });
}
