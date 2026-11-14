import React, { useMemo, useState } from 'react';
import { useLiveAudit } from './hooks/useLiveAudit';
import { LiveTelemetryStrip } from './components/LiveTelemetryStrip';
import { extractBrandFromUrl } from './schemas/auditReportValidator';
import { QuotaAwareRouter, LyriaWebAudioSynth } from './services/quotaRouter';

const BENCHMARK_SCENARIOS = {
  S1_HINDI_OVERFLOW: {
    id: 'S1_HINDI_OVERFLOW',
    label: 'S1 · Hindi Overflow',
    url: 'https://checkout.zestkart.in/v2/payment',
    viewport: '390 × 844 (Mobile)',
    severity: 'CRITICAL',
    title: 'Hindi Sticky CTA Overflows 390px Mobile Viewport',
    leakedMonthly: '₹4,20,000/mo',
    dropPct: 18.4,
    selector: '#checkout-sticky-cta',
    diffFile: 'src/components/checkout/StickyPaymentBar.tsx',
    summary:
      'Hindi label "अभी ₹1,499 भुगतान करें और ऑर्डर कन्फर्म करें" renders at 412px with whitespace-nowrap, clipping past the 390px mobile viewport.',
    beforeText: 'अभी ₹1,499 भुगतान करें और ऑर्डर कन्फर्म करें (412px clipped)',
    afterText: 'अभी ₹1,499 भुगतान करें और ऑर्डर कन्फर्म करें (wrapped 100%)',
    diffPatch: `--- a/src/components/checkout/StickyPaymentBar.tsx
+++ b/src/components/checkout/StickyPaymentBar.tsx
@@ -18,3 +18,3 @@
-<button id="checkout-sticky-cta" className="flex-nowrap whitespace-nowrap -bottom-12">
+<button id="checkout-sticky-cta" className="w-full max-w-full whitespace-normal break-words bottom-0">`,
    logs: [
      '[BrowserSandboxSkill] 390x844 hi-IN: #checkout-sticky-cta width=412px > viewport=390px',
      '[TraceCorrelatorSkill] gemma-4-31b-it pruned 24,800 tokens -> 410 tokens',
      '[ASTBlastRadiusSkill] Verified StickyPaymentBar.tsx in repository AST',
      '[GitPatchSkill] Synthesized unified diff via Google Antigravity',
    ],
  },
  S2_UPI_TIMEOUT: {
    id: 'S2_UPI_TIMEOUT',
    label: 'S2 · UPI 504 Race',
    url: 'https://checkout.zestkart.in/v2/upi',
    viewport: '390 × 844 (Mobile)',
    severity: 'CRITICAL',
    title: 'UPI Webhook Race Condition Triggers 504 Gateway Timeout',
    leakedMonthly: '₹8,90,000/mo',
    dropPct: 31.2,
    selector: '#upi-status-poller',
    diffFile: 'src/server/webhooks/upiConfirm.ts',
    summary:
      'payment.captured webhook arrives 212ms before order.created commits, leaving order_id=null and stalling the UPI spinner with HTTP 504.',
    beforeText: 'GET /api/upi/confirm → 504 OrderNotFound (spinner stuck)',
    afterText: 'Bounded backoff [100ms, 250ms, 500ms] → 200 PAID_RECONCILED',
    diffPatch: `--- a/src/server/webhooks/upiConfirm.ts
+++ b/src/server/webhooks/upiConfirm.ts
@@ -27,2 +27,5 @@
-const order = await findOrder(evt.orderId);
+const order = await retryWithBackoff(() => findOrder(evt.orderId), [100, 250, 500]);`,
    logs: [
      '[BrowserSandboxSkill] HAR >=400: 2x HTTP 504 on /api/upi/confirm (15,020ms)',
      '[TraceCorrelatorSkill] gemma-4-31b-it correlated OrderNotFound race window (212ms)',
      '[ASTBlastRadiusSkill] Verified upiConfirm.ts in repository AST',
      '[GitPatchSkill] Synthesized bounded-backoff reconciliation patch',
    ],
  },
  S3_DARKMODE_CONTRAST: {
    id: 'S3_DARKMODE_CONTRAST',
    label: 'S3 · Dark Contrast',
    url: 'https://checkout.zestkart.in/v2/confirm',
    viewport: '1440 × 900 (Desktop)',
    severity: 'HIGH',
    title: 'Dark-Mode Place Order CTA Fails WCAG AA Contrast & Scrim Dead-Click',
    leakedMonthly: '₹2,65,000/mo',
    dropPct: 11.7,
    selector: '#place-order-cta',
    diffFile: 'src/components/checkout/PlaceOrderButton.tsx',
    summary:
      '#place-order-cta renders at 2.1:1 contrast underneath a z-40 div.promo-scrim overlay that intercepts pointer clicks.',
    beforeText: 'Place Order (2.1:1 contrast · blocked by z-40 scrim)',
    afterText: 'Place Order (11.4:1 contrast · z-50 clickable)',
    diffPatch: `--- a/src/components/checkout/PlaceOrderButton.tsx
+++ b/src/components/checkout/PlaceOrderButton.tsx
@@ -9,2 +9,2 @@
-<button id="place-order-cta" className="bg-slate-800 text-slate-600">
+<button id="place-order-cta" className="bg-zinc-100 text-zinc-950 font-semibold z-50">`,
    logs: [
      '[BrowserSandboxSkill] 1440x900 dark-mode: #place-order-cta contrast=2.1:1 < 4.5:1',
      '[TraceCorrelatorSkill] gemma-4-31b-it detected z-40 promo-scrim click interception',
      '[ASTBlastRadiusSkill] Verified PlaceOrderButton.tsx in repository AST',
      '[GitPatchSkill] Synthesized WCAG AA contrast & z-index fix',
    ],
  },
};

const SKILL_NAMES = [
  'BrowserSandboxSkill',
  'TraceCorrelatorSkill',
  'ASTBlastRadiusSkill',
  'GitPatchSkill',
];

export default function App() {
  const [activeTab, setActiveTab] = useState('workspace');
  const [selectedScenario, setSelectedScenario] = useState('S1_HINDI_OVERFLOW');
  const [urlInput, setUrlInput] = useState(BENCHMARK_SCENARIOS.S1_HINDI_OVERFLOW.url);
  const [customAudit, setCustomAudit] = useState(null);
  const [showAfterPatch, setShowAfterPatch] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [copiedDiff, setCopiedDiff] = useState(false);

  const { health, liveMeta, isProbing, runLiveProbe } = useLiveAudit(selectedScenario);
  const router = useMemo(() => new QuotaAwareRouter(), []);
  const lyria = useMemo(() => new LyriaWebAudioSynth(), []);

  const brandName = useMemo(() => extractBrandFromUrl(urlInput), [urlInput]);
  const preset = BENCHMARK_SCENARIOS[selectedScenario];
  const isCustomMode = Boolean(customAudit && customAudit.isCustomUrl);

  async function handleRunAudit(e) {
    if (e) e.preventDefault();
    setIsRunning(true);
    setShowAfterPatch(false);
    try {
      const resp = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput, scenarioId: selectedScenario }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setCustomAudit(data);
        if (selectedScenario === 'S2_UPI_TIMEOUT') {
          lyria.playPaymentAlert();
        } else {
          lyria.playSuccessChime();
        }
      }
      await runLiveProbe(urlInput, selectedScenario);
    } catch {
      setCustomAudit(null);
    } finally {
      setIsRunning(false);
    }
  }

  function handleSelectPreset(id) {
    setSelectedScenario(id);
    setUrlInput(BENCHMARK_SCENARIOS[id].url);
    setCustomAudit(null);
    setShowAfterPatch(false);
  }

  const activeDiff = isCustomMode ? customAudit.customFinding.diffPatch : preset.diffPatch;
  const activeDiffFile = isCustomMode ? customAudit.customFinding.diffFile : preset.diffFile;
  const activeTitle = isCustomMode ? customAudit.customFinding.title : preset.title;
  const activeSummary = isCustomMode ? customAudit.customFinding.summary : preset.summary;
  const activeSeverity = isCustomMode ? customAudit.customFinding.severity : preset.severity;
  const activeLogs = isCustomMode ? customAudit.customFinding.rootCauseLogs : preset.logs;
  const activeSkills = isCustomMode
    ? customAudit.customFinding.skillsTrace
    : SKILL_NAMES.map((s) => ({ skill: s, status: 'completed', detail: 'Verified' }));

  const routerModel = router.selectModel('log_pruning').model;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#09090B', color: '#F4F4F5', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Single 48px Minimalist Header */}
      <header style={{ height: '48px', borderBottom: '1px solid #232329', backgroundColor: '#09090B', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '-0.02em', color: '#F4F4F5' }}>Pramana</span>
          <span style={{ fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: '#A1A1AA', border: '1px solid #232329', borderRadius: '6px', padding: '1px 6px', backgroundColor: '#111113' }}>v1.0</span>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#111113', border: '1px solid #232329', borderRadius: '8px', padding: '2px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('workspace')}
            style={{
              backgroundColor: activeTab === 'workspace' ? '#232329' : 'transparent',
              color: activeTab === 'workspace' ? '#F4F4F5' : '#A1A1AA',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Workspace
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('outreach')}
            style={{
              backgroundColor: activeTab === 'outreach' ? '#232329' : 'transparent',
              color: activeTab === 'outreach' ? '#F4F4F5' : '#A1A1AA',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Outreach Studio
          </button>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }}>
          <a href="/demo-store/index.html" style={{ color: '#A1A1AA', textDecoration: 'none' }}>Storefront ↗</a>
          <a href={`/proof/index.html?id=142&brand=${encodeURIComponent(brandName)}`} style={{ color: '#A1A1AA', textDecoration: 'none' }}>Proof Portal ↗</a>
          <a href="/deck/index.html" style={{ color: '#A1A1AA', textDecoration: 'none' }}>Pitch Deck ↗</a>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* URL Bar & Benchmark Presets */}
        <section style={{ backgroundColor: '#111113', border: '1px solid #232329', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <form onSubmit={handleRunAudit} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Enter any URL to audit (e.g. https://github.com/)"
              aria-label="Target URL"
              style={{
                flex: 1,
                minWidth: '240px',
                backgroundColor: '#09090B',
                border: '1px solid #232329',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#F4F4F5',
                fontSize: '13px',
                fontFamily: 'ui-monospace, monospace',
              }}
            />
            <button
              type="submit"
              disabled={isRunning || isProbing}
              style={{
                backgroundColor: '#E4E4E7',
                color: '#09090B',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isRunning || isProbing ? 'Auditing...' : 'Run Autonomous Audit'}
            </button>
          </form>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#A1A1AA', marginRight: '4px' }}>Benchmark Presets:</span>
            {Object.values(BENCHMARK_SCENARIOS).map((sc) => {
              const active = !isCustomMode && selectedScenario === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleSelectPreset(sc.id)}
                  style={{
                    backgroundColor: active ? '#232329' : '#09090B',
                    color: active ? '#F4F4F5' : '#A1A1AA',
                    border: '1px solid #232329',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontFamily: 'ui-monospace, monospace',
                    cursor: 'pointer',
                  }}
                >
                  {sc.label}
                </button>
              );
            })}
          </div>
        </section>

        <LiveTelemetryStrip health={health} liveMeta={liveMeta} isProbing={isProbing} />

        {activeTab === 'workspace' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            {/* Left Stage: Custom Live DOM Inspector OR Benchmark Sandbox */}
            <section style={{ backgroundColor: '#111113', border: '1px solid #232329', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {isCustomMode ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #232329', paddingBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: '#A1A1AA' }}>LIVE TARGET DOM INSPECTOR</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#F4F4F5', marginTop: '2px' }}>{customAudit.hostname}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', fontFamily: 'ui-monospace, monospace', fontSize: '11px' }}>
                      <span style={{ border: '1px solid #232329', borderRadius: '6px', padding: '3px 8px', color: customAudit.httpStatus >= 200 && customAudit.httpStatus < 400 ? '#34D399' : '#FBBF24' }}>
                        HTTP {customAudit.httpStatus}
                      </span>
                      <span style={{ border: '1px solid #232329', borderRadius: '6px', padding: '3px 8px', color: '#A1A1AA' }}>
                        {customAudit.latencyMs}ms
                      </span>
                      <span style={{ border: '1px solid #232329', borderRadius: '6px', padding: '3px 8px', color: '#A1A1AA' }}>
                        {customAudit.scrapedDom.domNodesScanned} nodes
                      </span>
                    </div>
                  </div>

                  {/* Scraped Page Identity */}
                  <div style={{ backgroundColor: '#09090B', border: '1px solid #232329', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: '#A1A1AA', marginBottom: '4px' }}>SCRAPED PAGE IDENTITY</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#F4F4F5' }}>{customAudit.scrapedDom.pageTitle}</div>
                    {customAudit.scrapedDom.h1List.length > 0 && (
                      <ul style={{ margin: '8px 0 0', paddingLeft: '16px', color: '#A1A1AA', fontSize: '12px' }}>
                        {customAudit.scrapedDom.h1List.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Interactive CTA & Button Audit Table */}
                  <div style={{ backgroundColor: '#09090B', border: '1px solid #232329', borderRadius: '8px', padding: '12px', overflowX: 'auto' }}>
                    <div style={{ fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: '#A1A1AA', marginBottom: '8px' }}>
                      INTERACTIVE CTA &amp; BUTTON AUDIT ({customAudit.scrapedDom.buttons.length} sampled)
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #232329', color: '#A1A1AA', textAlign: 'left' }}>
                          <th style={{ padding: '6px 4px' }}>Tag</th>
                          <th style={{ padding: '6px 4px' }}>Label</th>
                          <th style={{ padding: '6px 4px' }}>ARIA</th>
                          <th style={{ padding: '6px 4px' }}>Tap Target</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customAudit.scrapedDom.buttons.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ padding: '8px 4px', color: '#A1A1AA' }}>No button/CTA labels extracted.</td>
                          </tr>
                        ) : (
                          customAudit.scrapedDom.buttons.map((b, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #18181B' }}>
                              <td style={{ padding: '6px 4px', fontFamily: 'ui-monospace, monospace', color: '#A1A1AA' }}>&lt;{b.tag}&gt;</td>
                              <td style={{ padding: '6px 4px', color: '#F4F4F5' }}>{b.label}</td>
                              <td style={{ padding: '6px 4px', color: b.hasAria ? '#34D399' : '#FBBF24' }}>{b.hasAria ? 'Pass' : 'Warn'}</td>
                              <td style={{ padding: '6px 4px', color: b.tapTargetOk ? '#34D399' : '#FBBF24' }}>{b.tapTargetOk ? 'Pass' : 'Warn'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Accessibility & Form Telemetry */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {[
                      { k: 'Forms', v: customAudit.scrapedDom.formsCount },
                      { k: 'Inputs', v: customAudit.scrapedDom.inputsCount },
                      { k: 'Missing Alt', v: customAudit.scrapedDom.imagesMissingAlt },
                      { k: 'Scripts', v: customAudit.scrapedDom.scriptsCount },
                    ].map((stat) => (
                      <div key={stat.k} style={{ backgroundColor: '#09090B', border: '1px solid #232329', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: '#F4F4F5' }}>{stat.v}</div>
                        <div style={{ fontSize: '11px', color: '#A1A1AA' }}>{stat.k}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #232329', paddingBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: '#A1A1AA' }}>PRAMANA-BENCH-V1 SANDBOX</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#F4F4F5', marginTop: '2px' }}>{preset.viewport} · {preset.selector}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAfterPatch((v) => !v)}
                      style={{
                        backgroundColor: '#09090B',
                        color: '#F4F4F5',
                        border: '1px solid #232329',
                        borderRadius: '6px',
                        padding: '5px 10px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      {showAfterPatch ? 'Viewing: After Patch' : 'Viewing: Before Patch'}
                    </button>
                  </div>

                  <div style={{ backgroundColor: '#09090B', border: '1px solid #232329', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: showAfterPatch ? '#34D399' : '#F87171', marginBottom: '8px' }}>
                      {showAfterPatch ? 'NANO BANANA · PATCHED DOM STATE' : 'PRODUCTION ANOMALY DETECTED'}
                    </div>
                    <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#111113', border: '1px solid #232329', fontSize: '13px', color: '#F4F4F5' }}>
                      {showAfterPatch ? preset.afterText : preset.beforeText}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    <div style={{ backgroundColor: '#09090B', border: '1px solid #232329', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#A1A1AA' }}>Conversion Drop</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: '#F87171' }}>-{preset.dropPct}%</div>
                    </div>
                    <div style={{ backgroundColor: '#09090B', border: '1px solid #232329', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#A1A1AA' }}>Est. Monthly Leakage</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: '#F4F4F5' }}>{preset.leakedMonthly}</div>
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* Right Column: Finding, 4/4 Skills Trace & Self-Healing Diff */}
            <section style={{ backgroundColor: '#111113', border: '1px solid #232329', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: activeSeverity === 'CRITICAL' ? '#F87171' : '#FBBF24', border: '1px solid #232329', borderRadius: '6px', padding: '2px 8px', backgroundColor: '#09090B' }}>
                    {activeSeverity}
                  </span>
                  <h2 style={{ margin: '8px 0 4px', fontSize: '16px', fontWeight: 600, color: '#F4F4F5' }}>{activeTitle}</h2>
                  <p style={{ margin: 0, fontSize: '13px', color: '#A1A1AA', lineHeight: 1.5 }}>{activeSummary}</p>
                </div>
              </div>

              {/* Root-Cause Logs */}
              <div style={{ backgroundColor: '#09090B', border: '1px solid #232329', borderRadius: '8px', padding: '10px 12px', fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: '#A1A1AA', display: 'grid', gap: '4px' }}>
                {activeLogs.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>

              {/* 4/4 Google Agent Skills Trace */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {activeSkills.map((sk) => (
                  <div key={sk.skill} style={{ backgroundColor: '#09090B', border: '1px solid #232329', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, fontFamily: 'ui-monospace, monospace', color: '#34D399' }}>✓ {sk.skill}</div>
                    <div style={{ fontSize: '11px', color: '#A1A1AA', marginTop: '2px' }}>{sk.detail}</div>
                  </div>
                ))}
              </div>

              {/* Unified Git Diff */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: '#A1A1AA' }}>Google Antigravity Patch · {activeDiffFile}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(activeDiff);
                      setCopiedDiff(true);
                      setTimeout(() => setCopiedDiff(false), 1500);
                    }}
                    style={{ backgroundColor: '#09090B', color: '#F4F4F5', border: '1px solid #232329', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    {copiedDiff ? 'Copied ✓' : 'Copy .diff'}
                  </button>
                </div>
                <pre style={{ margin: 0, backgroundColor: '#09090B', border: '1px solid #232329', borderRadius: '8px', padding: '12px', fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: '#E4E4E7', overflowX: 'auto' }}>
                  {activeDiff}
                </pre>
              </div>
            </section>
          </div>
        ) : (
          /* Outreach Studio Tab */
          <section style={{ backgroundColor: '#111113', border: '1px solid #232329', borderRadius: '10px', padding: '20px', display: 'grid', gap: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#F4F4F5' }}>Proof-First Cold Outreach Brief — {brandName}</div>
            <pre style={{ margin: 0, backgroundColor: '#09090B', border: '1px solid #232329', borderRadius: '8px', padding: '14px', fontSize: '12px', fontFamily: 'ui-monospace, monospace', color: '#E4E4E7', whiteSpace: 'pre-wrap' }}>
{`Subject: [${brandName}] Live DOM / Checkout Audit + Ready-to-Merge Fix

Hi ${brandName} Engineering Team,

Pramana AI audited ${urlInput} using ${routerModel} and flagged:
"${activeTitle}"

${activeSummary}

Inspect the interactive before/after visual diff and copy the verified Git patch:
/proof/index.html?id=142&brand=${encodeURIComponent(brandName)}

— Team Vimarsha | Pramana AI`}
            </pre>
          </section>
        )}
      </main>

      {/* Single-Line Muted Monospace Footer */}
      <footer style={{ borderTop: '1px solid #232329', padding: '10px 20px', textAlign: 'center', fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: '#A1A1AA' }}>
        Gemma 4 31B · Gemini Omni · Gemini Live · Nano Banana · Lyria · Google Antigravity · $0.024/audit &le; $0.025 ceiling
      </footer>
    </div>
  );
}
