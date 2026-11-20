/**
 * Pramana AI — Google Cloud Run Server (100% Google Cloud + Firebase + Gemini Stack)
 * Serves /api/health, /api/audit, /api/patch, /api/telemetry, /api/upi/confirm on PORT (8080).
 * Executes ephemeral, read-only 390x844 iPhone 15 Playwright mobile captures (INV-09)
 * and passes the real rendered JPEG screenshot into Gemini 3.5 Flash-Lite multimodal vision.
 */

import http from 'node:http';
import healthHandler from '../api/health.js';
import auditHandler, { isBlockedSsrfHost } from '../api/audit.js';
import patchHandler from '../api/patch.js';
import telemetryHandler from '../api/telemetry.js';
import upiConfirmHandler from '../api/upi/confirm.js';

const PORT = Number(process.env.PORT || 8080);

let playwrightPromise = null;
async function getBrowser() {
  if (!playwrightPromise) {
    playwrightPromise = import('playwright-core')
      .then(({ chromium }) =>
        chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        })
      )
      .catch(() => null);
  }
  return playwrightPromise;
}

async function captureMobilePlaywrightEvidence(targetUrl) {
  let hostname = '';
  try {
    hostname = new URL(targetUrl).hostname.replace(/^www\./i, '');
  } catch {
    return null;
  }
  if (isBlockedSsrfHost(hostname)) return null;

  const browser = await getBrowser();
  if (!browser) return null;

  const started = Date.now();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1 PramanaAI-CloudRun/1.0',
  });

  const consoleErrors = [];
  const failedRequests = [];

  try {
    const page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error' && consoleErrors.length < 6) {
        consoleErrors.push(msg.text().slice(0, 140));
      }
    });
    page.on('response', (resp) => {
      if (resp.status() >= 400 && failedRequests.length < 6) {
        failedRequests.push(`${resp.status()} ${resp.url().slice(0, 90)}`);
      }
    });

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(1200);

    const buf = await page.screenshot({ type: 'jpeg', quality: 68, fullPage: false });
    const renderedScreenshotDataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;

    const layoutEval = await page.evaluate(() => {
      const vw = window.innerWidth || 390;
      const overflowing = [];
      const tinyTargets = [];
      const nodes = document.querySelectorAll('button, a, input, [role="button"]');
      for (const el of nodes) {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        if (rect.right > vw + 4 && overflowing.length < 3) {
          overflowing.push({
            tag: el.tagName.toLowerCase(),
            text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 48),
            rightPx: Math.round(rect.right),
            viewportPx: vw,
            snippet: el.outerHTML.slice(0, 130),
          });
        }
        if (rect.height < 32 && rect.width < 32 && tinyTargets.length < 3) {
          tinyTargets.push({
            tag: el.tagName.toLowerCase(),
            text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 48),
            size: `${Math.round(rect.width)}x${Math.round(rect.height)}px`,
            snippet: el.outerHTML.slice(0, 130),
          });
        }
      }
      return {
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: vw,
        overflowing,
        tinyTargets,
        hydratedTextLen: (document.body?.innerText || '').trim().length,
      };
    });

    const findings = [];
    if (layoutEval.scrollWidth > layoutEval.viewportWidth + 6 || layoutEval.overflowing.length > 0) {
      const first = layoutEval.overflowing[0];
      findings.push({
        id: 'RENDERED_MOBILE_HORIZONTAL_OVERFLOW',
        title: `390px mobile horizontal overflow detected (scrollWidth ${layoutEval.scrollWidth}px > ${layoutEval.viewportWidth}px)`,
        plainEnglishImpact:
          'Content or buttons extend past the 390px iPhone screen edge, causing clipped CTAs and awkward sideways scrolling.',
        severity: 'HIGH',
        claimType: 'OBSERVED_FACT',
        evidenceSource: 'RENDERED_BROWSER',
        role: first?.tag || 'document',
        accessibleName: first?.text || null,
        diagnosticSelector: first ? `${first.tag} (right=${first.rightPx}px > 390px)` : 'html, body',
        markupSnippet: first?.snippet || `document.documentElement.scrollWidth = ${layoutEval.scrollWidth}px`,
        confidence: 0.99,
        limitationNote: 'Measured in a real headless Chromium 390x844 mobile viewport on Google Cloud Run (INV-09).',
        remediationEligible: true,
        remediationSnippet: {
          del: first?.snippet || '/* Horizontal overflow > 390px */',
          add: '/* Add max-w-full overflow-x-hidden min-w-0 flex-wrap to the overflowing mobile container */',
        },
      });
    }

    if (consoleErrors.length > 0) {
      findings.push({
        id: 'RENDERED_CONSOLE_ERRORS',
        title: `${consoleErrors.length} JavaScript console error${consoleErrors.length === 1 ? '' : 's'} during mobile load`,
        plainEnglishImpact:
          'Runtime JavaScript exceptions on mobile load can silently break Add-to-Cart buttons, coupons, or checkout steps.',
        severity: 'HIGH',
        claimType: 'OBSERVED_FACT',
        evidenceSource: 'RENDERED_BROWSER',
        role: 'document',
        accessibleName: 'console',
        diagnosticSelector: 'window.console.error',
        markupSnippet: consoleErrors[0],
        confidence: 0.99,
        limitationNote: 'Captured directly from ephemeral Chromium console events on Google Cloud Run.',
        remediationEligible: true,
        remediationSnippet: {
          del: consoleErrors[0],
          add: '/* Guard null DOM references and handle failed API promises cleanly on mobile hydration */',
        },
      });
    }

    if (layoutEval.tinyTargets.length > 0) {
      const t = layoutEval.tinyTargets[0];
      findings.push({
        id: 'RENDERED_SMALL_TAP_TARGET',
        title: `Undersized mobile tap target (${t.size} < 44x44px recommended)`,
        plainEnglishImpact:
          'Buttons smaller than 44x44px are easy for mobile thumbs to miss, causing rage-taps and cart abandonment.',
        severity: 'MEDIUM',
        claimType: 'OBSERVED_FACT',
        evidenceSource: 'RENDERED_BROWSER',
        role: t.tag,
        accessibleName: t.text || null,
        diagnosticSelector: `${t.tag} (${t.size})`,
        markupSnippet: t.snippet,
        confidence: 0.96,
        limitationNote: 'Measured via getBoundingClientRect() in a real 390x844 Chromium mobile context.',
        remediationEligible: true,
        remediationSnippet: {
          del: t.snippet,
          add: '/* Ensure min-width: 44px; min-height: 44px; touch-action: manipulation; on interactive controls */',
        },
      });
    }

    return {
      engine: 'PLAYWRIGHT_CHROMIUM_CLOUD_RUN',
      latencyMs: Date.now() - started,
      renderedScreenshotDataUrl,
      metrics: {
        scrollWidth: layoutEval.scrollWidth,
        viewportWidth: layoutEval.viewportWidth,
        hydratedTextLen: layoutEval.hydratedTextLen,
        consoleErrorsCount: consoleErrors.length,
        failedRequestsCount: failedRequests.length,
      },
      findings,
    };
  } catch {
    return null;
  } finally {
    // INV-09: Unconditional ephemeral teardown
    await context.close().catch(() => {});
  }
}

function enhanceResponse(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
    }
    res.end(JSON.stringify(payload));
    return res;
  };
  return res;
}

async function readJsonBody(req) {
  if (req.method !== 'POST' && req.method !== 'PUT') return {};
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

const server = http.createServer(async (req, res) => {
  enhanceResponse(res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
  req.query = Object.fromEntries(parsedUrl.searchParams.entries());
  req.body = await readJsonBody(req);

  const p = parsedUrl.pathname;
  try {
    if (p === '/api/health' || p === '/health' || p === '/') {
      return await healthHandler(req, res);
    }
    if (p === '/api/audit') {
      const supplied =
        req.body?.url || req.body?.target_url || req.body?.targetUrl || req.query?.url || req.query?.target_url;
      if (supplied && !String(supplied).includes('zestkart.in') && !String(supplied).includes('scalegrid.io')) {
        const normalized = /^https?:\/\//i.test(String(supplied).trim())
          ? String(supplied).trim()
          : `https://${String(supplied).trim()}`;
        req._renderedCapture = await captureMobilePlaywrightEvidence(normalized);
      }
      return await auditHandler(req, res);
    }
    if (p === '/api/patch') return await patchHandler(req, res);
    if (p === '/api/telemetry') return await telemetryHandler(req, res);
    if (p === '/api/upi/confirm') return await upiConfirmHandler(req, res);

    res.status(404).json({ ok: false, error: 'NOT_FOUND', path: p });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'INTERNAL_ERROR', message: err instanceof Error ? err.message : 'error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Pramana AI Cloud Run Worker listening on :${PORT}`);
});
