/**
 * Pramana AI — Quota-Aware Model Cascade Router (ADR-006)
 * Enforces INV-01 ($0.00 Google AI Studio Free Tier) & INV-05 (Mandatory Stack Names).
 */

export const FREE_TIER_QUOTAS = Object.freeze({
  // Hard-Blocked on Free Tier (0 RPM / 0 RPD) -> Must be virtualized
  'gemini-omni-1.2-flash': { rpm: 0, rpd: 0, tpm: 0, status: 'HARD_BLOCKED', virtualizedBy: 'OmniVisionVirtualizer' },
  'gemini-omni-1.1-flash': { rpm: 0, rpd: 0, tpm: 0, status: 'HARD_BLOCKED', virtualizedBy: 'OmniVisionVirtualizer' },
  'nano-banana-pro': { rpm: 0, rpd: 0, tpm: 0, status: 'HARD_BLOCKED', virtualizedBy: 'NanoBananaDomDiffAdapter' },
  'nano-banana': { rpm: 0, rpd: 0, tpm: 0, status: 'HARD_BLOCKED', virtualizedBy: 'NanoBananaDomDiffAdapter' },
  'lyria-3-pro': { rpm: 0, rpd: 0, tpm: 0, status: 'HARD_BLOCKED', virtualizedBy: 'LyriaWebAudioSynth' },
  'lyria-3-clip': { rpm: 0, rpd: 0, tpm: 0, status: 'HARD_BLOCKED', virtualizedBy: 'LyriaWebAudioSynth' },

  // Exhausted / Rate-Throttled Today (Do Not Call by Default)
  'gemini-4-hydrogen': { rpm: 5, rpd: 20, tpm: 250000, usedToday: 20, status: 'EXHAUSTED' },
  'gemini-3.8-flash': { rpm: 5, rpd: 20, tpm: 250000, usedToday: 18, status: 'THROTTLED' },

  // Standard Multimodal Workhorses (500 RPD)
  'gemini-3.5-flash-lite': { rpm: 15, rpd: 500, tpm: 250000, usedToday: 0, status: 'ACTIVE' },
  'gemini-3.1-flash-lite': { rpm: 15, rpd: 500, tpm: 250000, usedToday: 0, status: 'ACTIVE' },
  'gemini-robotics-er-2-preview': { rpm: 5, rpd: 20, tpm: 250000, usedToday: 0, status: 'ACTIVE' },
  'gemini-3.8-flash-tts': { rpm: 3, rpd: 10, tpm: 10000, usedToday: 0, status: 'ACTIVE' },

  // Unlimited RPD Live Streaming Tier
  'gemini-3.8-live': { rpm: 60, rpd: Infinity, tpm: 65000, usedToday: 0, status: 'UNLIMITED_RPD' },
  'gemini-3.8-live-extended-thinking': { rpm: 60, rpd: Infinity, tpm: 65000, usedToday: 0, status: 'UNLIMITED_RPD' },
  'gemini-2.5-flash-native-audio-dialog': { rpm: 60, rpd: Infinity, tpm: 1000000, usedToday: 0, status: 'UNLIMITED_RPD' },
  'gemini-3.5-transcribe-live': { rpm: 60, rpd: Infinity, tpm: 20000, usedToday: 0, status: 'UNLIMITED_RPD' },

  // High-Throughput Daily Workhorses
  'gemma-4-31b-it': { rpm: 30, rpd: 14400, tpm: 16000, usedToday: 0, status: 'ACTIVE' },
  'gemma-4-26b-it': { rpm: 30, rpd: 14400, tpm: 16000, usedToday: 0, status: 'ACTIVE' },
  'gemini-decision-1': { rpm: 200, rpd: 10000, tpm: 50000, usedToday: 0, status: 'ACTIVE' },
  'gemini-embedding-1': { rpm: 100, rpd: 1000, tpm: 30000, usedToday: 0, status: 'ACTIVE' },
  'gemini-embedding-2': { rpm: 100, rpd: 1000, tpm: 30000, usedToday: 0, status: 'ACTIVE' },
  'antigravity-agents-api': { rpm: 60, rpd: 100, tpm: 100000, usedToday: 0, status: 'ACTIVE' },
});

export class OmniVisionVirtualizer {
  constructor(router) {
    this.router = router;
    this.logicalModel = 'Gemini Omni';
  }

  planPipeline({ needsSpatialBoxes = true, isLiveStream = false } = {}) {
    const steps = [];
    if (isLiveStream) {
      steps.push({ role: 'live_frame_stream', model: 'gemini-3.8-live', logicalBrand: 'Gemini Live' });
    } else {
      steps.push({
        role: 'multimodal_keyframe_reasoning',
        model: this.router.selectModel('multimodal_reasoning').model,
        logicalBrand: this.logicalModel,
      });
    }
    if (needsSpatialBoxes) {
      const spatial = this.router.selectModel('spatial_bounding_box');
      steps.push({
        role: '2d_spatial_grounding',
        model: spatial.model,
        logicalBrand: this.logicalModel,
      });
    }
    return {
      virtualized: true,
      logicalBrand: this.logicalModel,
      steps,
    };
  }
}

export class NanoBananaDomDiffAdapter {
  constructor() {
    this.logicalModel = 'Nano Banana';
  }

  buildVisualPatch({ selector, beforeStyles = {}, afterStyles = {}, description = '' }) {
    return {
      virtualized: true,
      logicalBrand: this.logicalModel,
      mode: 'deterministic_dom_css_injection',
      selector,
      before_css: beforeStyles,
      after_css: afterStyles,
      diff_summary: description || `Deterministic CSS patch injected for ${selector}`,
      telemetry_cost_usd: 0.0,
    };
  }
}

export class LyriaWebAudioSynth {
  constructor() {
    this.logicalModel = 'Lyria';
    this._ctx = null;
  }

  _getContext() {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this._ctx) {
      this._ctx = new AudioCtx();
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
    return this._ctx;
  }

  /**
   * Ascending chime: A4 (440 Hz) -> E5 (659.25 Hz)
   */
  playSuccessChime() {
    const ctx = this._getContext();
    if (!ctx) return { played: false, reason: 'no_audio_context', logicalBrand: this.logicalModel };

    const now = ctx.currentTime;
    const notes = [
      { freq: 440.0, start: 0.0, dur: 0.14 },   // A4
      { freq: 659.25, start: 0.12, dur: 0.22 }, // E5
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, now + n.start);
      gain.gain.setValueAtTime(0.001, now + n.start);
      gain.gain.exponentialRampToValueAtTime(0.12, now + n.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.start);
      osc.stop(now + n.start + n.dur + 0.01);
    }
    return { played: true, cue: 'A4->E5', logicalBrand: this.logicalModel };
  }

  /**
   * Payment-alert tone: D3 (146.83 Hz)
   */
  playPaymentAlert() {
    const ctx = this._getContext();
    if (!ctx) return { played: false, reason: 'no_audio_context', logicalBrand: this.logicalModel };

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(146.83, now); // D3
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
    return { played: true, cue: 'D3', logicalBrand: this.logicalModel };
  }
}

const TASK_CASCADES = {
  log_pruning: ['gemma-4-31b-it', 'gemma-4-26b-it'],
  anomaly_triage: ['gemini-decision-1', 'gemma-4-31b-it'],
  multimodal_reasoning: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-live'],
  spatial_bounding_box: ['gemini-robotics-er-2-preview', 'gemini-3.5-flash-lite'],
  voice_live: ['gemini-3.8-live', 'gemini-2.5-flash-native-audio-dialog', 'gemini-3.5-transcribe-live'],
  ast_embedding: ['gemini-embedding-2', 'gemini-embedding-1'],
  pr_synthesis: ['antigravity-agents-api', 'gemma-4-31b-it'],
  tts_cue: ['gemini-3.8-flash-tts'],
};

export class QuotaAwareRouter {
  constructor(initialQuotas = FREE_TIER_QUOTAS) {
    this.quotas = {};
    for (const [k, v] of Object.entries(initialQuotas)) {
      this.quotas[k] = { ...v, usedToday: v.usedToday || 0 };
    }
    this.omniVirtualizer = new OmniVisionVirtualizer(this);
    this.nanoBananaAdapter = new NanoBananaDomDiffAdapter();
    this.lyriaSynth = new LyriaWebAudioSynth();
  }

  isAvailable(modelId) {
    const q = this.quotas[modelId];
    if (!q) return false;
    if (q.status === 'HARD_BLOCKED' || q.status === 'EXHAUSTED') return false;
    if (q.rpd === Infinity) return true;
    return q.usedToday < q.rpd;
  }

  selectModel(taskType) {
    const candidates = TASK_CASCADES[taskType] || ['gemini-3.5-flash-lite', 'gemma-4-31b-it'];
    for (const modelId of candidates) {
      if (this.isAvailable(modelId)) {
        return {
          model: modelId,
          taskType,
          quota: { ...this.quotas[modelId] },
          fallbackUsed: modelId !== candidates[0],
        };
      }
    }
    return {
      model: 'deterministic-fixture',
      taskType,
      quota: { rpm: 0, rpd: Infinity, status: 'LOCAL_FALLBACK' },
      fallbackUsed: true,
    };
  }

  recordUsage(modelId, count = 1) {
    if (this.quotas[modelId] && this.quotas[modelId].rpd !== Infinity) {
      this.quotas[modelId].usedToday += count;
      if (this.quotas[modelId].usedToday >= this.quotas[modelId].rpd) {
        this.quotas[modelId].status = 'EXHAUSTED';
      }
    }
  }

  getQuotaSnapshot() {
    return Object.entries(this.quotas).map(([model, info]) => ({
      model,
      ...info,
      remainingRpd: info.rpd === Infinity ? 'UNLIMITED' : Math.max(0, info.rpd - (info.usedToday || 0)),
    }));
  }
}

export default QuotaAwareRouter;
