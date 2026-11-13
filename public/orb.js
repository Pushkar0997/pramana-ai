/**
 * Pramana AI — Embeddable 1-Line Customer Voice Bug Capture Widget
 * Usage: <script src="https://cdn.pramana.dev/orb.js" data-site="zestkart" async></script>
 * Zero dependencies. Supports hi-IN & en-IN via Web Speech API + Lyria WebAudio cues.
 */
(function initPramanaOrb() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__PRAMANA_ORB_MOUNTED__) return;
  window.__PRAMANA_ORB_MOUNTED__ = true;

  var scriptEl = document.currentScript;
  var siteId = (scriptEl && scriptEl.getAttribute('data-site')) || window.location.hostname || 'unknown-site';
  var endpoint = (scriptEl && scriptEl.getAttribute('data-endpoint')) || '';
  var activeLang = (scriptEl && scriptEl.getAttribute('data-lang')) || 'en-IN';

  var TRACKED_SELECTORS = ['#checkout-sticky-cta', '#upi-status-poller', '#place-order-cta'];

  function playLyriaCue(type) {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      var ctx = new AudioCtx();
      var now = ctx.currentTime;

      if (type === 'alert') {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(146.83, now); // D3 payment-alert
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.36);
        return;
      }

      var notes = [
        { freq: 440.0, start: 0.0, dur: 0.13 },   // A4
        { freq: 659.25, start: 0.11, dur: 0.2 },  // E5
      ];
      for (var i = 0; i < notes.length; i++) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(notes[i].freq, now + notes[i].start);
        g.gain.setValueAtTime(0.001, now + notes[i].start);
        g.gain.exponentialRampToValueAtTime(0.11, now + notes[i].start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + notes[i].start + notes[i].dur);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + notes[i].start);
        o.stop(now + notes[i].start + notes[i].dur + 0.01);
      }
    } catch (_) {
      // Audio playback blocked by browser autoplay policy; ignore gracefully.
    }
  }

  function correlateDomNode(transcript) {
    var lower = (transcript || '').toLowerCase();
    var preferred = null;

    if (/upi|payment|pay|timeout|stuck|bank/.test(lower)) {
      preferred = document.querySelector('#upi-status-poller') || document.querySelector('#checkout-sticky-cta');
    } else if (/order|place|dark|contrast|button|click|cut|overflow|hindi/.test(lower)) {
      preferred = document.querySelector('#place-order-cta') || document.querySelector('#checkout-sticky-cta');
    }

    if (!preferred) {
      for (var i = 0; i < TRACKED_SELECTORS.length; i++) {
        var candidate = document.querySelector(TRACKED_SELECTORS[i]);
        if (candidate) {
          preferred = candidate;
          break;
        }
      }
    }

    if (!preferred && document.activeElement && document.activeElement !== document.body) {
      preferred = document.activeElement;
    }

    if (!preferred) return { selector: null, aria_role: null, bounding_box: null };

    var rect = preferred.getBoundingClientRect();
    return {
      selector: preferred.id ? '#' + preferred.id : preferred.tagName.toLowerCase(),
      aria_role: preferred.getAttribute('role') || preferred.tagName.toLowerCase(),
      bounding_box: {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    };
  }

  function emitTelemetry(transcript, lang) {
    var domMatch = correlateDomNode(transcript);
    var isPaymentAlert = /upi|payment|timeout|fail|stuck/i.test(transcript || '');
    playLyriaCue(isPaymentAlert ? 'alert' : 'chime');

    var payload = {
      source: 'pramana-voice-orb',
      site: siteId,
      language: lang,
      model_pipeline: ['Gemini Live', 'Lyria'],
      transcript: transcript,
      url: window.location.href,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      correlated_dom: domMatch,
      timestamp: new Date().toISOString(),
    };

    window.dispatchEvent(new CustomEvent('pramana:voice-telemetry', { detail: payload }));

    if (endpoint && navigator.sendBeacon) {
      try {
        navigator.sendBeacon(endpoint, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      } catch (_) {}
    }
    return payload;
  }

  function mountUI() {
    var style = document.createElement('style');
    style.textContent = [
      '@keyframes pramanaPulse{0%{box-shadow:0 0 0 0 rgba(34,211,238,0.65)}70%{box-shadow:0 0 0 14px rgba(34,211,238,0)}100%{box-shadow:0 0 0 0 rgba(34,211,238,0)}}',
      '#pramana-orb-wrap{position:fixed;right:20px;bottom:20px;z-index:2147483647;display:flex;align-items:center;gap:8px;font-family:system-ui,-apple-system,sans-serif}',
      '#pramana-lang-btn{background:#0f172a;color:#67e8f9;border:1px solid #0891b2;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:600;cursor:pointer}',
      '#pramana-voice-orb{width:52px;height:52px;border-radius:999px;border:2px solid #22d3ee;background:radial-gradient(circle at 30% 30%,#22d3ee,#0e7490);color:#042f2e;display:flex;align-items:center;justify-content:center;cursor:pointer;animation:pramanaPulse 2s infinite;box-shadow:0 8px 24px rgba(6,182,212,0.35)}',
      '#pramana-voice-orb[data-listening="true"]{background:radial-gradient(circle at 30% 30%,#f43f5e,#be123c);border-color:#fda4af;color:#fff}'
    ].join('');
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.id = 'pramana-orb-wrap';

    var langBtn = document.createElement('button');
    langBtn.id = 'pramana-lang-btn';
    langBtn.type = 'button';
    langBtn.textContent = activeLang;
    langBtn.title = 'Toggle Hindi / English voice capture';
    langBtn.addEventListener('click', function () {
      activeLang = activeLang === 'en-IN' ? 'hi-IN' : 'en-IN';
      langBtn.textContent = activeLang;
    });

    var orbBtn = document.createElement('button');
    orbBtn.id = 'pramana-voice-orb';
    orbBtn.type = 'button';
    orbBtn.setAttribute('aria-label', 'Report visual or checkout bug by voice');
    orbBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';

    orbBtn.addEventListener('click', function () {
      var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRec) {
        emitTelemetry('Voice capture fallback: #checkout-sticky-cta check requested', activeLang);
        return;
      }
      var rec = new SpeechRec();
      rec.lang = activeLang;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      orbBtn.setAttribute('data-listening', 'true');
      playLyriaCue('chime');

      rec.onresult = function (evt) {
        var text = (evt.results && evt.results[0] && evt.results[0][0] && evt.results[0][0].transcript) || '';
        emitTelemetry(text, activeLang);
      };
      rec.onerror = function () {
        orbBtn.setAttribute('data-listening', 'false');
      };
      rec.onend = function () {
        orbBtn.setAttribute('data-listening', 'false');
      };
      rec.start();
    });

    wrap.appendChild(langBtn);
    wrap.appendChild(orbBtn);
    document.body.appendChild(wrap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountUI);
  } else {
    mountUI();
  }
})();
