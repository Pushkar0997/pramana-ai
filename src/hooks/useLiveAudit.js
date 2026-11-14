import { useState, useEffect, useCallback } from 'react';

const DEFAULT_HEALTH = {
  status: 'ok',
  activeTier: 'Google AI Studio Free Tier ($0.00)',
  routerModels: [
    { id: 'gemma-4-31b-it', label: 'Gemma 4 31B', quota: '14.4K RPD', role: 'Log Pruning' },
    { id: 'gemini-decision-1', label: 'Decision 1', quota: '10K RPD', role: 'Anomaly Triage' },
    { id: 'gemini-3.8-live', label: 'Gemini 3.8 Live', quota: 'Unlimited RPD', role: 'Live Voice & Frames' },
    { id: 'antigravity', label: 'Antigravity', quota: '100 RPD', role: 'AST PR Synthesis' },
  ],
  costCeilingUsd: 0.025,
};

function buildOfflineMeta(url, scenarioId, latencyMs) {
  let title = 'ZestKart Checkout';
  try {
    const parsed = new URL(url);
    title = `${parsed.hostname.replace(/^www\./, '')} Live Target`;
  } catch {
    // Keep fallback title
  }
  return {
    pageTitle: title,
    httpStatus: 200,
    domNodesScanned: 12,
    activeModel: 'gemma-4-31b-it (deterministic-fallback)',
    executionMode: 'deterministic_sandbox_fallback',
    scenarioId,
    latencyMs,
    timestamp: new Date().toISOString(),
  };
}

export function useLiveAudit(initialScenarioId = 'S1_HINDI_OVERFLOW') {
  const [health, setHealth] = useState(DEFAULT_HEALTH);
  const [liveMeta, setLiveMeta] = useState(null);
  const [isProbing, setIsProbing] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    fetch('/api/health', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setHealth({
          status: data.status || 'ok',
          activeTier: data.gemini_api_configured
            ? 'Google AI Studio Live ($0.00)'
            : 'Google AI Studio Free Tier ($0.00 · Fallback Ready)',
          routerModels: DEFAULT_HEALTH.routerModels,
          costCeilingUsd: 0.025,
        });
      })
      .catch(() => {
        // Silent offline fallback
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
      const started = performance.now();
      setIsProbing(true);
      try {
        const res = await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, scenarioId }),
        });
        const latencyMs = Math.round(performance.now() - started);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const traceModel = data?.agent_skills_trace?.[1]?.model || 'gemma-4-31b-it';
        const meta = {
          pageTitle: data?.page_metadata?.page_title || 'Target Page',
          httpStatus: data?.page_metadata?.http_status ?? 200,
          domNodesScanned: (data?.page_metadata?.button_count || 0) + (data?.page_metadata?.script_count || 0) || 12,
          activeModel: traceModel,
          executionMode: data?.page_metadata?.live_fetch_succeeded ? 'live_vercel_edge' : 'deterministic_fallback',
          scenarioId,
          latencyMs,
          timestamp: new Date().toISOString(),
        };
        setLiveMeta(meta);
        return meta;
      } catch {
        const latencyMs = Math.round(performance.now() - started);
        const fallback = buildOfflineMeta(url, scenarioId, latencyMs);
        setLiveMeta(fallback);
        return fallback;
      } finally {
        setIsProbing(false);
      }
    },
    [initialScenarioId]
  );

  return { health, liveMeta, isProbing, runLiveProbe };
}

export default useLiveAudit;
