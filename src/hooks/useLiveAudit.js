import { useState, useEffect, useCallback, useRef } from 'react';

const DEFAULT_HEALTH = {
  status: 'unknown',
  credentialsConfigured: false,
  activeTier: 'Static HTML Deterministic Parser (Checking /api/health...)',
  billingNote: 'Billing tier cannot be inferred from runtime API key presence (T-309).',
  routerModels: [
    { id: 'gemma-4-31b-it', label: 'Gemma 4 31B', quota: '14.4K RPD', role: 'Log Pruning' },
    { id: 'gemini-decision-1', label: 'Decision 1', quota: '10K RPD', role: 'Anomaly Triage' },
    { id: 'gemini-3.8-live', label: 'Gemini 3.8 Live', quota: 'Unlimited RPD', role: 'Live Voice & Frames' },
    { id: 'antigravity', label: 'Antigravity', quota: '100 RPD', role: 'AST PR Synthesis' },
  ],
  costCeilingUsd: 0.025,
};

function buildUnverifiedOfflineMeta(url, scenarioId, latencyMs, errorReason) {
  return {
    pageTitle: 'Unverified — /api/audit Unreachable',
    targetUrl: url,
    httpStatus: 0,
    domNodesScanned: 0,
    activeModel: 'none (offline)',
    executionMode: 'unverified_offline_fallback',
    auditMode: 'UNVERIFIED_OFFLINE_FALLBACK',
    isOfflineFallback: true,
    errorReason: errorReason || 'Network or API request failed',
    scenarioId,
    latencyMs,
    telemetry: {
      credentialsConfigured: false,
      providerCalls: [],
      providerCallCount: 0,
      estimatedMarginalCostUsd: 0.024,
      costCeilingUsd: 0.025,
      costBasis: 'AMORTIZED_ESTIMATE_NOT_MEASURED_BILLING',
      measuredTokenUsage: { available: false, inputTokens: null, outputTokens: null, totalTokens: null },
      billingVerification: {
        status: 'UNVERIFIED_FROM_API_KEY',
        note: 'Offline fallback — no server audit or provider call occurred.',
      },
    },
    timestamp: new Date().toISOString(),
  };
}

export function useLiveAudit(initialScenarioId = 'S1_HINDI_OVERFLOW') {
  const [health, setHealth] = useState(DEFAULT_HEALTH);
  const [liveMeta, setLiveMeta] = useState(null);
  const [isProbing, setIsProbing] = useState(false);
  const seqRef = useRef(0);
  const abortRef = useRef(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    fetch('/api/health', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        const configured = Boolean(data.gemini_api_configured);
        setHealth({
          status: data.status || 'ok',
          credentialsConfigured: configured,
          activeTier: configured
            ? 'GEMINI_API_KEY Configured (Billing Unverified via Runtime)'
            : 'Deterministic Static HTML Parser (No API Key Configured)',
          billingNote:
            data.telemetry?.billingVerification?.note ||
            'API key presence does not verify account billing plan (INV-01 / T-309).',
          routerModels: DEFAULT_HEALTH.routerModels,
          costCeilingUsd: data.telemetry?.costCeilingUsd ?? 0.025,
        });
      })
      .catch(() => {
        if (!active) return;
        setHealth((prev) => ({
          ...prev,
          status: 'offline',
          activeTier: 'API Health Unreachable (Offline Mode)',
        }));
      })
      .finally(() => clearTimeout(timer));

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const runLiveProbe = useCallback(
    async (url, scenarioId = initialScenarioId) => {
      seqRef.current += 1;
      const reqId = seqRef.current;
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const started = performance.now();
      setIsProbing(true);
      try {
        const res = await fetch('/api/audit', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, target_url: url, targetUrl: url, scenarioId }),
        });
        const latencyMs = Math.round(performance.now() - started);
        const data = await res.json().catch(() => null);
        if (reqId !== seqRef.current) return null; // Ignore stale out-of-order response
        if (!res.ok || !data || data.ok === false) {
          throw new Error(data?.message || `HTTP ${res.status}`);
        }
        const meta = {
          pageTitle: data?.scrapedDom?.pageTitle || data?.page_metadata?.page_title || 'Target Page',
          targetUrl: data?.targetUrl || url,
          httpStatus: data?.httpStatus ?? data?.page_metadata?.http_status ?? 0,
          domNodesScanned:
            data?.scrapedDom?.accessibilityMetrics?.estimatedDomNodes ??
            (data?.page_metadata?.button_count || 0) + (data?.page_metadata?.script_count || 0),
          activeModel: data?.activeModel || 'deterministic-static-html-parser',
          executionMode: data?.executionMode || data?.execution_mode || 'live_public_html_scrape',
          auditMode: data?.auditMode || (data?.isCustomUrl ? 'LIVE_PUBLIC_HTML_SCRAPE' : 'BENCHMARK_FIXTURE'),
          isOfflineFallback: false,
          scenarioId,
          latencyMs,
          telemetry: data?.telemetry || null,
          timestamp: new Date().toISOString(),
          rawResponse: data,
        };
        setLiveMeta(meta);
        return meta;
      } catch (err) {
        if (err?.name === 'AbortError' || reqId !== seqRef.current) return null;
        const latencyMs = Math.round(performance.now() - started);
        const fallback = buildUnverifiedOfflineMeta(
          url,
          scenarioId,
          latencyMs,
          err instanceof Error ? err.message : 'Network error'
        );
        setLiveMeta(fallback);
        return fallback;
      } finally {
        if (reqId === seqRef.current) {
          setIsProbing(false);
        }
      }
    },
    [initialScenarioId]
  );

  return { health, liveMeta, isProbing, runLiveProbe };
}

export default useLiveAudit;
