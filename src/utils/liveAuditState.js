/**
 * Pure state helpers for honest pending/settled live audit tracking (T-306).
 * Prevents heuristic client estimates from masquerading as live server results
 * and guards against stale or out-of-order responses sharing a hostname.
 */

export function normalizeAuditUrl(rawUrl) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProto);
    const cleanPath = parsed.pathname === '/' ? '/' : parsed.pathname.replace(/\/+$/, '');
    return `${parsed.protocol.toLowerCase()}//${parsed.host.toLowerCase()}${cleanPath}${parsed.search}`;
  } catch {
    return withProto;
  }
}

export const INITIAL_LIVE_AUDIT_STATE = {
  requestId: 0,
  status: 'idle', // 'idle' | 'pending' | 'settled' | 'error'
  submittedUrl: '',
  startedAt: null,
  result: null,
  error: null,
};

export function beginLiveAudit(state, rawUrl, nowMs = Date.now()) {
  const normalized = normalizeAuditUrl(rawUrl);
  return {
    requestId: (state?.requestId || 0) + 1,
    status: 'pending',
    submittedUrl: normalized,
    startedAt: nowMs,
    result: null,
    error: null,
  };
}

export function resolveLiveAudit(state, requestId, payload) {
  if (!state || requestId !== state.requestId) {
    return state;
  }
  return {
    ...state,
    status: 'settled',
    result: payload,
    error: null,
  };
}

export function failLiveAudit(state, requestId, errorMessage) {
  if (!state || requestId !== state.requestId) {
    return state;
  }
  return {
    ...state,
    status: 'error',
    result: null,
    error: errorMessage || 'Live /api/audit request failed. Result is UNVERIFIED.',
  };
}

export function resetLiveAudit(state) {
  return {
    requestId: (state?.requestId || 0) + 1,
    status: 'idle',
    submittedUrl: '',
    startedAt: null,
    result: null,
    error: null,
  };
}
