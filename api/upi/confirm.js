/**
 * Vercel Serverless Function: GET/POST /api/upi/confirm
 * Real Serverless UPI Webhook Race Simulator for S2_UPI_TIMEOUT.
 * Broken state (fixed falsy) -> HTTP 504 Gateway Timeout (OrderNotFound).
 * Patched state (fixed truthy) -> HTTP 200 OK (PAID_RECONCILED).
 */

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const queryFixed = req.query?.fixed;
  const rawFixed = queryFixed !== undefined ? queryFixed : body.fixed;
  const isFixed = rawFixed === true || rawFixed === 'true' || rawFixed === '1';

  if (!isFixed) {
    return res.status(504).json({
      ok: false,
      status: 504,
      error: 'OrderNotFound',
      detail: 'webhook payment.captured received 212ms BEFORE order.created -> order_id = null',
      source: 'src/server/webhooks/upiConfirm.ts:27',
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(200).json({
    ok: true,
    status: 200,
    state: 'PAID_RECONCILED',
    orderId: 'ord_zest_4299',
    idempotencyKey: 'evt_upi_9921',
    reconcileJobQueuedMs: 250,
    timestamp: new Date().toISOString(),
  });
}
