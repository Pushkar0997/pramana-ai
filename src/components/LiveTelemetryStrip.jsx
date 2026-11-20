import React, { useState } from 'react';

const ADR_006_MATRIX = [
  {
    blocked: 'Gemini 3.5 Flash-Lite (Primary Live)',
    virtualizedBy: 'Executes live server-side on /api/audit (JSON + Multimodal Vision)',
    cost: 'Live Server Call',
  },
  {
    blocked: 'Gemini 3.1 Flash-Lite (Fast Fallback)',
    virtualizedBy: 'Automatic server-side fallback if primary throttles',
    cost: 'Live Server Call',
  },
  {
    blocked: 'Gemma 4 31B (14.4K RPD Workhorse)',
    virtualizedBy: 'High-throughput text cascade fallback on Google AI Studio',
    cost: 'Live Server Call',
  },
  {
    blocked: 'Legacy Sandbox Demo Adapters (ADR-006)',
    virtualizedBy: 'Deterministic DOM diff + WebAudio cue (Demo Storefront examples only; not claimed on live audits)',
    cost: 'Local Deterministic',
  },
];

export function LiveTelemetryStrip({ health, liveMeta, isProbing }) {
  const [matrixOpen, setMatrixOpen] = useState(false);
  const tel = liveMeta?.telemetry || null;
  const providerCalls = tel?.providerCallCount ?? 0;
  const tokensText = tel?.measuredTokenUsage?.available
    ? `${tel.measuredTokenUsage.inputTokens ?? '?'} in / ${tel.measuredTokenUsage.outputTokens ?? '?'} out`
    : 'Not measured (0 LLM calls)';

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #D8DCEA',
        borderRadius: '14px',
        padding: '12px 16px',
        color: '#0B1020',
        fontSize: '12px',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
          <span style={{ color: health?.status === 'ok' ? '#007A51' : '#8A5F00', fontWeight: 700 }}>
            ● {health?.status === 'ok' ? 'SERVER API LIVE (ZERO CLIENT KEYS)' : 'CHECKING /API/HEALTH'}
          </span>
          <span style={{ background: '#F6F7FB', border: '1px solid #D8DCEA', borderRadius: '999px', padding: '2px 8px', color: '#1B27C7', fontSize: '11px' }}>
            Live Cascade: Gemini 3.5 Flash-Lite → Gemini 3.1 Flash-Lite → Gemma 4 31B
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMatrixOpen((v) => !v)}
          style={{
            background: '#F6F7FB',
            color: '#1B27C7',
            border: '1px solid #D8DCEA',
            borderRadius: '8px',
            padding: '5px 10px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {matrixOpen ? '▲ Hide ADR-006 Execution Cascade' : 'View ADR-006 Execution Cascade'}
        </button>
      </div>

      <div
        style={{
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #ECEEF6',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          fontSize: '11px',
          color: '#3B4259',
        }}
      >
        {isProbing ? (
          <span style={{ color: '#1B27C7' }}>Waiting for server-side /api/audit response…</span>
        ) : liveMeta ? (
          <>
            <span style={{ color: liveMeta.isOfflineFallback ? '#8A5F00' : '#007A51', fontWeight: 700 }}>
              {liveMeta.isOfflineFallback ? 'UNVERIFIED (OFFLINE)' : `HTTP ${liveMeta.httpStatus}`}
            </span>
            <span>·</span>
            <span>Model: {liveMeta.activeModel}</span>
            <span>·</span>
            <span>Provider Calls: {providerCalls}</span>
            <span>·</span>
            <span>Tokens: {tokensText}</span>
            <span>·</span>
            <span>Est. Marginal: $0.024 (&le; $0.025 INV-06)</span>
          </>
        ) : (
          <span>
            Auditable Telemetry (T-309): All Gemini/Gemma calls execute server-side only (0 client keys). Amortized estimate: $0.024/audit (&le; $0.025 INV-06).
          </span>
        )}
      </div>

      {matrixOpen && (
        <div style={{ marginTop: '10px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #D8DCEA', color: '#636A82', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>Execution Tier</th>
                <th style={{ padding: '6px 8px' }}>Runtime Behavior (ADR-006)</th>
                <th style={{ padding: '6px 8px' }}>Execution Mode</th>
              </tr>
            </thead>
            <tbody>
              {ADR_006_MATRIX.map((row) => (
                <tr key={row.blocked} style={{ borderBottom: '1px solid #ECEEF6' }}>
                  <td style={{ padding: '6px 8px', color: '#0B1020', fontWeight: 600 }}>{row.blocked}</td>
                  <td style={{ padding: '6px 8px', color: '#3B4259' }}>{row.virtualizedBy}</td>
                  <td style={{ padding: '6px 8px', color: '#007A51', fontWeight: 700 }}>{row.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default LiveTelemetryStrip;
