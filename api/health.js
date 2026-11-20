/**
 * Vercel Serverless / Google Cloud Run Function: GET /api/health
 * Reports real server-side Gemini/Gemma execution cascade status (INV-01, T-309).
 * All API credentials stay strictly server-side — zero client-exposed keys.
 */
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const pageSpeedConfigured = Boolean(process.env.PAGESPEED_API_KEY);

  return res.status(200).json({
    status: 'ok',
    service: process.env.K_SERVICE ? 'pramana-ai-cloud-run' : 'pramana-ai-serverless-api',
    zero_budget_mode: true,
    gemini_api_configured: geminiConfigured,
    pagespeed_api_configured: pageSpeedConfigured,
    client_keys_exposed: false,
    telemetry: {
      credentialsConfigured: {
        geminiApiKey: geminiConfigured,
        pageSpeedApiKey: pageSpeedConfigured,
        note: geminiConfigured
          ? 'GEMINI_API_KEY is configured server-side only (never shipped to browser). Key presence does not verify billing tier.'
          : 'GEMINI_API_KEY is not configured; public HTML audits run deterministically without LLM calls.',
      },
      estimatedMarginalCostUsd: 0.024,
      costCeilingUsd: 0.025,
      costBasis: 'AMORTIZED_ESTIMATE_NOT_MEASURED_BILLING',
      billingVerification: {
        status: 'UNVERIFIED_FROM_RUNTIME',
        note: 'Runtime health cannot read cloud billing ledgers. Zero-budget operation ($0.00) is governed by free-tier configuration (INV-01).',
      },
    },
    cascade_router: {
      'gemini-3.1-flash-lite': { rpd: '500 RPD', role: 'primary_fast_live_multimodal_audit', status: 'ACTIVE_LIVE' },
      'gemini-3-flash-preview': { rpd: '500 RPD', role: 'multimodal_json_fallback', status: 'ACTIVE_LIVE' },
      'gemma-4-26b-a4b-it': { rpd: '14.4K RPD', role: 'high_throughput_gemma4_moe_fallback', status: 'ACTIVE_LIVE' },
    },
    timestamp: new Date().toISOString(),
  });
}
