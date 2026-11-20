import React, { useState } from 'react';

const ADR_006_MATRIX = [
  {
    blocked: 'Gemini Omni 1.1 / 1.2 Flash (0/0)',
    virtualizedBy: 'Gemini 3.5 Flash Lite (500 RPD) + Robotics ER 2 (20 RPD)',
    cost: '$0.00 Free-Tier Plan (INV-01)',
  },
  {
    blocked: 'Nano Banana / Pro (0/0)',
    virtualizedBy: 'NanoBananaDomDiffAdapter (Deterministic DOM/CSS Patch)',
    cost: '$0.00 Local Compute',
  },
  {
    blocked: 'Lyria 3 Clip / Pro (0/0)',
    virtualizedBy: 'LyriaWebAudioSynth (A4→E5 Chime, D3 Payment Alert)',
    cost: '$0.00 Client WebAudio',
  },
  {
    blocked: 'Gemini 4 Hydrogen (Exhausted 20/20)',
    virtualizedBy: 'Gemma 4 31B (14.4K RPD) + Gemini Decision 1 (10K RPD)',
    cost: '$0.00 Free-Tier Plan (INV-01)',
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
        backgroundColor: '#11141E',
        border: '1px solid #1E2436',
        borderRadius: '10px',
        padding: '12px 14px',
        color: '#F1F5F9',
        fontSize: '12px',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
          <span style={{ color: health?.status === 'ok' ? '#10B981' : '#F59E0B', fontWeight: 700 }}>
            ● {health?.status === 'ok' ? 'API HEALTH 200' : 'OFFLINE / UNVERIFIED'}
          </span>
          <span style={{ background: '#080A0F', border: '1px solid #1E2436', borderRadius: '4px', padding: '2px 7px', color: '#06B6D4', fontSize: '11px' }}>
            Credentials: {health?.credentialsConfigured ? 'GEMINI_API_KEY set' : 'None (Deterministic)'}
          </span>
          <span style={{ background: '#080A0F', border: '1px solid #1E2436', borderRadius: '4px', padding: '2px 7px', color: '#94A3B8', fontSize: '11px' }}>
            Gemma 4 31B [14.4K RPD] · Decision 1 [10K RPD] · Antigravity [100 RPD]
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMatrixOpen((v) => !v)}
          style={{
            background: '#080A0F',
            color: '#06B6D4',
            border: '1px solid #1E2436',
            borderRadius: '6px',
            padding: '5px 10px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {matrixOpen ? '▲ Hide ADR-006 Quota Cascade Matrix' : 'View ADR-006 Quota Cascade Matrix'}
        </button>
      </div>

      <div
        style={{
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #1E2436',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          fontSize: '11px',
          color: '#94A3B8',
        }}
      >
        {isProbing ? (
          <span style={{ color: '#06B6D4' }}>Waiting for /api/audit server response…</span>
        ) : liveMeta ? (
          <>
            <span style={{ color: liveMeta.isOfflineFallback ? '#F59E0B' : '#10B981' }}>
              {liveMeta.isOfflineFallback ? 'UNVERIFIED (OFFLINE)' : `HTTP ${liveMeta.httpStatus}`}
            </span>
            <span>·</span>
            <span style={{ color: '#F1F5F9' }}>Model: {liveMeta.activeModel}</span>
            <span>·</span>
            <span>Provider Calls: {providerCalls}</span>
            <span>·</span>
            <span>Tokens: {tokensText}</span>
            <span>·</span>
            <span style={{ color: '#06B6D4' }}>Est. Marginal: $0.024 (&le; $0.025 INV-06)</span>
            <span>·</span>
            <span style={{ color: '#F59E0B' }}>Account Billing: Unverified via Runtime</span>
          </>
        ) : (
          <span>
            Auditable Telemetry (T-309): Key presence does not verify account billing. Amortized estimate: $0.024/audit (&le; $0.025 INV-06 ceiling); Free-tier infra target: $0.00 (INV-01).
          </span>
        )}
      </div>

      {matrixOpen && (
        <div style={{ marginTop: '10px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E2436', color: '#94A3B8', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>Blocked / Exhausted Model</th>
                <th style={{ padding: '6px 8px' }}>ADR-006 Virtualization Path</th>
                <th style={{ padding: '6px 8px' }}>Configured Tier</th>
              </tr>
            </thead>
            <tbody>
              {ADR_006_MATRIX.map((row) => (
                <tr key={row.blocked} style={{ borderBottom: '1px solid #1E2436' }}>
                  <td style={{ padding: '6px 8px', color: '#FCA5A5' }}>{row.blocked}</td>
                  <td style={{ padding: '6px 8px', color: '#67E8F9' }}>{row.virtualizedBy}</td>
                  <td style={{ padding: '6px 8px', color: '#10B981' }}>{row.cost}</td>
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
