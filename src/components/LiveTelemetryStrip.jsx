import React, { useState } from 'react';

const ADR_006_MATRIX = [
  {
    blocked: 'Gemini Omni 1.1 / 1.2 Flash (0/0)',
    virtualizedBy: 'Gemini 3.5 Flash Lite (500 RPD) + Robotics ER 2 (20 RPD)',
    cost: '$0.00',
  },
  {
    blocked: 'Nano Banana / Pro (0/0)',
    virtualizedBy: 'NanoBananaDomDiffAdapter (Deterministic DOM/CSS Patch)',
    cost: '$0.00',
  },
  {
    blocked: 'Lyria 3 Clip / Pro (0/0)',
    virtualizedBy: 'LyriaWebAudioSynth (A4→E5 Chime, D3 Payment Alert)',
    cost: '$0.00',
  },
  {
    blocked: 'Gemini 4 Hydrogen (Exhausted 20/20)',
    virtualizedBy: 'Gemma 4 31B (14.4K RPD) + Gemini Decision 1 (10K RPD)',
    cost: '$0.00',
  },
];

export function LiveTelemetryStrip({ health, liveMeta, isProbing }) {
  const [matrixOpen, setMatrixOpen] = useState(false);

  return (
    <div
      style={{
        backgroundColor: '#11131C',
        border: '1px solid #1E2230',
        borderRadius: '12px',
        padding: '12px 14px',
        color: '#E2E8F0',
        fontSize: '12px',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: '#34D399', fontWeight: 700 }}>
            ● {health?.status === 'ok' ? 'EDGE ROUTER LIVE' : 'OFFLINE FALLBACK'}
          </span>
          <span style={{ background: '#090A0F', border: '1px solid #1E2230', borderRadius: '999px', padding: '3px 8px', color: '#67E8F9' }}>
            Gemma 4 31B [14.4K RPD]
          </span>
          <span style={{ background: '#090A0F', border: '1px solid #1E2230', borderRadius: '999px', padding: '3px 8px', color: '#67E8F9' }}>
            Decision 1 [10K RPD]
          </span>
          <span style={{ background: '#090A0F', border: '1px solid #1E2230', borderRadius: '999px', padding: '3px 8px', color: '#67E8F9' }}>
            Gemini 3.8 Live [Unlimited RPD]
          </span>
          <span style={{ background: '#090A0F', border: '1px solid #1E2230', borderRadius: '999px', padding: '3px 8px', color: '#67E8F9' }}>
            Antigravity [100 RPD]
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMatrixOpen((v) => !v)}
          style={{
            background: '#090A0F',
            color: '#22D3EE',
            border: '1px solid #1E2230',
            borderRadius: '8px',
            padding: '5px 10px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {matrixOpen ? '▲ Hide ADR-006 Quota Cascade Matrix' : '📊 View ADR-006 Quota Cascade Matrix'}
        </button>
      </div>

      {(isProbing || liveMeta) && (
        <div
          style={{
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid #1E2230',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignItems: 'center',
            fontFamily: 'ui-monospace, monospace',
            color: '#94A3B8',
          }}
        >
          {isProbing ? (
            <span style={{ color: '#22D3EE' }}>⏳ Probing /api/audit...</span>
          ) : (
            <>
              <span style={{ color: '#34D399' }}>HTTP {liveMeta.httpStatus}</span>
              <span>·</span>
              <span style={{ color: '#F8FAFC' }}>Title: &quot;{liveMeta.pageTitle}&quot;</span>
              <span>·</span>
              <span>Model: {liveMeta.activeModel}</span>
              <span>·</span>
              <span>{liveMeta.latencyMs}ms</span>
              <span>·</span>
              <span style={{ color: '#34D399' }}>Cost: $0.00 Free Tier / $0.024 Enterprise</span>
            </>
          )}
        </div>
      )}

      {matrixOpen && (
        <div style={{ marginTop: '10px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'ui-monospace, monospace' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E2230', color: '#94A3B8', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>Blocked / Exhausted Model</th>
                <th style={{ padding: '6px 8px' }}>ADR-006 Virtualization Path</th>
                <th style={{ padding: '6px 8px' }}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {ADR_006_MATRIX.map((row) => (
                <tr key={row.blocked} style={{ borderBottom: '1px solid #1E2230' }}>
                  <td style={{ padding: '6px 8px', color: '#FDA4AF' }}>{row.blocked}</td>
                  <td style={{ padding: '6px 8px', color: '#67E8F9' }}>{row.virtualizedBy}</td>
                  <td style={{ padding: '6px 8px', color: '#34D399' }}>{row.cost}</td>
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
