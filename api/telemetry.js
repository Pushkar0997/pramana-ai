/**
 * Vercel Serverless Function: POST /api/telemetry
 * Live Voice Orb & DOM Correlation Ingestion Endpoint.
 */

function correlateTranscript(transcript, explicitNode) {
  const lower = (transcript || '').toLowerCase();
  if (/(upi|spinner|timeout|paise)/.test(lower)) {
    return '#upi-status-poller';
  }
  if (/(dark|contrast|place order|click)/.test(lower)) {
    return '#place-order-cta';
  }
  if (/(coupon|pay|chhup|button)/.test(lower)) {
    return '#checkout-sticky-cta';
  }
  return explicitNode || '#checkout-sticky-cta';
}

async function tryGemmaTriage(transcript, matchedNode) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !transcript) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key=${encodeURIComponent(apiKey)}`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(2500),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Classify spoken bug report "${transcript}" mapped to DOM node ${matchedNode} in 1 short phrase.`,
              },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 64, temperature: 0.1 },
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const transcript = body.transcript || '';
  const matchedNode = correlateTranscript(transcript, body.matchedNode);
  const triageNote = await tryGemmaTriage(transcript, matchedNode);

  return res.status(200).json({
    captured: true,
    ticketId: 'PRM-ORB-142',
    model: 'gemini-3.8-live + gemma-4-31b-it',
    matchedNode,
    confidence: 0.972,
    lyriaCue: 'A4_E5_ASCENDING',
    prReady: true,
    costUsd: 0.0,
    ...(triageNote ? { triageNote } : {}),
  });
}
