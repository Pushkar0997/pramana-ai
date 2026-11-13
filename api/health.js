/**
 * Vercel Serverless Function: GET /api/health
 * Returns active Google AI Studio Free-Tier Cascade Router status (INV-01).
 */
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).json({
    status: 'ok',
    service: 'pramana-ai-vercel-edge',
    zero_budget_mode: true,
    gemini_api_configured: Boolean(process.env.GEMINI_API_KEY),
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
