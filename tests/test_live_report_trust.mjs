/**
 * Deterministic Regression Suite for RFC-20261117 (T-305, T-306, T-307, T-308, T-309, T-310).
 * Runs with Node's built-in test runner (`node --test tests/test_live_report_trust.mjs`) at $0.00 cost.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseLiveHtmlDocument,
  synthesizeCustomSiteAudit,
} from '../api/audit.js';
import {
  INITIAL_LIVE_AUDIT_STATE,
  normalizeAuditUrl,
  beginLiveAudit,
  resolveLiveAudit,
  failLiveAudit,
} from '../src/utils/liveAuditState.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

function readFixture(filename) {
  return fs.readFileSync(path.join(FIXTURES_DIR, filename), 'utf8');
}

test('T-305 / T-308: Apple-bag-like JS shell with heavy nav/footer MUST fail closed (zero false-PASS gate)', async () => {
  const html = readFixture('js_shell_with_heavy_nav.html');
  const url = 'https://www.apple.com/shop/bag';
  const parsed = parseLiveHtmlDocument(html, url, 200, 'text/html', 'edge', 142, null);
  const synthesized = await synthesizeCustomSiteAudit(url, 'apple.com', parsed, { skipLlm: true });

  // Surface classification: recognized as commerce bag/cart even without payment inputs
  assert.equal(parsed.surfaceInfo.surfaceType, 'COMMERCE_BAG_CART');
  assert.equal(parsed.surfaceInfo.isCommerceSurface, true);
  assert.equal(parsed.surfaceInfo.revenueMetricApplicable, false);

  // Hard zero false-PASS gate: MUST fail closed
  assert.equal(parsed.auditLimitation.limited, true);
  assert.equal(parsed.auditLimitation.code, 'CLIENT_SPA_SHELL');
  assert.equal(synthesized.customFinding.severity, 'UNVERIFIED');
  assert.notEqual(synthesized.customFinding.severity, 'PASS');
  assert.equal(synthesized.customFinding.domHealthScore, null);
  assert.equal(synthesized.customFinding.remediationEligible, false);
  assert.equal(synthesized.customFinding.remediationType, 'UNVERIFIED_REQUIRES_BROWSER_RUNTIME');

  // Revenue remains strictly null
  assert.equal(synthesized.customFinding.conversionDropPct, null);
  assert.equal(synthesized.customFinding.leakedMonthlyUsd, null);
});

test('T-305 / T-307 / T-308: Commerce product discovery page classified properly with evidence-grounded missing-alt finding', async () => {
  const html = readFixture('commerce_product_page.html');
  const url = 'https://www.apple.com/shop/buy-iphone';
  const parsed = parseLiveHtmlDocument(html, url, 200, 'text/html', 'edge', 180, null);
  const synthesized = await synthesizeCustomSiteAudit(url, 'apple.com', parsed, { skipLlm: true });

  assert.equal(parsed.surfaceInfo.surfaceType, 'COMMERCE_PRODUCT_DISCOVERY');
  assert.equal(parsed.auditLimitation.limited, false);
  assert.equal(synthesized.customFinding.severity, 'MEDIUM');
  assert.equal(synthesized.customFinding.revenueMetricApplicable, false);
  assert.equal(synthesized.customFinding.conversionDropPct, null);
  assert.equal(synthesized.customFinding.leakedMonthlyUsd, null);

  // Grounded finding for missing alt images
  const imgFinding = synthesized.customFinding.findings.find((f) => f.id === 'IMAGES_MISSING_ALT');
  assert.ok(imgFinding, 'Expected IMAGES_MISSING_ALT finding');
  assert.equal(imgFinding.claimType, 'OBSERVED_FACT');
  assert.equal(imgFinding.evidenceSource, 'STATIC_HTML');
  assert.equal(imgFinding.role, 'img');
  assert.match(imgFinding.markupSnippet, /<img\b/i);
  assert.equal(synthesized.customFinding.remediationEligible, true);
  assert.equal(synthesized.customFinding.remediationTargetFindingId, 'IMAGES_MISSING_ALT');
});

test('T-305 / T-307 / T-308: Commerce bag route without payment inputs classified as COMMERCE_BAG_CART and grounds unlabeled input', async () => {
  const html = readFixture('commerce_bag_no_payment.html');
  const url = 'https://shop.example-d2c.in/shop/bag';
  const parsed = parseLiveHtmlDocument(html, url, 200, 'text/html', 'edge', 110, null);
  const synthesized = await synthesizeCustomSiteAudit(url, 'shop.example-d2c.in', parsed, { skipLlm: true });

  assert.equal(parsed.surfaceInfo.surfaceType, 'COMMERCE_BAG_CART');
  assert.equal(parsed.auditLimitation.limited, false);
  assert.equal(synthesized.customFinding.revenueMetricApplicable, false);
  assert.equal(synthesized.customFinding.conversionDropPct, null);

  const inputFinding = synthesized.customFinding.findings.find((f) => f.id === 'UNLABELED_FORM_INPUTS');
  assert.ok(inputFinding, 'Expected UNLABELED_FORM_INPUTS finding');
  assert.equal(inputFinding.claimType, 'OBSERVED_FACT');
  assert.equal(inputFinding.evidenceSource, 'STATIC_HTML');
  assert.equal(synthesized.customFinding.remediationTargetFindingId, 'UNLABELED_FORM_INPUTS');
});

test('T-308: Accessible static info page returns PASS, null revenue, and suppresses unnecessary fix', async () => {
  const html = readFixture('static_accessible_info.html');
  const url = 'https://example.com/guide';
  const parsed = parseLiveHtmlDocument(html, url, 200, 'text/html', 'edge', 45, null);
  const synthesized = await synthesizeCustomSiteAudit(url, 'example.com', parsed, { skipLlm: true });

  assert.equal(parsed.auditLimitation.limited, false);
  assert.equal(synthesized.customFinding.severity, 'PASS');
  assert.equal(synthesized.customFinding.domHealthScore, 99);
  assert.equal(synthesized.customFinding.remediationEligible, false);
  assert.equal(synthesized.customFinding.conversionDropPct, null);
  assert.equal(synthesized.customFinding.capabilityScope, 'STATIC_HTML_ONLY');
});

test('T-308: Upstream 401/403, 429, 500, and timeout errors all fail closed with UNVERIFIED and null score', async () => {
  for (const [status, expectedCode, err] of [
    [401, 'AUTH_OR_BOT_WALL', null],
    [403, 'AUTH_OR_BOT_WALL', null],
    [429, 'UPSTREAM_HTTP_ERROR', null],
    [500, 'UPSTREAM_HTTP_ERROR', null],
    [0, 'UNREACHABLE_OR_TIMEOUT', 'AbortError'],
  ]) {
    const parsed = parseLiveHtmlDocument('', 'https://target.example/checkout', status, 'text/html', 'edge', 200, err);
    const synthesized = await synthesizeCustomSiteAudit('https://target.example/checkout', 'target.example', parsed, { skipLlm: true });

    assert.equal(parsed.auditLimitation.limited, true, `Status ${status} must be limited`);
    assert.equal(parsed.auditLimitation.code, expectedCode);
    assert.equal(synthesized.customFinding.severity, 'UNVERIFIED');
    assert.equal(synthesized.customFinding.domHealthScore, null);
    assert.equal(synthesized.customFinding.remediationEligible, false);
  }
});

test('T-309: Auditable telemetry separates credentials, provider calls, amortized estimate, measured tokens, and billing verification', async () => {
  const html = readFixture('static_accessible_info.html');
  const parsed = parseLiveHtmlDocument(html, 'https://example.com/', 200, 'text/html', 'edge', 30, null);
  const synthesized = await synthesizeCustomSiteAudit('https://example.com/', 'example.com', parsed, { skipLlm: true });

  const tel = synthesized.telemetry;
  assert.equal(typeof tel.credentialsConfigured, 'boolean');
  assert.deepEqual(tel.providerCalls, []);
  assert.equal(tel.providerCallCount, 0);
  assert.ok(tel.estimatedMarginalCostUsd <= tel.costCeilingUsd);
  assert.equal(tel.costBasis, 'AMORTIZED_ESTIMATE_NOT_MEASURED_BILLING');
  assert.equal(tel.measuredTokenUsage.available, false);
  assert.equal(tel.billingVerification.status, 'UNVERIFIED_FROM_API_KEY');
});

test('T-306: Honest pending state, full-URL binding, error handling, and out-of-order response guard on same hostname', () => {
  // 1. Begin request for apple.com/shop/buy-iphone -> stays pending with result === null
  const s1 = beginLiveAudit(INITIAL_LIVE_AUDIT_STATE, 'https://www.apple.com/shop/buy-iphone', 1000);
  assert.equal(s1.status, 'pending');
  assert.equal(s1.result, null);
  assert.equal(s1.submittedUrl, 'https://www.apple.com/shop/buy-iphone');

  // 2. User immediately submits apple.com/shop/bag (same hostname, different path!)
  const s2 = beginLiveAudit(s1, 'https://www.apple.com/shop/bag', 1200);
  assert.equal(s2.status, 'pending');
  assert.equal(s2.requestId, s1.requestId + 1);
  assert.equal(s2.submittedUrl, 'https://www.apple.com/shop/bag');

  // 3. Stale response for request 1 (buy-iphone) arrives late -> MUST be ignored!
  const afterStale = resolveLiveAudit(s2, s1.requestId, { targetUrl: 'https://www.apple.com/shop/buy-iphone', customFinding: { severity: 'MEDIUM' } });
  assert.equal(afterStale.status, 'pending');
  assert.equal(afterStale.result, null);

  // 4. Matching response for request 2 (bag) settles cleanly
  const bagPayload = { targetUrl: 'https://www.apple.com/shop/bag', customFinding: { severity: 'UNVERIFIED', domHealthScore: null } };
  const s3 = resolveLiveAudit(afterStale, s2.requestId, bagPayload);
  assert.equal(s3.status, 'settled');
  assert.equal(s3.result.targetUrl, 'https://www.apple.com/shop/bag');
  assert.equal(s3.result.customFinding.severity, 'UNVERIFIED');

  // 5. Network failure transitions cleanly to error with result === null
  const s4 = beginLiveAudit(s3, 'https://unreachable.example/pay', 2000);
  const s5 = failLiveAudit(s4, s4.requestId, 'Failed to fetch');
  assert.equal(s5.status, 'error');
  assert.equal(s5.result, null);
  assert.match(s5.error, /Failed to fetch/);

  // 6. URL normalization preserves paths cleanly
  assert.equal(normalizeAuditUrl('apple.com/shop/bag/'), 'https://apple.com/shop/bag');
});

test('Startup / Vibe-Coded / Small D2C detector flags dead links, boilerplate title, CLS images, and generates AI Fix Prompt + Founder Outreach', async () => {
  const vibeHtml = `<!doctype html><html><head><title>Vite + React</title></head><body>
    <main>
      <h1>FreshD2C</h1>
      <a href="#">Buy Now</a>
      <a href="javascript:void(0)">Apply Coupon</a>
      <input type="email" />
      <img src="/p1.png" /><img src="/p2.png" alt="a" /><img src="/p3.png" alt="b" /><img src="/p4.png" alt="c" /><img src="/p5.png" alt="d" />
    </main>
  </body></html>`;
  const parsed = parseLiveHtmlDocument(vibeHtml, 'https://freshd2c.in/checkout', 200, 'text/html', 'edge', 95, null);
  const synthesized = await synthesizeCustomSiteAudit('https://freshd2c.in/checkout', 'freshd2c.in', parsed, { skipLlm: true });

  const ids = synthesized.customFinding.findings.map((f) => f.id);
  assert.ok(ids.includes('DEAD_OR_PLACEHOLDER_LINKS'), 'Expected DEAD_OR_PLACEHOLDER_LINKS');
  const deadLinkFinding = synthesized.customFinding.findings.find((f) => f.id === 'DEAD_OR_PLACEHOLDER_LINKS');
  assert.match(deadLinkFinding.title, /javascript:void\(0\)/i, 'Title should mention javascript:void(0) when matched');
  assert.match(deadLinkFinding.diagnosticSelector, /javascript:/i, 'Diagnostic selector should reflect javascript: hrefs');
  assert.equal(synthesized.telemetry.estimatedMarginalCostUsd, 0, 'Deterministic fallback (0 LLM calls) must report $0.00 estimated marginal cost');
  assert.ok(ids.includes('VIBE_CODE_BOILERPLATE_TITLE'), 'Expected VIBE_CODE_BOILERPLATE_TITLE');
  assert.ok(ids.includes('IMAGES_MISSING_DIMENSIONS_CLS'), 'Expected IMAGES_MISSING_DIMENSIONS_CLS');
  assert.ok(synthesized.customFinding.findings.every((f) => Boolean(f.plainEnglishImpact)), 'Every finding must have plainEnglishImpact');
  assert.match(synthesized.customFinding.aiFixPrompt, /freshd2c\.in/);
  assert.equal(synthesized.customFinding.founderOutreachMessage, undefined, 'Public API must not expose internal outreach leads');
  assert.match(parsed.mobilePreviewHtml, /pramana-live-xray/);
});

test('Security & Rendered-Browser Gate: Zero client-side API keys in src/vite.config, and real renderedCapture lifts JS-shell limitation', async () => {
  const viteCfg = fs.readFileSync(path.join(__dirname, '..', 'vite.config.js'), 'utf8');
  const appSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.jsx'), 'utf8');
  assert.doesNotMatch(viteCfg, /VITE_GEMINI_API_KEY\s*["']\s*:\s*JSON\.stringify/, 'Must not bundle GEMINI_API_KEY into client dist');
  assert.doesNotMatch(appSrc, /generativelanguage\.googleapis\.com/, 'Browser code must never call Gemini API directly with client key');

  const html = readFixture('js_shell_with_heavy_nav.html');
  const url = 'https://www.apple.com/shop/bag';
  const parsed = parseLiveHtmlDocument(html, url, 200, 'text/html', 'edge', 140, null);
  const renderedCapture = {
    engine: 'PLAYWRIGHT_CHROMIUM_CLOUD_RUN',
    renderedScreenshotDataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    metrics: { accessibilityScore: 84, scrollWidth: 420, viewportWidth: 390, consoleErrorsCount: 1 },
    findings: [
      {
        id: 'RENDERED_MOBILE_HORIZONTAL_OVERFLOW',
        title: '390px mobile horizontal overflow detected',
        plainEnglishImpact: 'Content extends past 390px viewport.',
        severity: 'HIGH',
        claimType: 'OBSERVED_FACT',
        evidenceSource: 'RENDERED_BROWSER',
        role: 'button',
        diagnosticSelector: 'button.checkout',
        markupSnippet: '<button class="checkout">Check Out</button>',
        remediationEligible: true,
        remediationSnippet: { del: '<button class="checkout">', add: '<button class="checkout max-w-full">' },
      },
    ],
  };
  const synthesized = await synthesizeCustomSiteAudit(url, 'apple.com', parsed, { skipLlm: true, renderedCapture });
  assert.equal(synthesized.customFinding.capabilityScope, 'RENDERED_MOBILE_BROWSER');
  assert.equal(synthesized.customFinding.auditMode, 'LIVE_RENDERED_BROWSER_AUDIT');
  assert.equal(synthesized.customFinding.domHealthScore, 84);
  assert.equal(synthesized.customFinding.severity, 'HIGH');
  assert.equal(synthesized.customFinding.revenueMetricApplicable, false);
});


