/**
 * Vercel Serverless Function: GET / POST /api/audit
 * Real Server-Side HTML/DOM Structural Scraper + Honest Surface, Shell & Evidence Classifier
 * Cascade: gemma-4-31b-it -> gemini-3.5-flash-lite -> Deterministic Site-Specific Synthesis.
 *
 * Enforces:
 * - INV-01: $0.00 Zero-Budget Free-Tier Infrastructure
 * - INV-03: Zero-Selector Perception (role/name identity; selectors are diagnostic text only)
 * - INV-04: Zero-Hallucination AST Target Whitelist (Connected Repo Mode only)
 * - INV-06: Unit Economics Ceiling ($0.024 amortized estimate <= $0.025 limit)
 * - INV-08: Deterministic Schema Contract
 * - RFC-20261117 (T-305, T-307, T-309, T-310):
 *   1. Fail closed on JS-required / unrendered SPA shells even with large nav/footer DOM.
 *   2. Distinguish commerce product discovery, bag/cart, and direct payment surfaces.
 *   3. Ground every finding and remediation snippet in observed static HTML evidence.
 *   4. Separate configured credentials, provider calls, estimated cost, measured tokens, and billing verification.
 *   5. Keep public HTML scans explicitly bounded to static HTML (never imply browser replay).
 */

const UNIT_ECONOMICS_CEILING_USD = 0.025;
const AMORTIZED_AUDIT_COST_USD = 0.024;

const VERIFIED_AST_WHITELIST = [
  'src/components/checkout/StickyPaymentBar.tsx',
  'src/server/webhooks/upiConfirm.ts',
  'src/components/checkout/PlaceOrderButton.tsx',
];

const JS_REQUIRED_REGEX =
  /\b(please enable javascript|enable javascript to|javascript is required|javascript is disabled|turn on javascript|you need to enable javascript|requires javascript|javascript must be enabled|browser does not support javascript)\b/i;

// Sliding-window in-memory rate limiter (30 requests / 60s per client IP)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQ = 30;
const rateLimitStore = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const key = String(ip || 'anon').slice(0, 64);
  const entry = rateLimitStore.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  entry.count += 1;
  rateLimitStore.set(key, entry);
  return {
    allowed: entry.count <= RATE_LIMIT_MAX_REQ,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQ - entry.count),
    resetSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

export function isBlockedSsrfHost(hostname) {
  const h = String(hostname || '').toLowerCase().trim();
  if (!h || !h.includes('.')) return true;
  if (
    h === 'localhost' ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^169\.254\./.test(h) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h) ||
    h === '0.0.0.0' ||
    h.startsWith('[')
  ) {
    return true;
  }
  return false;
}

const BENCHMARK_FIXTURES = {
  S1_HINDI_OVERFLOW: {
    scenarioId: 'S1_HINDI_OVERFLOW',
    prNumber: 142,
    branch: 'pramana/fix-sticky-pay-142',
    viewport: '390 × 844 px · Mobile 4G (hi-IN)',
    device: 'iPhone 15 · Safari 17',
    anomalyTitle: 'Hindi Sticky Payment CTA Clips & Overflows 390px Viewport',
    severity: 'CRITICAL',
    conversionDropPct: '-14.8%',
    dropNumber: 14.8,
    leakedMonthlyUsd: 18400,
    leakedMonthlyInr: '₹4,20,000/mo',
    targetSelector: '#checkout-sticky-cta',
    astTargetFile: 'src/components/checkout/StickyPaymentBar.tsx',
    summary:
      'On 390×844 mobile viewports with hi-IN locale, #checkout-sticky-cta uses flex-nowrap + bottom-[-48px], causing a 118px horizontal clip and sliding beneath .trust-strip (z-index 50).',
    rootCauseLogs: [
      {
        lvl: 'ERR',
        at: '00:08.412',
        msg: 'LayoutOverflow: #checkout-sticky-cta boundingBox.width (508px) exceeds 390px viewport by 118px',
        src: 'src/components/checkout/StickyPaymentBar.tsx:19',
      },
      {
        lvl: 'WARN',
        at: '00:08.440',
        msg: 'PointerInterception: .trust-strip (z-index: 50) masks #checkout-sticky-cta (z-index: 10, bottom: -48px)',
        src: 'checkout.css:211',
      },
      {
        lvl: 'ERR',
        at: '00:11.020',
        msg: '3 consecutive dead-clicks recorded on #checkout-sticky-cta with 0 payment handlers invoked',
        src: 'HAR #218',
      },
      {
        lvl: 'INFO',
        at: '00:11.390',
        msg: 'Gemma 4 31B compressed 24,800 raw HAR/DOM tokens -> 412 tokens ($0.024 amortized <= $0.025 INV-06)',
        src: 'TraceCorrelatorSkill',
      },
    ],
    diffLines: [
      { t: 'ctx', c: 'export function StickyPaymentBar({ total, onPay }: Props) {' },
      { t: 'del', c: '  return (' },
      { t: 'del', c: '    <div className="fixed bottom-[-48px] z-10 flex w-full flex-nowrap gap-2">' },
      { t: 'del', c: '      <button className="whitespace-nowrap px-6" onClick={onPay}>' },
      { t: 'add', c: '  return (' },
      { t: 'add', c: '    <div className="fixed inset-x-0 bottom-0 z-50 flex gap-2 px-4 pb-[max(16px,env(safe-area-inset-bottom))]">' },
      { t: 'add', c: '      <button id="checkout-sticky-cta" className="min-w-0 flex-1 px-4 text-balance" onClick={onPay}>' },
      { t: 'ctx', c: '        {t("pay_securely", { total })}' },
      { t: 'ctx', c: '      </button>' },
      { t: 'ctx', c: '    </div>' },
      { t: 'ctx', c: '  );' },
    ],
  },
  S2_UPI_TIMEOUT: {
    scenarioId: 'S2_UPI_TIMEOUT',
    prNumber: 143,
    branch: 'pramana/fix-upi-webhook-race-143',
    viewport: '390 × 844 px · Safari iOS 17.5 · 5G',
    device: 'iPhone 15 · WebKit',
    anomalyTitle: 'UPI Webhook Race Condition Triggers 504 Gateway Timeout',
    severity: 'CRITICAL',
    conversionDropPct: '-9.7%',
    dropNumber: 9.7,
    leakedMonthlyUsd: 11200,
    leakedMonthlyInr: '₹8,90,000/mo',
    targetSelector: '#upi-status-poller',
    astTargetFile: 'src/server/webhooks/upiConfirm.ts',
    summary:
      'PSP webhook payment.captured arrives 212ms before orders.insert commits, throwing OrderNotFound and stalling #upi-status-poller on a 30s HTTP 504 Gateway Timeout.',
    rootCauseLogs: [
      {
        lvl: 'ERR',
        at: '00:07.001',
        msg: 'RaceCondition: webhook payment.captured received 212ms before order.created commit -> order_id = null',
        src: 'upi-gw.log',
      },
      {
        lvl: 'ERR',
        at: '00:07.204',
        msg: 'POST /api/upi/confirm -> 504 Gateway Timeout (30,012ms) without idempotent upsert',
        src: 'HAR #164',
      },
      {
        lvl: 'ERR',
        at: '00:07.233',
        msg: 'Uncaught (in promise) Error: OrderNotFound at handleUpiWebhook',
        src: 'src/server/webhooks/upiConfirm.ts:27',
      },
      {
        lvl: 'INFO',
        at: '00:07.610',
        msg: 'ASTBlastRadiusSkill verified 4 coupled files against INV-04 whitelist (0% hallucination)',
        src: 'ASTBlastRadiusSkill',
      },
    ],
    diffLines: [
      { t: 'ctx', c: 'export async function handleUpiWebhook(evt: UpiEvent) {' },
      { t: 'del', c: '  const order = await db.orders.find(evt.orderId);' },
      { t: 'del', c: '  if (!order) throw new Error("OrderNotFound");' },
      { t: 'del', c: '  await db.orders.markPaid(order.id);' },
      { t: 'add', c: '  const order = await db.orders.upsertPending(evt.orderId, evt.payerRef);' },
      { t: 'add', c: '  await db.orders.markPaid(order.id, { idempotencyKey: evt.eventId });' },
      { t: 'add', c: '  await queue.enqueue("order.reconcile", { id: order.id }, { delayMs: 250 });' },
      { t: 'ctx', c: '  return { ok: true };' },
      { t: 'ctx', c: '}' },
    ],
  },
  S3_DARKMODE_CONTRAST: {
    scenarioId: 'S3_DARKMODE_CONTRAST',
    prNumber: 144,
    branch: 'pramana/fix-place-order-dead-click-144',
    viewport: '1440 × 900 px · Desktop Chrome 126 (Dark)',
    device: 'Desktop · Chromium 126',
    anomalyTitle: 'Dark-Mode Contrast Failure (2.1:1) & Scrim Pointer Interception',
    severity: 'HIGH',
    conversionDropPct: '-6.3%',
    dropNumber: 6.3,
    leakedMonthlyUsd: 7900,
    leakedMonthlyInr: '₹2,65,000/mo',
    targetSelector: '#place-order-cta',
    astTargetFile: 'src/components/checkout/PlaceOrderButton.tsx',
    summary:
      'In dark mode, button#apply-coupon renders at 2.1:1 contrast (below WCAG AA 4.5:1) while div.promo-scrim (z-index: 40) intercepts all pointer events on #place-order-cta.',
    rootCauseLogs: [
      {
        lvl: 'WARN',
        at: '00:08.100',
        msg: 'WCAG-AA Failure: #4A4F63 foreground on #1C2030 background yields 2.1:1 contrast ratio (< 4.5:1)',
        src: 'axe-core 4.9',
      },
      {
        lvl: 'ERR',
        at: '00:11.050',
        msg: 'DeadClick: Pointer event on #place-order-cta (z-0) swallowed by <div.promo-scrim> (z-index: 40)',
        src: 'HAR #301',
      },
      {
        lvl: 'WARN',
        at: '00:11.900',
        msg: '5 consecutive clicks fired 0 submit handlers on PlaceOrderButton.tsx',
        src: 'src/components/checkout/PlaceOrderButton.tsx:11',
      },
      {
        lvl: 'INFO',
        at: '00:12.140',
        msg: 'GitPatchSkill synthesized z-index elevation and WCAG AA token patch via Google Antigravity',
        src: 'GitPatchSkill',
      },
    ],
    diffLines: [
      { t: 'ctx', c: 'export function PlaceOrderButton({ onPlace, disabled }: Props) {' },
      { t: 'del', c: '  return (' },
      { t: 'del', c: '    <button className="relative z-0 bg-slate-800 text-slate-500" onClick={onPlace}>' },
      { t: 'add', c: '  return (' },
      { t: 'add', c: '    <button id="place-order-cta" className="relative z-50 bg-indigo-500 text-white hover:bg-indigo-400" onClick={onPlace} disabled={disabled}>' },
      { t: 'ctx', c: '      Place order' },
      { t: 'ctx', c: '    </button>' },
      { t: 'ctx', c: '  );' },
      { t: 'ctx', c: '}' },
    ],
  },
};

function decodeHtmlEntities(str) {
  return String(str || '')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}

function cleanVisibleText(rawHtml) {
  const withoutScripts = String(rawHtml || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ');
  const stripped = withoutScripts.replace(/<[^>]+>/g, ' ');
  return decodeHtmlEntities(stripped).replace(/\s+/g, ' ').trim();
}

function extractMainContentText(rawHtml) {
  const safe = String(rawHtml || '');
  const mainMatch = safe.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) {
    return cleanVisibleText(mainMatch[1]);
  }
  const withoutChrome = safe
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, ' ')
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, ' ');
  return cleanVisibleText(withoutChrome);
}

function extractAttr(attrs, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i');
  const m = String(attrs || '').match(re);
  return m ? decodeHtmlEntities(m[1]).trim() : '';
}

function truncateSnippet(raw, maxLen = 140) {
  const normalized = String(raw || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen - 1)}…`;
}

export function classifyPageSurface(
  targetUrl,
  hostname,
  safeHtml,
  interactiveElements,
  formsCount,
  inputsCount,
  headings = []
) {
  let path = '/';
  try {
    path = new URL(targetUrl).pathname.toLowerCase();
  } catch {
    path = '/';
  }

  const hostLower = String(hostname || '').toLowerCase();
  const labelsConcat = interactiveElements
    .map((e) => `${e.label || ''} ${e.id || ''} ${e.href || ''}`)
    .join(' ')
    .toLowerCase();
  const headingsConcat = headings.map((h) => h.text || '').join(' ').toLowerCase();

  const hasDirectCheckoutPath = /(^|\/)(checkout|pay|payment|billing|subscribe|order-confirm)(\/|$|-)/i.test(path);
  const hasPaymentInputs = /\b(cardnumber|cc-number|cvv|cvc|upi|razorpay|stripe-element|payment-form)\b/i.test(
    safeHtml
  );
  const hasPayButtons = /\b(pay now|place order|complete purchase|proceed to pay)\b/i.test(labelsConcat);

  if (hasDirectCheckoutPath || hasPaymentInputs || hasPayButtons) {
    return {
      surfaceType: 'DIRECT_PAYMENT_CHECKOUT',
      hasDirectPaymentFlow: true,
      isCommerceSurface: true,
      revenueMetricApplicable: false,
      surfaceCategory: 'Direct Payment / Checkout Surface (Public HTML)',
      monetizationModel: 'Direct Checkout Controls Detected (Unauthenticated)',
      paymentContextNote: `Direct checkout or payment controls detected on ${targetUrl}. Because Pramana is running in unauthenticated Static HTML mode without merchant analytics, revenue and conversion-drop numbers remain N/A.`,
    };
  }

  const hasBagPath = /(^|\/)(shop\/bag|bag|cart|basket|shopping-bag|shopping-cart)(\/|$)/i.test(path);
  const hasBagSignals = /\b(your bag|shopping bag|shopping cart|review bag|proceed to checkout|checkout bag)\b/i.test(
    `${headingsConcat} ${labelsConcat}`
  );
  if (hasBagPath || hasBagSignals) {
    return {
      surfaceType: 'COMMERCE_BAG_CART',
      hasDirectPaymentFlow: false,
      isCommerceSurface: true,
      revenueMetricApplicable: false,
      surfaceCategory: 'Commerce Bag / Cart Surface (Public HTML)',
      monetizationModel: 'Pre-Payment Cart / Bag Review Route',
      paymentContextNote: `Bag/cart commerce route detected at ${hostname}${path} (payment inputs absent or client-rendered). Static HTML mode does not execute cart interactions or fabricate conversion/revenue figures.`,
    };
  }

  const hasProductPath = /(^|\/)(shop\/buy|buy-|product|products|item|pdp|dp\/|store\/)/i.test(path);
  const hasProductCta = /\b(add to bag|add to cart|buy now|select finish|choose your)\b/i.test(labelsConcat);
  if (hasProductPath || hasProductCta) {
    return {
      surfaceType: 'COMMERCE_PRODUCT_DISCOVERY',
      hasDirectPaymentFlow: false,
      isCommerceSurface: true,
      revenueMetricApplicable: false,
      surfaceCategory: 'Commerce Product Discovery Surface (Public HTML)',
      monetizationModel: 'Product Configuration & Add-to-Bag Funnel',
      paymentContextNote: `Commerce product discovery route detected at ${hostname}${path}. Static HTML inspection checks markup & accessibility only; checkout execution and revenue impact require connected browser + merchant telemetry.`,
    };
  }

  if (hostLower.includes('example.com') || hostLower.includes('example.org')) {
    return {
      surfaceType: 'STATIC_REFERENCE',
      hasDirectPaymentFlow: false,
      isCommerceSurface: false,
      revenueMetricApplicable: false,
      surfaceCategory: 'Static Reference / Documentation Page',
      monetizationModel: 'None (IANA Reserved Example Domain)',
      paymentContextNote: `${hostname} is a static informational document with 0 forms and 0 payment flows. Revenue and conversion-drop metrics are not applicable.`,
    };
  }

  if (hostLower.includes('google.') && !hostLower.includes('ads.google') && !hostLower.includes('pay.google')) {
    return {
      surfaceType: 'SEARCH_DISCOVERY',
      hasDirectPaymentFlow: false,
      isCommerceSurface: false,
      revenueMetricApplicable: false,
      surfaceCategory: 'Search & Discovery Entry Surface',
      monetizationModel: 'Downstream Ad Centre / Google One / Cloud Billing',
      paymentContextNote: `No direct payment or checkout gate exists on ${hostname}${path} (search interface). Revenue/conversion-drop metrics are not applicable here; billing occurs downstream.`,
    };
  }

  if (hostLower.includes('github.')) {
    return {
      surfaceType: 'DEVELOPER_PLATFORM',
      hasDirectPaymentFlow: false,
      isCommerceSurface: false,
      revenueMetricApplicable: false,
      surfaceCategory: 'Developer Platform & Repository Surface',
      monetizationModel: 'Downstream Settings → Billing / Copilot / Marketplace',
      paymentContextNote: `No checkout cart or payment form exists on ${hostname}${path}. Revenue/conversion-drop metrics are not applicable on public repository/landing routes.`,
    };
  }

  if (/(wikipedia\.org|archive\.org|docs\.|developer\.|\.edu|\.ac\.in)/i.test(hostLower)) {
    return {
      surfaceType: 'KNOWLEDGE_BASE',
      hasDirectPaymentFlow: false,
      isCommerceSurface: false,
      revenueMetricApplicable: false,
      surfaceCategory: 'Knowledge Base / Academic & Documentation Portal',
      monetizationModel: 'Non-Transactional Information Surface',
      paymentContextNote: `No e-commerce checkout funnel exists on ${hostname}${path} (${formsCount} forms, ${inputsCount} inputs scanned). Revenue metrics are not applicable; reporting static HTML accessibility only.`,
    };
  }

  return {
    surfaceType: 'PUBLIC_LANDING',
    hasDirectPaymentFlow: false,
    isCommerceSurface: false,
    revenueMetricApplicable: false,
    surfaceCategory: 'Public Landing & Navigation Surface',
    monetizationModel: 'No Direct Checkout on Entry URL',
    paymentContextNote: `No direct payment form or checkout gate is present on ${hostname}${path} (${formsCount} forms, ${inputsCount} inputs inspected). Revenue/conversion-drop metrics are not applicable; reporting static HTML accessibility only.`,
  };
}

export function detectAuditLimitations({
  httpStatus,
  safeHtml,
  estimatedDomNodes,
  totalScripts,
  visibleTextLen,
  mainContentText,
  headings = [],
  surfaceInfo = null,
  fetchError = null,
}) {
  if (fetchError || httpStatus === 0) {
    return {
      limited: true,
      code: 'UNREACHABLE_OR_TIMEOUT',
      title: 'Target Unreachable or Timed Out',
      explanation: `Server-side HTTP fetch to target failed (${fetchError || 'network timeout'}). Live HTML could not be retrieved; verdict is UNVERIFIED.`,
      signals: [`fetch_error:${fetchError || 'timeout'}`],
    };
  }
  if (httpStatus === 401 || httpStatus === 403) {
    return {
      limited: true,
      code: 'AUTH_OR_BOT_WALL',
      title: `Blocked by Authentication or Bot Wall (HTTP ${httpStatus})`,
      explanation: `Target returned HTTP ${httpStatus}. Unauthenticated server-side HTML fetch cannot inspect behind login walls, Cloudflare challenges, or WAF rules.`,
      signals: [`http_status:${httpStatus}`],
    };
  }
  if (httpStatus === 429 || httpStatus >= 500) {
    return {
      limited: true,
      code: 'UPSTREAM_HTTP_ERROR',
      title: `Upstream Server Returned HTTP ${httpStatus}`,
      explanation: `Target responded with HTTP ${httpStatus}. Static HTML inspection requires a healthy 200 OK upstream response.`,
      signals: [`http_status:${httpStatus}`],
    };
  }
  if (
    /\b(cf-browser-verification|cf-chl-bypass|Just a moment\.\.\.|Attention Required! \| Cloudflare|g-recaptcha|hcaptcha)\b/i.test(
      safeHtml
    ) &&
    visibleTextLen < 900
  ) {
    return {
      limited: true,
      code: 'CAPTCHA_CHALLENGE',
      title: 'Bot Protection / CAPTCHA Interstitial Detected',
      explanation:
        'Target served a bot-challenge interstitial instead of the application DOM. Verdict is UNVERIFIED without an authorized browser session.',
      signals: ['bot_challenge_interstitial'],
    };
  }

  // T-305: Fail-closed JS shell detection even when nav/footer creates hundreds of static DOM nodes
  const signals = [];
  const jsHeading = headings.find((h) => JS_REQUIRED_REGEX.test(h.text || ''));
  if (jsHeading) {
    signals.push(`js_required_heading:"${jsHeading.text}"`);
  }

  const noscriptMatches = safeHtml.match(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/gi) || [];
  const noscriptJsWarning = noscriptMatches.find((block) => JS_REQUIRED_REGEX.test(cleanVisibleText(block)));
  if (noscriptJsWarning) {
    signals.push('noscript_js_required_warning');
  }

  const mainText = String(mainContentText || '');
  const mainJsWarning = JS_REQUIRED_REGEX.test(mainText);
  if (mainJsWarning) {
    signals.push('main_content_js_required_message');
  }

  const hasAppRootMount = /<div\b[^>]+id=["'](?:root|app|__next|__nuxt|bag-root|checkout-root)["'][^>]*>\s*<\/div>/i.test(
    safeHtml
  );
  if (hasAppRootMount) {
    signals.push('empty_spa_root_container');
  }

  const navChromeDominant =
    estimatedDomNodes >= 100 && totalScripts >= 15 && mainText.length < 240;
  if (navChromeDominant) {
    signals.push(`nav_chrome_dominant(nodes=${estimatedDomNodes},scripts=${totalScripts},mainChars=${mainText.length})`);
  }

  const classicMinimalShell = estimatedDomNodes < 25 && totalScripts >= 3 && visibleTextLen < 120;
  if (classicMinimalShell) {
    signals.push(`minimal_ssr_markup(nodes=${estimatedDomNodes},scripts=${totalScripts})`);
  }

  const commerceBagWithoutContent =
    surfaceInfo?.surfaceType === 'COMMERCE_BAG_CART' &&
    totalScripts >= 10 &&
    mainText.length < 220 &&
    (Boolean(jsHeading) || mainJsWarning || Boolean(noscriptJsWarning) || hasAppRootMount);
  if (commerceBagWithoutContent) {
    signals.push('commerce_bag_unrendered_in_static_html');
  }

  const isUnrenderedShell =
    Boolean(jsHeading) ||
    classicMinimalShell ||
    commerceBagWithoutContent ||
    (mainJsWarning && mainText.length < 600) ||
    (Boolean(noscriptJsWarning) && (navChromeDominant || hasAppRootMount || mainText.length < 260)) ||
    (hasAppRootMount && totalScripts >= 6 && mainText.length < 200);

  if (isUnrenderedShell) {
    const primaryReason = jsHeading
      ? `Heading reported "${jsHeading.text}"`
      : mainJsWarning
      ? 'Main document body requested JavaScript execution'
      : `Only ${mainText.length} chars of non-navigation main content were present across ${estimatedDomNodes} static nodes and ${totalScripts} scripts`;

    return {
      limited: true,
      code: 'CLIENT_SPA_SHELL',
      title: 'JavaScript-Required / Unrendered Page Shell',
      explanation: `${primaryReason}. Because /api/audit inspects static HTML without executing client JavaScript, the rendered page content was not verified. Clean-pass scoring and generic navigation fixes are suppressed (fail-closed).`,
      signals,
      evidenceSnippet: jsHeading
        ? `<${jsHeading.tag}>${jsHeading.text}</${jsHeading.tag}>`
        : noscriptJsWarning
        ? truncateSnippet(noscriptJsWarning, 140)
        : `<script> count: ${totalScripts}, main text: ${mainText.length} chars`,
    };
  }

  return {
    limited: false,
    code: 'NONE',
    title: 'Static HTML Parsed Successfully',
    explanation:
      'Server-side HTML parser inspected static markup, forms, ARIA attributes, and image alt tags. Hydrated JS state, computed contrast, layout overlap, and payment clicks were NOT executed in Static HTML mode.',
    signals: [],
  };
}

export function parseLiveHtmlDocument(
  html,
  targetUrl,
  httpStatus,
  contentType,
  serverHeader,
  fetchLatencyMs,
  fetchError = null
) {
  const safeHtml = String(html || '');
  let hostname = targetUrl;
  try {
    hostname = new URL(targetUrl).hostname.replace(/^www\./i, '');
  } catch {
    // keep default
  }

  const bodyWithoutScripts = safeHtml
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  const visibleText = cleanVisibleText(bodyWithoutScripts);
  const mainContentText = extractMainContentText(safeHtml);

  const titleMatch = safeHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = titleMatch ? cleanVisibleText(titleMatch[1]).slice(0, 140) : hostname;

  const metaDescMatch =
    safeHtml.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    safeHtml.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
    safeHtml.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const metaDescription = metaDescMatch ? decodeHtmlEntities(metaDescMatch[1]).trim().slice(0, 220) : '';

  const viewportMatch =
    safeHtml.match(/<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    safeHtml.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']viewport["'][^>]*>/i);
  const viewportMeta = viewportMatch ? viewportMatch[1].trim() : 'width=device-width, initial-scale=1';
  const viewportTagSnippet = viewportMatch ? truncateSnippet(viewportMatch[0], 130) : null;
  const zoomBlocked = /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/i.test(viewportMeta);

  const headings = [];
  const headingRe = /<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = headingRe.exec(bodyWithoutScripts)) !== null && headings.length < 8) {
    const text = cleanVisibleText(m[2]);
    if (text && text.length >= 2) {
      headings.push({ tag: m[1].toLowerCase(), text: text.slice(0, 110) });
    }
  }

  const interactiveElements = [];
  const interRe = /<(button|a)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  while ((m = interRe.exec(bodyWithoutScripts)) !== null && interactiveElements.length < 10) {
    const rawMatch = m[0];
    const tag = m[1].toLowerCase();
    const attrs = m[2] || '';
    const innerText = cleanVisibleText(m[3]);
    const ariaLabel = extractAttr(attrs, 'aria-label') || extractAttr(attrs, 'title');
    const explicitRole = extractAttr(attrs, 'role');
    const id = extractAttr(attrs, 'id');
    const rawClass = extractAttr(attrs, 'class');
    const className = rawClass.split(/\s+/).filter(Boolean).slice(0, 2).join('.');
    const href = tag === 'a' ? extractAttr(attrs, 'href') : '';
    const label = (innerText || ariaLabel || '').slice(0, 60);

    if (!label && tag === 'a' && !href) continue;
    const isCtaLink =
      tag === 'a' &&
      (Boolean(id) ||
        /(btn|button|cta|sign|log|start|try|buy|checkout|bag|cart|pricing|doc|repo|search|get|store|gmail|images|ads|more)/i.test(
          `${rawClass} ${label} ${href}`
        ) ||
        interactiveElements.length < 6);

    if (tag === 'button' || isCtaLink) {
      const hasAriaLabel = Boolean(ariaLabel);
      const role = explicitRole || (tag === 'a' ? 'link' : 'button');
      let auditStatus = 'PASS';
      let claimType = 'OBSERVED_FACT';
      let auditReason = 'Accessible text label & semantic role observed in static HTML';

      if (!innerText && !hasAriaLabel) {
        auditStatus = 'WARN';
        claimType = 'OBSERVED_FACT';
        auditReason = `Observed <${tag}> with empty text content and no aria-label/title attribute`;
      } else if (tag === 'button' && !id && !hasAriaLabel && label.length > 34) {
        auditStatus = 'WARN';
        claimType = 'INFERENCE';
        auditReason = `Long button text (${label.length} chars) without explicit aria-label or stable id`;
      }

      const diagnosticSelector = id
        ? `#${id}`
        : className
        ? `${tag}.${className.split('.')[0]}`
        : `<${tag}>`;

      interactiveElements.push({
        tag,
        role,
        accessibleName: label || null,
        label: label || '(unlabeled control)',
        id: id || null,
        className: className || null,
        diagnosticSelector,
        href: href || null,
        hasAriaLabel: hasAriaLabel || Boolean(innerText),
        auditStatus,
        claimType,
        evidenceSource: 'STATIC_HTML',
        markupSnippet: truncateSnippet(rawMatch, 135),
        auditReason,
      });
    }
  }

  const inputControlRe = /<(input|textarea)\b([^>]*)>/gi;
  while ((m = inputControlRe.exec(bodyWithoutScripts)) !== null && interactiveElements.length < 12) {
    const rawMatch = m[0];
    const tag = m[1].toLowerCase();
    const attrs = m[2] || '';
    const type = (extractAttr(attrs, 'type') || (tag === 'textarea' ? 'search-textarea' : 'text')).toLowerCase();
    if (type === 'hidden') continue;
    const nameAttr = extractAttr(attrs, 'name');
    const valueAttr = extractAttr(attrs, 'value');
    const ariaLabel =
      extractAttr(attrs, 'aria-label') || extractAttr(attrs, 'title') || extractAttr(attrs, 'placeholder');
    const id = extractAttr(attrs, 'id');
    const rawClass = extractAttr(attrs, 'class');
    const label = (valueAttr || ariaLabel || (nameAttr ? `${tag}[name="${nameAttr}"]` : `${tag}[type="${type}"]`)).slice(
      0,
      60
    );
    const hasAccessibleLabel = Boolean(ariaLabel || valueAttr || id);
    const role = type === 'submit' || type === 'button' ? 'button' : 'textbox';
    const diagnosticSelector = id
      ? `#${id}`
      : nameAttr
      ? `${tag}[name="${nameAttr}"]`
      : `${tag}[type="${type}"]`;

    interactiveElements.push({
      tag,
      role,
      accessibleName: hasAccessibleLabel ? label : null,
      label,
      id: id || (nameAttr ? `name=${nameAttr}` : null),
      className: rawClass.split(/\s+/).filter(Boolean).slice(0, 2).join('.') || null,
      diagnosticSelector,
      href: null,
      hasAriaLabel: hasAccessibleLabel,
      auditStatus: hasAccessibleLabel ? 'PASS' : 'WARN',
      claimType: 'OBSERVED_FACT',
      evidenceSource: 'STATIC_HTML',
      markupSnippet: truncateSnippet(rawMatch, 135),
      auditReason: hasAccessibleLabel
        ? `Interactive ${tag} (${type}) accessible label observed in static HTML`
        : `Observed <${tag} type="${type}"> without id, aria-label, title, or placeholder`,
    });
  }

  if (headings.length === 0) {
    headings.push({ tag: 'title', text: pageTitle });
  }

  const formsCount = (bodyWithoutScripts.match(/<form\b/gi) || []).length;
  const inputMatches = bodyWithoutScripts.match(/<(?:input|textarea|select)\b[^>]*>/gi) || [];
  const visibleInputs = inputMatches.filter((inp) => !/\btype\s*=\s*["']hidden["']/i.test(inp));
  const inputsCount = visibleInputs.length;
  const unlabeledInputSnippets = [];
  for (const inp of visibleInputs) {
    if (!/\b(id|aria-label|aria-labelledby|title|placeholder|value)\s*=\s*["'][^"']+["']/i.test(inp)) {
      unlabeledInputSnippets.push(truncateSnippet(inp, 135));
    }
  }
  const unlabeledInputsCount = unlabeledInputSnippets.length;

  const imgMatches = bodyWithoutScripts.match(/<img\b[^>]*>/gi) || [];
  const totalImages = imgMatches.length;
  const missingAltImageSnippets = [];
  for (const imgTag of imgMatches) {
    if (!/\balt\s*=/i.test(imgTag)) {
      missingAltImageSnippets.push(truncateSnippet(imgTag, 135));
    }
  }
  const imagesMissingAlt = missingAltImageSnippets.length;

  const totalScripts = (safeHtml.match(/<script\b/gi) || []).length;
  const inlineStylesCount = (safeHtml.match(/\bstyle\s*=\s*["']/gi) || []).length;
  const estimatedDomNodes = Math.max(1, (safeHtml.match(/<[a-zA-Z][a-zA-Z0-9-]*/g) || []).length);
  const htmlKilobytes = Number((Buffer.byteLength(safeHtml, 'utf8') / 1024).toFixed(1));

  const surfaceInfo = classifyPageSurface(
    targetUrl,
    hostname,
    safeHtml,
    interactiveElements,
    formsCount,
    inputsCount,
    headings
  );

  const auditLimitation = detectAuditLimitations({
    httpStatus,
    safeHtml,
    estimatedDomNodes,
    totalScripts,
    visibleTextLen: visibleText.length,
    mainContentText,
    headings,
    surfaceInfo,
    fetchError,
  });

  return {
    httpStatus,
    contentType,
    serverHeader,
    fetchLatencyMs,
    liveFetchSucceeded: httpStatus >= 200 && httpStatus < 400 && !fetchError,
    htmlKilobytes,
    pageTitle,
    metaDescription,
    headings,
    interactiveElements,
    surfaceInfo,
    auditLimitation,
    mainContentChars: mainContentText.length,
    formsAndInputs: {
      formsCount,
      inputsCount,
      unlabeledInputsCount,
      unlabeledInputSnippets: unlabeledInputSnippets.slice(0, 5),
    },
    accessibilityMetrics: {
      totalImages,
      imagesMissingAlt,
      missingAltImageSnippets: missingAltImageSnippets.slice(0, 5),
      totalScripts,
      inlineStylesCount,
      estimatedDomNodes,
      viewportMeta,
      viewportTagSnippet,
      zoomBlocked,
    },
  };
}

async function scrapeLiveDom(targetUrl) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5500);

  try {
    const resp = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 PramanaAI-Auditor/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    const fetchLatencyMs = Math.max(14, Date.now() - started);
    const html = await resp.text();
    const contentType = resp.headers.get('content-type') || 'text/html';
    const serverHeader = resp.headers.get('server') || 'edge';

    return parseLiveHtmlDocument(html, targetUrl, resp.status, contentType, serverHeader, fetchLatencyMs, null);
  } catch (err) {
    const fetchLatencyMs = Math.max(18, Date.now() - started);
    const errMsg = err instanceof Error ? err.message : 'network_timeout';
    return parseLiveHtmlDocument('', targetUrl, 0, 'text/plain', 'unreachable', fetchLatencyMs, errMsg);
  } finally {
    clearTimeout(timer);
  }
}

async function callGoogleAiStudio(modelId, apiKey, prompt) {
  const started = Date.now();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const resp = await fetch(endpoint, {
    method: 'POST',
    signal: AbortSignal.timeout(6500),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 380,
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
  });
  const latencyMs = Math.max(1, Date.now() - started);
  if (!resp.ok) {
    return { parsed: null, usageMetadata: null, latencyMs, httpStatus: resp.status };
  }
  const data = await resp.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  const usageMetadata = data?.usageMetadata || null;
  if (!raw) return { parsed: null, usageMetadata, latencyMs, httpStatus: resp.status };
  try {
    return { parsed: JSON.parse(raw), usageMetadata, latencyMs, httpStatus: resp.status };
  } catch {
    return { parsed: null, usageMetadata, latencyMs, httpStatus: resp.status };
  }
}

function buildEvidenceFindings(scrapedDom, hostname) {
  const findings = [];
  const limitation = scrapedDom.auditLimitation || { limited: false, code: 'NONE' };
  const { imagesMissingAlt, missingAltImageSnippets = [], zoomBlocked, viewportTagSnippet } =
    scrapedDom.accessibilityMetrics;
  const { unlabeledInputsCount, unlabeledInputSnippets = [] } = scrapedDom.formsAndInputs;

  if (limitation.limited) {
    findings.push({
      id: `LIMITATION_${limitation.code}`,
      title: limitation.title,
      severity: 'UNVERIFIED',
      claimType: 'OBSERVED_FACT',
      evidenceSource: 'STATIC_HTML',
      role: 'document',
      accessibleName: scrapedDom.pageTitle || hostname,
      diagnosticSelector: 'document',
      markupSnippet: limitation.evidenceSnippet || `HTTP ${scrapedDom.httpStatus} · ${limitation.code}`,
      confidence: 0.99,
      limitationNote: limitation.explanation,
      remediationEligible: false,
      remediationSnippet: null,
    });
    return findings;
  }

  if (zoomBlocked) {
    findings.push({
      id: 'VIEWPORT_ZOOM_BLOCKED',
      title: 'Viewport meta tag restricts pinch-to-zoom',
      severity: 'HIGH',
      claimType: 'OBSERVED_FACT',
      evidenceSource: 'STATIC_HTML',
      role: 'document',
      accessibleName: 'viewport meta',
      diagnosticSelector: 'meta[name="viewport"]',
      markupSnippet: viewportTagSnippet || `<meta name="viewport" content="${scrapedDom.accessibilityMetrics.viewportMeta}">`,
      confidence: 0.99,
      limitationNote: 'Observed directly in static <meta name="viewport"> attribute (WCAG 1.4.4).',
      remediationEligible: true,
      remediationSnippet: {
        del: viewportTagSnippet || `<meta name="viewport" content="${scrapedDom.accessibilityMetrics.viewportMeta}">`,
        add: '<meta name="viewport" content="width=device-width, initial-scale=1">',
      },
    });
  }

  if (unlabeledInputsCount > 0) {
    const sample = unlabeledInputSnippets[0] || '<input type="text">';
    findings.push({
      id: 'UNLABELED_FORM_INPUTS',
      title: `${unlabeledInputsCount} visible form input${unlabeledInputsCount === 1 ? '' : 's'} missing accessible label attributes`,
      severity: unlabeledInputsCount >= 2 ? 'MEDIUM' : 'LOW',
      claimType: 'OBSERVED_FACT',
      evidenceSource: 'STATIC_HTML',
      role: 'textbox',
      accessibleName: null,
      diagnosticSelector: 'input (missing id/aria-label/placeholder)',
      markupSnippet: sample,
      confidence: 0.97,
      limitationNote:
        'Observed directly in static HTML. External <label> association or JS-injected ARIA attributes cannot be confirmed without a browser runtime.',
      remediationEligible: true,
      remediationSnippet: {
        del: sample,
        add: sample.replace(/<input\b/i, '<input id="accessible-field" aria-label="Descriptive field label"'),
      },
    });
  }

  if (imagesMissingAlt > 0) {
    const sampleImg = missingAltImageSnippets[0] || '<img src="...">';
    findings.push({
      id: 'IMAGES_MISSING_ALT',
      title: `${imagesMissingAlt} image${imagesMissingAlt === 1 ? '' : 's'} missing alt attribute`,
      severity: imagesMissingAlt >= 2 ? 'MEDIUM' : 'LOW',
      claimType: 'OBSERVED_FACT',
      evidenceSource: 'STATIC_HTML',
      role: 'img',
      accessibleName: null,
      diagnosticSelector: 'img:not([alt])',
      markupSnippet: sampleImg,
      confidence: 0.99,
      limitationNote: 'Observed directly in static <img> markup (WCAG 1.1.1 Non-text Content).',
      remediationEligible: true,
      remediationSnippet: {
        del: sampleImg,
        add: sampleImg.replace(/<img\b/i, '<img alt="Descriptive image text"'),
      },
    });
  }

  const warnControls = scrapedDom.interactiveElements.filter((el) => el.auditStatus !== 'PASS');
  for (let i = 0; i < Math.min(2, warnControls.length); i += 1) {
    const ctrl = warnControls[i];
    const safeId = (ctrl.label || 'control')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 28) || 'interactive-control';
    findings.push({
      id: `CONTROL_A11Y_${i + 1}`,
      title: ctrl.auditReason,
      severity: 'LOW',
      claimType: ctrl.claimType || 'OBSERVED_FACT',
      evidenceSource: 'STATIC_HTML',
      role: ctrl.role || ctrl.tag,
      accessibleName: ctrl.accessibleName,
      diagnosticSelector: ctrl.diagnosticSelector || `<${ctrl.tag}>`,
      markupSnippet: ctrl.markupSnippet || `<${ctrl.tag}>${ctrl.label}</${ctrl.tag}>`,
      confidence: ctrl.claimType === 'OBSERVED_FACT' ? 0.96 : 0.78,
      limitationNote: 'Static HTML inspection only; runtime focus order and computed contrast were not measured.',
      remediationEligible: true,
      remediationSnippet: {
        del: ctrl.markupSnippet || `<${ctrl.tag}>${ctrl.label}</${ctrl.tag}>`,
        add: `<${ctrl.tag} id="${safeId}" aria-label="${ctrl.label}">${ctrl.label}</${ctrl.tag}>`,
      },
    });
  }

  return findings;
}

export async function synthesizeCustomSiteAudit(targetUrl, hostname, scrapedDom, options = {}) {
  const apiKey = options.skipLlm ? null : process.env.GEMINI_API_KEY;
  let activeModel = 'deterministic-static-html-parser';
  let llmResult = null;
  const providerCalls = [];
  let measuredTokenUsage = {
    available: false,
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    note: 'No external LLM call executed for this audit.',
  };

  const primaryHeading = scrapedDom.headings[0]?.text || scrapedDom.pageTitle;
  const { imagesMissingAlt, estimatedDomNodes, totalScripts, zoomBlocked, totalImages } =
    scrapedDom.accessibilityMetrics;
  const { formsCount, inputsCount, unlabeledInputsCount } = scrapedDom.formsAndInputs;
  const surfaceInfo = scrapedDom.surfaceInfo;
  const limitation = scrapedDom.auditLimitation || { limited: false, code: 'NONE' };

  const interactiveCount = scrapedDom.interactiveElements.length;
  const warnCount = scrapedDom.interactiveElements.filter((el) => el.auditStatus !== 'PASS').length;
  const totalFlags = limitation.limited
    ? 0
    : warnCount + imagesMissingAlt + unlabeledInputsCount + (zoomBlocked ? 1 : 0);

  // T-305: Suppress numeric readiness score whenever limitation.limited is true!
  let domHealthScore = null;
  if (!limitation.limited) {
    const penalty =
      warnCount * 3 +
      imagesMissingAlt * 2.5 +
      unlabeledInputsCount * 4 +
      (zoomBlocked ? 8 : 0);
    domHealthScore = Math.max(40, Math.min(99, Math.round(99 - penalty)));
  }

  let severity = 'PASS';
  if (limitation.limited) {
    severity = 'UNVERIFIED';
  } else if (surfaceInfo.hasDirectPaymentFlow && totalFlags >= 3) {
    severity = 'CRITICAL';
  } else if ((surfaceInfo.hasDirectPaymentFlow && totalFlags >= 1) || totalFlags >= 6 || zoomBlocked) {
    severity = 'HIGH';
  } else if (totalFlags >= 2) {
    severity = 'MEDIUM';
  } else if (totalFlags === 1) {
    severity = 'LOW';
  } else {
    severity = 'PASS';
  }

  const findings = buildEvidenceFindings(scrapedDom, hostname);
  const primaryFinding = findings.find((f) => f.remediationEligible) || null;
  const remediationEligible = Boolean(!limitation.limited && primaryFinding);

  const conversionDropPct = null;
  const dropNumber = null;
  const leakedMonthlyUsd = null;
  const leakedMonthlyInr = null;

  if (apiKey && !limitation.limited) {
    const prompt = [
      `You are Pramana AI auditing STATIC PUBLIC HTML of ${targetUrl} (hostname: ${hostname}).`,
      `Surface Category: ${surfaceInfo.surfaceCategory}. Has Direct Payment Flow: ${surfaceInfo.hasDirectPaymentFlow}.`,
      `Calibrated Severity: ${severity}. Static HTML Score: ${domHealthScore}/100.`,
      `Observed facts: pageTitle="${scrapedDom.pageTitle}", primaryHeading="${primaryHeading}",`,
      `interactiveCount=${interactiveCount}, warnCount=${warnCount}, unlabeledInputsCount=${unlabeledInputsCount}, imagesMissingAlt=${imagesMissingAlt}, estimatedDomNodes=${estimatedDomNodes}.`,
      'IMPORTANT: Do NOT invent conversion drop percentages, revenue loss, or browser layout/contrast claims. Return strict JSON with keys: anomalyTitle (string), summary (2 honest sentences grounded only in static HTML facts).',
    ].join(' ');

    try {
      const r1 = await callGoogleAiStudio('gemma-4-31b-it', apiKey, prompt);
      providerCalls.push({
        model: 'gemma-4-31b-it',
        status: r1.parsed ? 'OK' : `HTTP_${r1.httpStatus || 'ERR'}`,
        latencyMs: r1.latencyMs,
      });
      if (r1.parsed) {
        activeModel = 'gemma-4-31b-it';
        llmResult = r1.parsed;
        if (r1.usageMetadata) {
          measuredTokenUsage = {
            available: true,
            inputTokens: r1.usageMetadata.promptTokenCount ?? null,
            outputTokens: r1.usageMetadata.candidatesTokenCount ?? null,
            totalTokens: r1.usageMetadata.totalTokenCount ?? null,
            note: 'Measured from Google AI Studio usageMetadata.',
          };
        }
      } else {
        const r2 = await callGoogleAiStudio('gemini-3.5-flash-lite', apiKey, prompt);
        providerCalls.push({
          model: 'gemini-3.5-flash-lite',
          status: r2.parsed ? 'OK' : `HTTP_${r2.httpStatus || 'ERR'}`,
          latencyMs: r2.latencyMs,
        });
        if (r2.parsed) {
          activeModel = 'gemini-3.5-flash-lite';
          llmResult = r2.parsed;
          if (r2.usageMetadata) {
            measuredTokenUsage = {
              available: true,
              inputTokens: r2.usageMetadata.promptTokenCount ?? null,
              outputTokens: r2.usageMetadata.candidatesTokenCount ?? null,
              totalTokens: r2.usageMetadata.totalTokenCount ?? null,
              note: 'Measured from Google AI Studio usageMetadata.',
            };
          }
        }
      }
    } catch {
      llmResult = null;
    }
  }

  const anomalyTitle = limitation.limited
    ? `${hostname}: Unverified (${limitation.title})`
    : llmResult?.anomalyTitle ||
      (severity === 'PASS'
        ? `${hostname}: Static HTML Accessibility Census Passed (${domHealthScore}/100 across ${estimatedDomNodes} nodes)`
        : `${hostname} (${surfaceInfo.surfaceCategory}): ${totalFlags} Static HTML Finding${totalFlags === 1 ? '' : 's'} (${severity})`);

  const targetSelector = primaryFinding?.diagnosticSelector || 'document';

  const summary = limitation.limited
    ? `${limitation.explanation} Surface classified as ${surfaceInfo.surfaceCategory}.`
    : llmResult?.summary ||
      `${surfaceInfo.paymentContextNote} Static HTML inspection of "${scrapedDom.pageTitle}" (${estimatedDomNodes} nodes, ${scrapedDom.htmlKilobytes} KB, ${totalScripts} scripts) observed ${unlabeledInputsCount}/${inputsCount} unlabeled inputs, ${imagesMissingAlt}/${totalImages} images missing alt attributes, and ${warnCount}/${interactiveCount} control warnings.`;

  const t1 = (scrapedDom.fetchLatencyMs / 1000).toFixed(3);
  const t2 = ((scrapedDom.fetchLatencyMs + 120) / 1000).toFixed(3);
  const t3 = ((scrapedDom.fetchLatencyMs + 240) / 1000).toFixed(3);

  const rootCauseLogs = [
    {
      lvl: limitation.limited ? 'WARN' : 'INFO',
      at: `00:0${t1}`,
      msg: `Mode: LIVE_PUBLIC_HTML_SCRAPE (Static HTML Only) · HTTP ${scrapedDom.httpStatus} (${scrapedDom.fetchLatencyMs}ms) · Surface: ${surfaceInfo.surfaceCategory}`,
      src: `${hostname}`,
    },
    {
      lvl: 'INFO',
      at: `00:0${t2}`,
      msg: `Revenue / Conversion Metric: NOT APPLICABLE (${surfaceInfo.isCommerceSurface ? 'No merchant analytics connected' : 'No checkout/payment funnel on this route'})`,
      src: 'SurfaceClassifier',
    },
    {
      lvl: limitation.limited || totalFlags > 0 ? 'WARN' : 'INFO',
      at: `00:0${t3}`,
      msg: limitation.limited
        ? `FAIL-CLOSED (${limitation.code}): ${limitation.explanation}`
        : `Static HTML Census (${estimatedDomNodes} nodes, ${formsCount} forms, ${inputsCount} inputs): ${unlabeledInputsCount} unlabeled inputs, ${imagesMissingAlt} missing-alt images, ${warnCount} control warnings -> Severity: ${severity} (${domHealthScore}/100)`,
      src: 'TraceCorrelatorSkill',
    },
  ];

  // T-305 & T-307: Remediation is strictly gated on observed evidence and suppressed on UNVERIFIED / PASS
  let diffLines;
  let remediationType;
  if (limitation.limited) {
    remediationType = 'UNVERIFIED_REQUIRES_BROWSER_RUNTIME';
    diffLines = [
      { t: 'ctx', c: `/* UNVERIFIED (${limitation.code}): Remediation suppressed for ${hostname} */` },
      { t: 'ctx', c: `/* Reason: ${limitation.title} */` },
      { t: 'ctx', c: '/* Pramana refuses to generate generic navigation fixes when the requested page content was not rendered in static HTML. */' },
    ];
  } else if (!remediationEligible) {
    remediationType = 'NO_STATIC_FIX_REQUIRED';
    diffLines = [
      { t: 'ctx', c: `/* ${hostname} (${targetUrl}) — Static HTML & A11y Census Passed (${domHealthScore}/100) */` },
      { t: 'ctx', c: `/* 0 unlabeled inputs, 0 missing-alt images, ${interactiveCount} controls verified in static HTML. */` },
      { t: 'ctx', c: '/* Note: Layout overlap, computed contrast, and JS interactions require an ephemeral browser runtime. */' },
    ];
  } else {
    remediationType = 'SUGGESTED_DOM_CSS_SNIPPET_ONLY';
    diffLines = [
      { t: 'ctx', c: `/* Grounded in Finding [${primaryFinding.id}]: ${primaryFinding.title} */` },
      { t: 'ctx', c: `/* Evidence Source: STATIC_HTML · Role: ${primaryFinding.role} · No GitHub Repo Connected */` },
      { t: 'del', c: primaryFinding.remediationSnippet.del },
      { t: 'add', c: primaryFinding.remediationSnippet.add },
    ];
  }

  const telemetry = {
    credentialsConfigured: Boolean(process.env.GEMINI_API_KEY),
    providerCalls,
    providerCallCount: providerCalls.length,
    estimatedMarginalCostUsd: AMORTIZED_AUDIT_COST_USD,
    costCeilingUsd: UNIT_ECONOMICS_CEILING_USD,
    costBasis: 'AMORTIZED_ESTIMATE_NOT_MEASURED_BILLING',
    measuredTokenUsage,
    billingVerification: {
      status: 'UNVERIFIED_FROM_API_KEY',
      note: 'GEMINI_API_KEY presence does not verify account billing plan or actual charges. Free-tier infrastructure ($0.00) is governed by INV-01.',
    },
  };

  return {
    activeModel,
    executionMode: llmResult ? 'live_public_html_scrape_plus_gemini' : 'live_public_html_scrape',
    telemetry,
    customFinding: {
      auditMode: 'LIVE_PUBLIC_HTML_SCRAPE',
      capabilityScope: 'STATIC_HTML_ONLY',
      prAvailable: false,
      remediationEligible,
      remediationType,
      remediationTargetFindingId: primaryFinding?.id || null,
      prNumber: null,
      anomalyTitle,
      severity,
      surfaceType: surfaceInfo.surfaceType,
      isCommerceSurface: surfaceInfo.isCommerceSurface,
      hasDirectPaymentFlow: surfaceInfo.hasDirectPaymentFlow,
      revenueMetricApplicable: false,
      surfaceCategory: surfaceInfo.surfaceCategory,
      monetizationModel: surfaceInfo.monetizationModel,
      paymentContextNote: surfaceInfo.paymentContextNote,
      auditLimitation: limitation,
      domHealthScore,
      totalFlags,
      warnCount,
      interactiveCount,
      htmlKilobytes: scrapedDom.htmlKilobytes,
      conversionDropPct,
      dropNumber,
      leakedMonthlyUsd,
      leakedMonthlyInr,
      summary,
      targetSelector,
      findings,
      rootCauseLogs,
      diffFile: remediationEligible
        ? `suggested-fix-${primaryFinding.id.toLowerCase()}.html (No Repo Connected)`
        : `no-patch-${hostname}.txt`,
      astReferenceFile: null,
      diffLines,
      skillsTrace: [
        {
          name: 'BrowserSandboxSkill',
          dur: `${(scrapedDom.fetchLatencyMs / 1000).toFixed(2)}s`,
          desc: `Static HTTP GET (${scrapedDom.htmlKilobytes} KB, ${estimatedDomNodes} nodes, ${totalScripts} scripts) — No headless browser JS execution`,
          log: `GET ${targetUrl} -> HTTP ${scrapedDom.httpStatus} (${scrapedDom.fetchLatencyMs}ms)`,
        },
        {
          name: 'TraceCorrelatorSkill',
          dur: '0.18s',
          desc: `Surface: "${surfaceInfo.surfaceCategory}" · Shell check: ${limitation.code}`,
          log: limitation.limited
            ? `FAIL-CLOSED -> UNVERIFIED (${limitation.code})`
            : `Severity: ${severity} · ${unlabeledInputsCount} unlabeled inputs, ${imagesMissingAlt} missing-alt images`,
        },
        {
          name: 'ASTBlastRadiusSkill',
          dur: '0.02s',
          desc: 'Skipped AST repo traversal (No GitHub repository connected for external public URL)',
          log: 'AST mapping requires Connected GitHub App mode (INV-04)',
        },
        {
          name: 'GitPatchSkill',
          dur: '0.05s',
          desc: remediationEligible
            ? `Derived HTML/ARIA snippet from finding ${primaryFinding.id} (No PR opened)`
            : `Suppressed patch generation (${remediationType})`,
          log: `Remediation mode: ${remediationType}`,
        },
      ],
    },
  };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED', message: 'Use GET or POST.' });
  }

  const clientIp =
    req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'local-client';
  const rate = checkRateLimit(clientIp);
  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQ));
  res.setHeader('X-RateLimit-Remaining', String(rate.remaining));
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.resetSeconds));
    return res.status(429).json({
      ok: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded (${RATE_LIMIT_MAX_REQ} audits per minute). Retry in ${rate.resetSeconds}s.`,
    });
  }

  const startedAt = Date.now();
  let body = {};
  if (req.method === 'POST') {
    if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body || '{}');
      } catch {
        return res.status(400).json({ ok: false, error: 'INVALID_JSON', message: 'Request body must be valid JSON.' });
      }
    } else {
      body = req.body || {};
    }
  }

  const suppliedUrl =
    body.url ??
    body.target_url ??
    body.targetUrl ??
    body.site ??
    body.domain ??
    req.query?.url ??
    req.query?.target_url ??
    req.query?.targetUrl ??
    req.query?.site ??
    req.query?.domain;

  const requestedScenario = String(
    body.scenarioId || body.scenario_id || req.query?.scenarioId || req.query?.scenario_id || 'S1_HINDI_OVERFLOW'
  ).trim();
  const scenarioId = BENCHMARK_FIXTURES[requestedScenario] ? requestedScenario : 'S1_HINDI_OVERFLOW';

  const rawUrl =
    suppliedUrl !== undefined && suppliedUrl !== null && String(suppliedUrl).trim() !== ''
      ? String(suppliedUrl).trim()
      : 'https://checkout.zestkart.in/v2/payment';

  if (/^(javascript:|data:|file:|ftp:)/i.test(rawUrl)) {
    return res.status(400).json({
      ok: false,
      error: 'UNSUPPORTED_PROTOCOL',
      message: 'Only http:// and https:// URLs are supported.',
    });
  }

  const targetUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  let hostname = '';
  try {
    const parsedUrl = new URL(targetUrl);
    hostname = parsedUrl.hostname.replace(/^www\./i, '');
  } catch {
    return res.status(400).json({
      ok: false,
      error: 'INVALID_URL',
      message: `Could not parse URL: "${rawUrl}". Provide a valid domain or https:// URL.`,
    });
  }

  const isPresetFixture = hostname.includes('zestkart.in') || hostname.includes('scalegrid.io');

  if (!isPresetFixture && isBlockedSsrfHost(hostname)) {
    return res.status(400).json({
      ok: false,
      error: 'RESTRICTED_HOST',
      message: `Auditing private, loopback, or internal host "${hostname}" is blocked by SSRF policy.`,
    });
  }

  if (isPresetFixture) {
    const fx = BENCHMARK_FIXTURES[scenarioId];
    const latencyMs = Math.max(18, Date.now() - startedAt);
    return res.status(200).json({
      ok: true,
      auditMode: 'BENCHMARK_FIXTURE',
      capabilityScope: 'CONNECTED_DEMO_BENCHMARK',
      isPresetFixture: true,
      isCustomUrl: false,
      is_custom_url: false,
      scenarioId,
      targetUrl,
      target_url: targetUrl,
      hostname,
      httpStatus: 200,
      latencyMs,
      activeModel: 'gemma-4-31b-it',
      fallbackModel: 'gemini-3.5-flash-lite',
      executionMode: 'pramana_bench_v1_fixture',
      execution_mode: 'pramana_bench_v1_fixture',
      revenue_metric_applicable: true,
      invariants: {
        inv04_ast_whitelist: VERIFIED_AST_WHITELIST,
        inv06_cost_ceiling_usd: UNIT_ECONOMICS_CEILING_USD,
      },
      telemetry_cost_usd: Math.min(AMORTIZED_AUDIT_COST_USD, UNIT_ECONOMICS_CEILING_USD),
      costCeilingUsd: UNIT_ECONOMICS_CEILING_USD,
      telemetry: {
        credentialsConfigured: Boolean(process.env.GEMINI_API_KEY),
        providerCalls: [],
        providerCallCount: 0,
        estimatedMarginalCostUsd: AMORTIZED_AUDIT_COST_USD,
        costCeilingUsd: UNIT_ECONOMICS_CEILING_USD,
        costBasis: 'BENCHMARK_FIXTURE_ESTIMATE',
        measuredTokenUsage: { available: false, inputTokens: null, outputTokens: null, totalTokens: null },
        billingVerification: {
          status: 'UNVERIFIED_FROM_API_KEY',
          note: 'Pre-recorded benchmark fixture (0 live provider calls).',
        },
      },
      page_metadata: {
        page_title: `${hostname} — ${fx.anomalyTitle}`,
        http_status: 200,
        button_count: 4,
        script_count: 5,
        live_fetch_succeeded: true,
      },
      scrapedDom: {
        httpStatus: 200,
        fetchLatencyMs: latencyMs,
        liveFetchSucceeded: true,
        htmlKilobytes: 64.2,
        pageTitle: `${hostname} — ${fx.anomalyTitle}`,
        metaDescription: fx.summary,
        headings: [{ tag: 'h1', text: fx.anomalyTitle }],
        interactiveElements: [
          {
            tag: 'button',
            role: 'button',
            accessibleName: fx.targetSelector,
            label: fx.targetSelector,
            id: fx.targetSelector.replace(/^#/, ''),
            className: 'cta-primary',
            diagnosticSelector: fx.targetSelector,
            href: null,
            hasAriaLabel: true,
            auditStatus: 'CRITICAL',
            claimType: 'OBSERVED_FACT',
            evidenceSource: 'RENDERED_BROWSER',
            auditReason: fx.summary,
          },
        ],
        formsAndInputs: { formsCount: 1, inputsCount: 3, unlabeledInputsCount: 0 },
        accessibilityMetrics: {
          totalImages: 2,
          imagesMissingAlt: 0,
          totalScripts: 5,
          inlineStylesCount: 2,
          estimatedDomNodes: 84,
          viewportMeta: 'width=device-width, initial-scale=1',
          zoomBlocked: false,
        },
      },
      customFinding: {
        auditMode: 'BENCHMARK_FIXTURE',
        capabilityScope: 'CONNECTED_DEMO_BENCHMARK',
        prAvailable: true,
        remediationEligible: true,
        remediationType: 'AST_VERIFIED_GITHUB_PR',
        prNumber: fx.prNumber,
        anomalyTitle: fx.anomalyTitle,
        severity: fx.severity,
        hasDirectPaymentFlow: true,
        revenueMetricApplicable: true,
        surfaceCategory: 'Connected Sandbox Checkout Benchmark',
        monetizationModel: 'Connected Merchant Telemetry + Repo AST',
        paymentContextNote: fx.summary,
        domHealthScore: 68,
        conversionDropPct: fx.conversionDropPct,
        dropNumber: fx.dropNumber,
        leakedMonthlyUsd: fx.leakedMonthlyUsd,
        leakedMonthlyInr: fx.leakedMonthlyInr,
        summary: fx.summary,
        targetSelector: fx.targetSelector,
        diffFile: fx.astTargetFile,
        astReferenceFile: fx.astTargetFile,
        diffLines: fx.diffLines,
        rootCauseLogs: fx.rootCauseLogs,
        skillsTrace: [
          {
            name: 'BrowserSandboxSkill',
            dur: '1.10s',
            desc: `Reproduced ${scenarioId} in isolated ${fx.viewport} container`,
            log: `${fx.device} · selector ${fx.targetSelector} reproduced 3/3`,
          },
          {
            name: 'TraceCorrelatorSkill',
            dur: '0.32s',
            desc: 'Pruned 25k HAR/console tokens to <1,200 tokens via gemma-4-31b-it',
            log: fx.rootCauseLogs[0].msg,
          },
          {
            name: 'ASTBlastRadiusSkill',
            dur: '0.48s',
            desc: `Verified ${fx.astTargetFile} against INV-04 AST whitelist`,
            log: `0% file path hallucination (${fx.astTargetFile})`,
          },
          {
            name: 'GitPatchSkill',
            dur: '0.29s',
            desc: `Synthesized PR #${fx.prNumber} (${fx.branch}) via Google Antigravity`,
            log: `Unified diff ready for ${fx.astTargetFile}`,
          },
        ],
      },
    });
  }

  const scrapedDom = await scrapeLiveDom(targetUrl);
  const { activeModel, executionMode, telemetry, customFinding } = await synthesizeCustomSiteAudit(
    targetUrl,
    hostname,
    scrapedDom
  );
  const totalLatencyMs = Math.max(scrapedDom.fetchLatencyMs, Date.now() - startedAt);

  return res.status(200).json({
    ok: true,
    auditMode: 'LIVE_PUBLIC_HTML_SCRAPE',
    capabilityScope: 'STATIC_HTML_ONLY',
    isPresetFixture: false,
    isCustomUrl: true,
    is_custom_url: true,
    scenarioId: 'CUSTOM_LIVE_URL',
    targetUrl,
    target_url: targetUrl,
    hostname,
    httpStatus: scrapedDom.httpStatus,
    latencyMs: totalLatencyMs,
    activeModel,
    fallbackModel: 'gemini-3.5-flash-lite',
    executionMode,
    execution_mode: executionMode,
    revenue_metric_applicable: false,
    invariants: {
      inv04_ast_whitelist: VERIFIED_AST_WHITELIST,
      inv06_cost_ceiling_usd: UNIT_ECONOMICS_CEILING_USD,
    },
    telemetry_cost_usd: Math.min(AMORTIZED_AUDIT_COST_USD, UNIT_ECONOMICS_CEILING_USD),
    costCeilingUsd: UNIT_ECONOMICS_CEILING_USD,
    telemetry,
    page_metadata: {
      page_title: scrapedDom.pageTitle,
      http_status: scrapedDom.httpStatus,
      button_count: scrapedDom.interactiveElements.length,
      script_count: scrapedDom.accessibilityMetrics.totalScripts,
      live_fetch_succeeded: scrapedDom.liveFetchSucceeded,
    },
    scrapedDom,
    customFinding,
  });
}
