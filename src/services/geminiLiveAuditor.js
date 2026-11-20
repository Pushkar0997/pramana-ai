/**
 * Direct Google AI Studio Gemini API enrichment for Firebase Hosting environment.
 * Ensures every live audit executes a real Gemini API call (gemini-3.5-flash-lite -> gemini-3.1-flash-lite)
 * and records real measured token usage (promptTokenCount, candidatesTokenCount, totalTokenCount).
 */

export function getFirebaseEnvGeminiKey() {
  try {
    const key = import.meta?.env?.VITE_GEMINI_API_KEY;
    return key ? String(key).trim() : '';
  } catch {
    return '';
  }
}

async function invokeGeminiRest(modelId, apiKey, prompt) {
  const started = performance.now();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const generationConfig = {
    maxOutputTokens: 280,
    temperature: 0.1,
    responseMimeType: 'application/json',
    ...(modelId === 'gemini-3.1-flash-lite' ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
  };

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(6000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      }),
    });
    const latencyMs = Math.max(1, Math.round(performance.now() - started));
    if (!resp.ok) {
      return { parsed: null, usageMetadata: null, latencyMs, status: `HTTP_${resp.status}` };
    }
    const data = await resp.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const usageMetadata = data?.usageMetadata || null;
    if (!raw) {
      return { parsed: null, usageMetadata, latencyMs, status: 'EMPTY_CANDIDATE' };
    }
    const cleaned = String(raw).replace(/^```json\s*|\s*```$/gi, '').trim();
    return { parsed: JSON.parse(cleaned), usageMetadata, latencyMs, status: 'OK' };
  } catch (err) {
    const latencyMs = Math.max(1, Math.round(performance.now() - started));
    return {
      parsed: null,
      usageMetadata: null,
      latencyMs,
      status: err instanceof Error ? err.name : 'FETCH_ERROR',
    };
  }
}

export async function enrichAuditWithFirebaseGemini(auditData) {
  if (!auditData || !auditData.isCustomUrl) return auditData;
  const finding = auditData.customFinding || {};
  const limitation = finding.auditLimitation || auditData.scrapedDom?.auditLimitation || {};

  // If the server already executed a successful Gemini call with measured tokens, keep it
  if (auditData.telemetry?.measuredTokenUsage?.available) {
    return auditData;
  }

  const apiKey = getFirebaseEnvGeminiKey();
  if (!apiKey || limitation.limited) {
    return auditData;
  }

  const dom = auditData.scrapedDom || {};
  const findingsList = finding.findings || [];
  const findingsText = findingsList
    .slice(0, 5)
    .map((f) => `[${f.id}] ${f.title} (snippet: ${f.markupSnippet || 'n/a'})`)
    .join('; ');

  const prompt = [
    `You are Pramana AI auditing STATIC PUBLIC HTML of ${auditData.targetUrl} (hostname: ${auditData.hostname}).`,
    `Surface: ${finding.surfaceCategory}. Calibrated Severity: ${finding.severity}. Score: ${finding.domHealthScore}/100.`,
    `Observed HTML facts: pageTitle="${dom.pageTitle}", staticNodes=${dom.accessibilityMetrics?.estimatedDomNodes}, scripts=${dom.accessibilityMetrics?.totalScripts}.`,
    `Detected defects: ${findingsText || '0 static defects'}.`,
    'Return strict JSON with keys: anomalyTitle (string), summary (2 clear, plain-English sentences explaining what these exact observed HTML defects do to mobile shoppers and how to fix them). Do NOT invent revenue or conversion percentages.',
  ].join(' ');

  const providerCalls = [...(auditData.telemetry?.providerCalls || [])];
  for (const modelId of ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']) {
    const r = await invokeGeminiRest(modelId, apiKey, prompt);
    providerCalls.push({
      model: modelId,
      status: r.status,
      latencyMs: r.latencyMs,
    });
    if (r.parsed) {
      return {
        ...auditData,
        activeModel: modelId,
        executionMode: 'live_public_html_scrape_plus_gemini',
        telemetry: {
          ...(auditData.telemetry || {}),
          credentialsConfigured: true,
          providerCalls,
          providerCallCount: providerCalls.length,
          measuredTokenUsage: {
            available: Boolean(r.usageMetadata),
            inputTokens: r.usageMetadata?.promptTokenCount ?? null,
            outputTokens: r.usageMetadata?.candidatesTokenCount ?? null,
            totalTokens: r.usageMetadata?.totalTokenCount ?? null,
            note: `Measured directly from Google AI Studio (${modelId}) in Firebase environment.`,
          },
        },
        customFinding: {
          ...finding,
          anomalyTitle: r.parsed.anomalyTitle || finding.anomalyTitle,
          summary: r.parsed.summary || finding.summary,
        },
      };
    }
  }

  return {
    ...auditData,
    telemetry: {
      ...(auditData.telemetry || {}),
      credentialsConfigured: true,
      providerCalls,
      providerCallCount: providerCalls.length,
    },
  };
}
