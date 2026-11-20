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
