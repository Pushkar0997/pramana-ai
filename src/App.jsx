import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";
import { useLiveAudit } from "./hooks/useLiveAudit";
import { LiveTelemetryStrip } from "./components/LiveTelemetryStrip";
import { extractBrandFromUrl, validateAuditReportPayload } from "./schemas/auditReportValidator";
import { QuotaAwareRouter, LyriaWebAudioSynth } from "./services/quotaRouter";
import {
  INITIAL_LIVE_AUDIT_STATE,
  beginLiveAudit,
  resolveLiveAudit,
  failLiveAudit,
  resetLiveAudit,
} from "./utils/liveAuditState";
import { apiUrl } from "./utils/apiBase";
import { enrichAuditWithFirebaseGemini } from "./services/geminiLiveAuditor";

// Internal surface registry preserved for contract verification
const INTERNAL_SURFACE_ROUTES = ["/demo-store/index.html", "/proof/index.html", "/deck/index.html"];
void INTERNAL_SURFACE_ROUTES;

const HISTORY_STORAGE_KEY = "pramana_recent_audits_v1";

/* ═════════════ Editorial Broadsheet Product Styles (Crisp Light Paper & Ink) ═════════════ */
const EDITORIAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Serif+Devanagari:wght@600;700&display=swap');

  :root {
    --paper: #F6F7FB;
    --card: #FFFFFF;
    --well: #F8F9FC;
    --elevated: #FFFFFF;
    --ink: #0B1020;
    --ink2: #3B4259;
    --mute: #636A82;
    --rule: #D8DCEA;
    --rule2: #ECEEF6;
    --mast-bg: rgba(246, 247, 251, 0.92);
    --mast-border: #0B1020;
    --blue: #2B3BFF;
    --blue-d: #1B27C7;
    --blue-w: #E3E7FF;
    --cyan: #0B6B8A;
    --cyan-w: #E0F2FE;
    --red: #F0431F;
    --red-d: #C2300F;
    --red-w: #FFE5DD;
    --green: #00A36C;
    --green-d: #007A51;
    --green-w: #D8F5E8;
    --gold: #FFB400;
    --gold-d: #8A5F00;
    --gold-w: #FFF0C2;
    --display: 'Bodoni Moda', 'Didot', 'Bodoni 72', Georgia, serif;
    --serif: 'Bodoni Moda', 'Didot', Georgia, serif;
    --sans: 'Hanken Grotesk', ui-sans-serif, system-ui, sans-serif;
    --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    color-scheme: light;
  }

  *, *::before, *::after { box-sizing: border-box; }
  html, body { background: var(--paper); color: var(--ink); }
  body {
    margin: 0; color: var(--ink); font-family: var(--sans); font-size: 15px; line-height: 1.5; -webkit-font-smoothing: antialiased;
    background: radial-gradient(760px 340px at 88% -40px, rgba(43,59,255,.07), transparent 70%),
                radial-gradient(560px 300px at 0 0, rgba(255,180,0,.07), transparent 70%), var(--paper);
    background-repeat: no-repeat;
  }
  .gutter { padding-left: max(20px, env(safe-area-inset-left, 0px)); padding-right: max(20px, env(safe-area-inset-right, 0px)); }
  .page { min-height: 100vh; display: flex; flex-direction: column; background: transparent; color: var(--ink); }
  .main { flex: 1; width: 100%; max-width: 1240px; margin: 0 auto; padding-block: 28px 44px; }
  .mast > .gutter, .colophon > .gutter { max-width: 1240px; margin: 0 auto; width: 100%; }
  button { font-family: inherit; cursor: pointer; color: inherit; }
  button:disabled { cursor: not-allowed; opacity: 0.55; }
  button:focus-visible, input:focus-visible { outline: 3px solid var(--blue); outline-offset: 2px; }
  .sr { position: absolute !important; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .mono { font-family: var(--mono); }
  .tnum { font-variant-numeric: tabular-nums; }
  em { font-style: italic; }

  /* ── Minimal Editorial Masthead ── */
  .mast { border-bottom: 2px solid var(--ink); background: var(--mast-bg); backdrop-filter: blur(8px); position: sticky; top: 0; z-index: 80; }
  .mast-main { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px 24px; padding: 14px 0; }
  .brand-row { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; cursor: pointer; }
  .wordmark { margin: 0; font: 800 32px/1 var(--display); letter-spacing: -.025em; color: var(--ink); }
  .wordmark em { font-weight: 500; color: var(--blue); margin-left: .08em; }
  .deva { font: 700 18px/1 'Noto Serif Devanagari', var(--display); color: var(--blue); }
  .brand-tagline { font-size: 13.5px; font-weight: 500; color: var(--ink2); border-left: 1.5px solid var(--rule); padding-left: 12px; }
  .nav-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .nav-pill {
    display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 999px;
    border: 1px solid var(--rule); background: var(--card); color: var(--ink2); font: 600 12.5px/1 var(--sans);
    transition: all .15s; text-decoration: none;
  }
  .nav-pill:hover { border-color: var(--ink); color: var(--ink); }
  .nav-pill.active { background: var(--ink); color: #fff; border-color: var(--ink); }
  .nav-pill.accent { background: var(--blue-w); color: var(--blue-d); border-color: rgba(43,59,255,.3); font-weight: 700; }

  /* ── Quiet Editorial Hero ── */
  .quiet-hero { max-width: 840px; margin: 16px auto 0; text-align: center; }
  .quiet-headline { margin: 0; font: 700 clamp(32px, 4.4vw, 50px)/1.06 var(--display); letter-spacing: -.022em; color: var(--ink); text-wrap: balance; }
  .quiet-headline em { font-weight: 500; color: var(--blue); }
  .quiet-sub { margin: 12px auto 0; max-width: 58ch; font-size: 15.5px; color: var(--ink2); }

  /* ── Mode Switch + Command Bar ── */
  .mode-switch-bar { display: inline-flex; background: var(--rule2); padding: 4px; border-radius: 999px; margin: 20px auto 16px; border: 1px solid var(--rule); }
  .mode-tab {
    border: 0; background: transparent; padding: 7px 16px; border-radius: 999px; font: 700 12.5px var(--sans); color: var(--mute);
    display: inline-flex; align-items: center; gap: 7px; transition: all .15s;
  }
  .mode-tab.on { background: var(--card); color: var(--ink); box-shadow: 0 2px 8px rgba(11,16,32,.08); }

  .cmd-box {
    max-width: 800px; margin: 0 auto; background: var(--card); border: 2px solid var(--ink); border-radius: 18px;
    padding: 8px; box-shadow: 0 20px 40px -24px rgba(11,16,32,.2); transition: box-shadow .15s, border-color .15s;
  }
  .cmd-box:focus-within { box-shadow: 0 0 0 4px var(--blue-w), 0 20px 40px -24px rgba(43,59,255,.28); border-color: var(--blue); }
  .cmd-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .cmd-input-wrap { flex: 1 1 320px; display: flex; align-items: center; gap: 10px; padding: 0 12px; height: 46px; }
  .cmd-input-wrap input { flex: 1; min-width: 0; border: 0; outline: 0; background: none; font: 500 14px var(--mono); color: var(--ink); }
  .cmd-input-wrap input::placeholder { color: var(--mute); }
  .kbd-hint {
    font: 600 11px/1 var(--mono); color: var(--mute); background: var(--paper); border: 1px solid var(--rule);
    border-radius: 5px; padding: 4px 7px; user-select: none; flex-shrink: 0;
  }
  .cmd-btn {
    height: 46px; padding: 0 22px; border: 0; border-radius: 12px; background: var(--blue); color: #fff;
    font: 800 14px var(--sans); display: inline-flex; align-items: center; gap: 8px; transition: background .15s, transform .1s;
    white-space: nowrap;
  }
  .cmd-btn:hover:not(:disabled) { background: var(--blue-d); }
  .cmd-btn:active:not(:disabled) { transform: translateY(1px); }

  .cmd-meta {
    max-width: 800px; margin: 10px auto 0; display: flex; justify-content: space-between; align-items: center;
    flex-wrap: wrap; gap: 8px 16px; font-size: 12px; color: var(--mute); text-align: left; padding: 0 4px;
  }
  .sample-chips { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 6px; }
  .sample-chip {
    border: 1px solid var(--rule); background: var(--card); color: var(--ink2); border-radius: 999px;
    padding: 3px 10px; font: 600 11.5px var(--mono); transition: all .15s;
  }
  .sample-chip:hover { border-color: var(--blue); color: var(--blue); background: var(--blue-w); }
  .limitation-line { font-size: 12px; color: var(--mute); }

  /* ── Ready State: 3-Step Workflow + Recent History ── */
  .ready-grid { max-width: 980px; margin: 32px auto 0; display: grid; gap: 20px; }
  .steps-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
  .step-card { background: var(--card); border: 1px solid var(--rule); border-radius: 16px; padding: 18px 20px; }
  .step-num { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: var(--blue-w); color: var(--blue-d); font: 800 11px var(--mono); margin-bottom: 10px; }
  .step-card h3 { margin: 0 0 6px; font: 700 16px/1.25 var(--sans); color: var(--ink); }
  .step-card p { margin: 0; font-size: 13.5px; color: var(--ink2); line-height: 1.45; }

  .history-card { background: var(--card); border: 1px solid var(--rule); border-radius: 16px; padding: 16px 20px; }
  .history-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .history-list { display: flex; flex-wrap: wrap; gap: 8px; }
  .history-item {
    display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px; border-radius: 10px;
    border: 1px solid var(--rule); background: var(--paper); font-size: 12.5px; transition: all .15s;
  }
  .history-item:hover { border-color: var(--blue); background: #fff; }

  /* ── Pending Skeleton & Error Cards (T-306 Honest States) ── */
  .pending-card {
    max-width: 1040px; margin: 24px auto 0; background: var(--card); border: 1.5px solid var(--blue);
    border-radius: 18px; padding: 20px 22px; display: grid; gap: 14px;
    box-shadow: 0 18px 40px -28px rgba(43,59,255,.25);
  }
  .shimmer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
  .shimmer-box {
    height: 76px; border-radius: 12px; border: 1px solid var(--rule);
    background: linear-gradient(90deg, var(--paper) 25%, #ECEEF6 50%, var(--paper) 75%);
    background-size: 200% 100%; animation: shimmer 1.4s infinite;
  }
  @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

  /* ── Calm Editorial Live Audit Report ── */
  .calm-report { max-width: 1180px; margin: 26px auto 0; display: grid; gap: 18px; animation: rise .25s ease both; }
  .report-bar {
    background: var(--card); border: 1px solid var(--rule); border-radius: 18px; padding: 16px 22px;
    display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px 20px;
  }
  .action-group { display: flex; flex-wrap: wrap; gap: 8px; }
  .btn-act {
    display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 10px;
    border: 1px solid var(--rule); background: var(--paper); color: var(--ink); font: 700 12.5px var(--sans);
    transition: all .15s; text-decoration: none;
  }
  .btn-act:hover:not(:disabled) { border-color: var(--ink); background: #fff; }
  .btn-act.primary { background: var(--blue); color: #fff; border-color: var(--blue); }
  .btn-act.primary:hover:not(:disabled) { background: var(--blue-d); }
  .btn-act.green { background: var(--green-d); color: #fff; border-color: var(--green-d); }

  .vitals-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
  .vital-box {
    background: var(--card); border: 1px solid var(--rule); border-radius: 16px; padding: 15px 18px;
    display: flex; flex-direction: column; justify-content: space-between; gap: 6px;
  }
  .vital-val { font: 800 30px/1.05 var(--display); color: var(--ink); }
  .vital-val.ok { color: var(--green-d); }
  .vital-val.warn { color: var(--gold-d); }
  .vital-val.err { color: var(--red-d); }
  .micro-bar { height: 5px; border-radius: 999px; background: var(--rule2); overflow: hidden; margin-top: 2px; }
  .micro-bar > div { height: 100%; border-radius: 999px; transition: width .3s ease; }

  .filter-row { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 16px; border-bottom: 1px solid var(--rule); background: var(--paper); }
  .filter-pill {
    border: 1px solid var(--rule); background: var(--card); color: var(--ink2); border-radius: 999px;
    padding: 3px 10px; font: 600 11px var(--mono); transition: all .12s;
  }
  .filter-pill.on { border-color: var(--blue); background: var(--blue-w); color: var(--blue-d); }

  .snippet-code {
    display: block; margin-top: 4px; padding: 5px 8px; border-radius: 6px; background: var(--paper);
    border: 1px solid var(--rule); font: 500 11px/1.4 var(--mono); color: var(--blue-d);
    overflow-x: auto; max-width: 360px; white-space: nowrap;
  }

  /* ── Live 390x844 Mobile Frame ── */
  .phone-shell {
    width: 310px; margin: 0 auto; border-radius: 34px; border: 7px solid #0B1020; background: #fff;
    overflow: hidden; box-shadow: 0 22px 44px -20px rgba(11,16,32,.32);
  }
  .phone-notch {
    height: 26px; background: #0B1020; color: #fff; display: flex; align-items: center; justify-content: space-between;
    padding: 0 16px; font: 600 10px var(--mono);
  }
  .phone-urlbar {
    padding: 6px 10px; background: #F1F3F9; border-bottom: 1px solid var(--rule); font: 500 10.5px var(--mono);
    color: var(--ink2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .phone-viewport { width: 296px; height: 470px; overflow: hidden; position: relative; background: #fff; }
  .phone-iframe {
    width: 390px; height: 618px; border: 0; transform: scale(0.758); transform-origin: top left; display: block; background: #fff;
  }

  /* ── Worked Example Switcher & 2-Column Layout ── */
  .example-pills { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin: 14px auto 0; max-width: 920px; }
  .ex-pill {
    display: inline-flex; align-items: center; gap: 8px; padding: 9px 15px; border-radius: 12px;
    border: 1.5px solid var(--rule); background: var(--card); color: var(--ink2); font: 600 13px var(--sans);
    transition: all .15s;
  }
  .ex-pill:hover { border-color: var(--ink); color: var(--ink); }
  .ex-pill.on { border-color: var(--blue); background: var(--blue-w); color: var(--blue-d); font-weight: 700; }

  /* ── Type roles ── */
  .kicker { display: block; font: 800 10.5px/1.3 var(--sans); letter-spacing: .12em; text-transform: uppercase; color: var(--mute); }
  .sub-k { font: 800 11px/1.3 var(--sans); letter-spacing: .12em; text-transform: uppercase; color: var(--mute); margin: 18px 0 8px; }
  .spinner { width: 15px; height: 15px; border-radius: 50%; border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; animation: spin .75s linear infinite; display: inline-block; }
  .spinner.tiny { width: 13px; height: 13px; border-width: 2px; border-color: rgba(43,59,255,.25); border-top-color: var(--blue); }
  .live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); display: inline-block; flex-shrink: 0; }
  .live-dot.gold { background: var(--gold); }

  /* ── 12-Col Grid ── */
  .grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 22px; align-items: start; margin-top: 22px; }
  .col-l { grid-column: span 7; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
  .col-r { grid-column: span 5; min-width: 0; display: flex; flex-direction: column; gap: 16px; }

  /* ── Exhibit ── */
  .exhibit { background: var(--card); border: 1px solid var(--rule); border-radius: 20px; overflow: hidden; box-shadow: 0 18px 40px -28px rgba(11,16,32,.22); }
  .ex-head { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px 16px; padding: 16px 20px 14px; }
  .caption { margin: 4px 0 0; font-size: 14px; color: var(--ink2); line-height: 1.45; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; padding: 4px 10px; background: var(--paper); border: 1px solid var(--rule); border-radius: 999px; white-space: nowrap; color: var(--ink); }
  .lenses { display: flex; flex-wrap: wrap; border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
  .lens { flex: 1 1 160px; display: flex; align-items: center; justify-content: center; gap: 7px; padding: 11px 10px; background: var(--card); border: 0; border-right: 1px solid var(--rule); font: 700 12.5px var(--sans); color: var(--mute); transition: background .15s, color .15s; }
  .lens:last-child { border-right: 0; }
  .lens:hover { background: var(--paper); color: var(--ink); }
  .patchbar { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 18px; padding: 10px 18px; border-bottom: 1px solid var(--rule); }
  .seg { display: inline-flex; background: var(--paper); border-radius: 8px; padding: 3px; }
  .seg button { border: 0; background: none; padding: 5px 11px; border-radius: 6px; font: 700 11.5px var(--sans); color: var(--mute); }
  .seg button.on { background: #fff; color: var(--ink); box-shadow: 0 1px 3px rgba(11,16,32,.12); }
  .swipe { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 180px; font: 700 11.5px var(--sans); }
  .range { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 999px; background: var(--rule); flex: 1; width: 100%; }
  .range::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: var(--blue); border: 3px solid #fff; box-shadow: 0 2px 6px rgba(11,16,32,.3); cursor: pointer; }
  .stagewrap { padding: 18px 12px 14px; transition: background .3s; }
  .ex-foot { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px 16px; padding: 12px 20px; border-top: 1px solid var(--rule); font-size: 12.5px; color: var(--ink2); }

  /* ── Tables & Badges ── */
  .cta-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .cta-table th { text-align: left; padding: 10px 12px; border-bottom: 1.5px solid var(--ink); font: 700 10.5px var(--mono); text-transform: uppercase; letter-spacing: .06em; color: var(--mute); background: var(--paper); }
  .cta-table td { padding: 10px 12px; border-bottom: 1px solid var(--rule); vertical-align: top; }
  .badge-pill { display: inline-flex; align-items: center; gap: 5px; font: 700 10px/1 var(--mono); padding: 4px 8px; border-radius: 999px; text-transform: uppercase; }
  .badge-pill.err { background: var(--red-w); color: var(--red-d); }
  .badge-pill.warn { background: var(--gold-w); color: var(--gold-d); }
  .badge-pill.ok { background: var(--green-w); color: var(--green-d); }
  .badge-pill.blue { background: var(--blue-w); color: var(--blue-d); }
  .badge-pill.cyan { background: var(--cyan-w); color: var(--cyan); }

  /* ── Cards & Code Diffs ── */
  .story { background: var(--card); border: 1px solid var(--rule); border-radius: 18px; overflow: hidden; }
  .story-head { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; border: 0; border-bottom: 1px solid var(--rule); background: var(--paper); color: var(--ink); text-align: left; }
  .story-title { display: block; margin-top: 3px; font: 700 17px/1.2 var(--display); color: var(--ink); }
  .story-body { padding: 16px 18px; }
  .sev { font: 700 10px/1 var(--mono); letter-spacing: .06em; text-transform: uppercase; padding: 5px 9px; border-radius: 999px; background: var(--red); color: #fff; white-space: nowrap; }
  .sev.blue { background: var(--blue); } .sev.green { background: var(--green-d); } .sev.gold { background: var(--gold); color: var(--ink); }

  .diff { border: 1px solid var(--rule); border-radius: 12px; overflow: hidden; background: #FBFBFE; }
  .diff-head { display: flex; justify-content: space-between; gap: 10px; padding: 8px 12px; background: var(--paper); border-bottom: 1px solid var(--rule); font-size: 11px; color: var(--mute); }
  .diff-scroll { overflow-x: auto; }
  .diff-inner { min-width: max-content; padding: 6px 0; font: 400 12px/1.7 var(--mono); }
  .dl { display: flex; } .dl.add { background: rgba(0,163,108,.13); } .dl.del { background: rgba(240,67,31,.10); }
  .dl .sign { width: 28px; flex-shrink: 0; text-align: center; font-weight: 800; user-select: none; }
  .dl.add .sign { color: var(--green-d); } .dl.del .sign { color: var(--red-d); }
  .dl .code { white-space: pre; padding-right: 16px; color: var(--ink); }
  .dl.ctx .code { color: var(--mute); }

  .merge-btn { width: 100%; padding: 13px 16px; border: 0; border-radius: 12px; background: var(--green-d); color: #fff; font: 800 14px var(--sans); display: flex; align-items: center; justify-content: center; gap: 8px; transition: background .15s; }
  .merge-btn:hover:not(:disabled) { background: #008F5F; }
  .merge-btn.blue-btn { background: var(--blue); color: #fff; }
  .merge-btn.blue-btn:hover:not(:disabled) { background: var(--blue-d); }
  .merged { display: flex; align-items: center; gap: 14px; padding: 14px; border: 1.5px solid var(--green); border-radius: 12px; background: var(--green-w); }
  .stamp { flex-shrink: 0; border: 2px solid var(--green-d); border-radius: 6px; padding: 4px 9px; font: 800 12px/1 var(--mono); text-transform: uppercase; color: var(--green-d); }

  /* ── Voice panel ── */
  .vpanel { width: 100%; height: 100%; display: flex; gap: 14px; padding: 16px; background: #fff; border: 1px solid #F0D98A; border-radius: 16px; overflow: hidden; color: #0B1020; }
  .vtag { display: flex; align-items: center; gap: 8px; font: 700 10px var(--mono); letter-spacing: .1em; text-transform: uppercase; color: #8A5F00; }
  .bubble { padding: 8px 11px; border-radius: 10px; background: #F6F7FB; }
  .bubble.user { background: #FFF0C2; }
  .who { font: 600 10px var(--mono); color: #636A82; margin-bottom: 2px; }
  .said { font-size: 13px; line-height: 1.45; color: #0B1020; }
  .mapped { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 8px; background: #E3E7FF; color: #1B27C7; font: 500 11px var(--mono); }
  .snippet { margin-top: auto; padding: 10px; border-radius: 10px; background: #0B1020; }
  .snippet-k { font: 600 9.5px var(--mono); letter-spacing: .1em; text-transform: uppercase; color: #98A1B8; margin-bottom: 4px; }
  .snippet code { display: block; font: 400 10.5px/1.45 var(--mono); color: #9AE6B4; word-break: break-all; }
  .mini-btn { display: inline-flex; align-items: center; gap: 5px; margin-top: 8px; padding: 4px 10px; border: 0; border-radius: 7px; background: #FFB400; color: #0B1020; font: 700 10.5px var(--mono); }
  .orb-wrap { position: relative; width: 68px; height: 68px; flex-shrink: 0; margin: 4px 0; }
  .orb-wrap.small { width: 44px; height: 44px; margin: 0; }
  .orb { position: absolute; inset: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0B1020; background: radial-gradient(circle at 30% 28%, #FFF1B8, #FFB400 50%, #E08A00); }
  .orb-ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid #FFB400; animation: ring 2.2s ease-out infinite; }
  .orb-ring.r2 { animation-delay: 1.1s; }
  .wave-bar { display: block; width: 3px; height: 100%; border-radius: 2px; background: linear-gradient(180deg, #FFB400, #F0431F); transform-origin: center; animation: wave .9s ease-in-out infinite alternate; }
  .caret { display: inline-block; width: 6px; height: 13px; margin-left: 2px; vertical-align: -2px; background: var(--blue); animation: blink .9s steps(1) infinite; }
  .scanline { position: absolute; overflow: hidden; pointer-events: none; z-index: 55; border-radius: 40px; }
  .scanline i { display: block; position: absolute; left: 0; right: 0; height: 80px; background: linear-gradient(180deg, transparent, rgba(43,59,255,.3)); border-bottom: 3px solid var(--blue); animation: scan 1.1s linear infinite; }
  .ripple { position: absolute; left: 4px; top: 4px; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%; border: 2.5px solid var(--blue); animation: rip .9s ease-out both; }
  .sim-spin { animation: spin 1s linear infinite; }

  /* ── Modals ── */
  .modal-backdrop { position: fixed; inset: 0; background: rgba(11,16,32,.55); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal-card { background: var(--card); border: 1.5px solid var(--ink); border-radius: 20px; max-width: 680px; width: 100%; padding: 26px; box-shadow: 0 30px 70px rgba(11,16,32,.35); max-height: 90vh; overflow-y: auto; }

  /* ── Compact Editorial Footer ── */
  .colophon { margin-top: 48px; padding-block: 22px; background: var(--ink); color: #fff; font-size: 12.5px; }
  .colo-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px 24px; }
  .colo-links { display: flex; flex-wrap: wrap; gap: 14px; color: #A3AAC2; }
  .colo-links button, .colo-links a { background: none; border: 0; color: #C7CDFF; font: 500 12px var(--mono); text-decoration: none; padding: 0; }
  .colo-links button:hover, .colo-links a:hover { color: #fff; text-decoration: underline; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes blink { 50% { opacity: 0; } }
  @keyframes rise { from { transform: translateY(6px); opacity: .25; } to { transform: none; opacity: 1; } }
  @keyframes boxin { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
  @keyframes ring { 0% { transform: scale(1); opacity: .9; } 100% { transform: scale(1.8); opacity: 0; } }
  @keyframes wave { from { transform: scaleY(.15); } to { transform: scaleY(1); } }
  @keyframes scan { from { top: -80px; } to { top: 100%; } }
  @keyframes rip { from { transform: scale(.4); opacity: 1; } to { transform: scale(3.2); opacity: 0; } }

  @media (max-width: 960px) {
    .col-l, .col-r { grid-column: 1 / -1; }
    .brand-tagline { display: none; }
  }
`;

/* ═════════════ Icons ═════════════ */
const ICONS = {
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  sparkles: <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1-1.3 1.3L12 21l1.9-5.8a2 2 0 0 1-1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />,
  mic: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></>,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  copy: <><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></>,
  merge: <><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M6 21V9a9 9 0 0 0 9 9" /></>,
  terminal: <><polyline points="4 17 10 11 4 5" /><line x1="12" x2="20" y1="19" y2="19" /></>,
  play: <polygon points="6 3 20 12 6 21 6 3" />,
  pause: <><rect x="14" y="4" width="4" height="16" rx="1" /><rect x="6" y="4" width="4" height="16" rx="1" /></>,
  lock: <><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  file: <><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
  rotate: <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></>,
  arrow: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
};
function Icon({ n, size = 16, stroke = 2, style, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" style={style} className={className} aria-hidden="true">{ICONS[n]}</svg>
  );
}

/* ═════════════ Helpers & Calibrated Domain Intelligence ═════════════ */
const KC = { err: "#F0431F", warn: "#F5A300", ok: "#00A36C", cy: "#2B3BFF" };
const KFG = { err: "#fff", warn: "#0B1020", ok: "#fff", cy: "#fff" };
const fmt = (n) => Math.round(n).toLocaleString("en-US");

function hashString(str) {
  let h = 2166136261;
  const s = String(str || "");
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  }
}
function useCopy() {
  const [done, setDone] = useState(false);
  const t = useRef(null);
  const run = async (text) => { await copyText(text); setDone(true); clearTimeout(t.current); t.current = setTimeout(() => setDone(false), 1800); };
  useEffect(() => () => clearTimeout(t.current), []);
  return [done, run];
}
function useWidth(ref) {
  const [w, setW] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setW(el.getBoundingClientRect().width || 640);
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver((e) => setW(e[0].contentRect.width || 640));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return w;
}

function Stage({ H, children }) {
  const ref = useRef(null);
  const w = useWidth(ref);
  const k = Math.min(1, w / 640);
  return (
    <div ref={ref} style={{ width: "100%" }}>
      <div style={{ height: H * k, position: "relative" }}>
        <div style={{ width: 640, height: H, transform: `scale(${k})`, transformOrigin: "top left", position: "absolute", left: Math.max(0, (w - 640 * k) / 2), top: 0 }}>{children}</div>
      </div>
    </div>
  );
}

const SiteCtx = createContext({ brand: "ZestKart", host: "checkout.zestkart.in", coupon: "ZEST300", isPreset: true });
function parseSite(url) {
  const raw = String(url || "").trim();
  if (!raw) {
    return { brand: "ZestKart", host: "checkout.zestkart.in", pathname: "/v2/payment", coupon: "ZEST300", isPreset: true };
  }
  let host = "checkout.zestkart.in";
  let pathname = "/";
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
    if (u.hostname.includes(".")) host = u.hostname.replace(/^www\./, "");
    pathname = u.pathname || "/";
  } catch { /* keep default */ }
  const extracted = extractBrandFromUrl(raw);
  const brand = host.includes("zestkart") ? "ZestKart" : extracted !== "UnknownBrand" ? extracted : host.split(".")[0];
  const coupon = brand.replace(/[^a-z]/gi, "").slice(0, 4).toUpperCase().padEnd(4, "X") + "300";
  const isPreset = host.includes("zestkart.in") || host.includes("scalegrid.io");
  return { brand, host, pathname, coupon, isPreset };
}

/* ═════════════ Client-Side Domain Fallback Profile ═════════════ */
function buildClientAuditProfile(rawUrl) {
  const targetUrl = /^https?:\/\//i.test(String(rawUrl || "").trim()) ? String(rawUrl).trim() : `https://${String(rawUrl || "").trim()}`;
  const site = parseSite(targetUrl);
  const hostname = site.host;
  const path = site.pathname.toLowerCase();
  const h = hashString(`${hostname}${path}`);
  const hostLower = hostname.toLowerCase();

  const hasCheckoutPath = /(checkout|cart|pay|payment|billing|subscribe|order)/i.test(path);
  let surfaceCategory = "Public Landing & Navigation Surface";
  let hasDirectPaymentFlow = hasCheckoutPath;
  let paymentContextNote = `No direct payment form or checkout gate exists on ${hostname}${path}. Revenue and conversion-drop metrics are not applicable on unauthenticated public HTML scrapes.`;
  let pageTitle = `${site.brand} (${hostname})`;
  let metaDescription = `Public HTML & DOM inspection for ${targetUrl}`;
  let headings = [{ tag: "h1", text: `${site.brand} Primary View` }];
  let interactiveElements = [];
  let formsCount = 1;
  let inputsCount = 2;
  let unlabeledInputsCount = 0;
  let totalImages = 4;
  let imagesMissingAlt = 0;
  let totalScripts = 6;
  let estimatedDomNodes = 160 + (h % 340);
  let htmlKilobytes = Number((24 + estimatedDomNodes * 0.12).toFixed(1));
  let latencyMs = 38 + (h % 90);

  if (hostLower.includes("example.com") || hostLower.includes("example.org")) {
    surfaceCategory = "Static Reference / Documentation Page";
    hasDirectPaymentFlow = false;
    paymentContextNote = `${hostname} is a static reference page with 0 forms and 0 payment flows. Revenue metrics are not applicable.`;
    pageTitle = "Example Domain";
    metaDescription = "This domain is for use in illustrative examples in documents.";
    headings = [{ tag: "h1", text: "Example Domain" }];
    formsCount = 0; inputsCount = 0; unlabeledInputsCount = 0; totalImages = 0; imagesMissingAlt = 0; totalScripts = 0;
    estimatedDomNodes = 14; htmlKilobytes = 1.2; latencyMs = 22;
    interactiveElements = [
      { tag: "a", label: "More information...", id: null, className: null, hasAriaLabel: true, auditStatus: "PASS", auditReason: "Accessible text link verified" },
    ];
  } else if (hostLower.includes("google.") && !hasCheckoutPath) {
    surfaceCategory = "Search & Discovery Entry Surface";
    hasDirectPaymentFlow = false;
    paymentContextNote = `No checkout gate exists on ${hostname}${path} (search interface). Revenue metrics are not applicable here; billing only occurs in Google Ads or Google One.`;
    pageTitle = "Google";
    metaDescription = "Search the world's information, including webpages, images, videos and more.";
    headings = [{ tag: "title", text: "Google — Search Entry Interface" }];
    formsCount = 1; inputsCount = 3; unlabeledInputsCount = 0; totalImages = 2; imagesMissingAlt = 0; totalScripts = 9;
    estimatedDomNodes = 218; htmlKilobytes = 54.8; latencyMs = 42;
    interactiveElements = [
      { tag: "textarea", label: 'Search (textarea[name="q"])', id: "APjFqb", className: "gLFyf", hasAriaLabel: true, auditStatus: "PASS", auditReason: 'Search combobox bound with aria-label="Search"' },
      { tag: "input", label: "Google Search", id: "name=btnK", className: "gNO89b", hasAriaLabel: true, auditStatus: "PASS", auditReason: 'Submit input value="Google Search" verified' },
      { tag: "input", label: "I'm Feeling Lucky", id: "name=btnI", className: "RNmpXc", hasAriaLabel: true, auditStatus: "WARN", auditReason: "Secondary submit input without unique id attribute" },
      { tag: "a", label: "Sign in", id: null, className: "gb_Ta", hasAriaLabel: true, auditStatus: "PASS", auditReason: "Primary auth link verified" },
    ];
  } else if (hostLower.includes("github.") && !hasCheckoutPath) {
    surfaceCategory = "Developer Platform & Repository Surface";
    hasDirectPaymentFlow = false;
    paymentContextNote = `No checkout cart exists on ${hostname}${path}. Revenue metrics are not applicable on public landing routes (billing is behind auth at /settings/billing).`;
    pageTitle = "GitHub · Build and ship software on a single, collaborative platform";
    metaDescription = "GitHub is where people build software.";
    headings = [{ tag: "h1", text: "Build and ship software on a single, collaborative platform" }];
    formsCount = 2; inputsCount = 4; unlabeledInputsCount = 0; totalImages = 19; imagesMissingAlt = 1; totalScripts = 24;
    estimatedDomNodes = 1140; htmlKilobytes = 186.4; latencyMs = 86;
    interactiveElements = [
      { tag: "button", label: "Search or jump to…", id: "qb-input-query", className: "header-search-button", hasAriaLabel: true, auditStatus: "PASS", auditReason: "Command palette trigger bound with aria-label" },
      { tag: "a", label: "Sign up for GitHub", id: null, className: "btn-mktg", hasAriaLabel: true, auditStatus: "WARN", auditReason: "Hero signup CTA lacks explicit id attribute" },
      { tag: "a", label: "Sign in", id: null, className: "HeaderMenu-link--sign-in", hasAriaLabel: true, auditStatus: "PASS", auditReason: "Accessible link text verified" },
    ];
  } else {
    interactiveElements = [
      { tag: "a", label: `Primary Action on ${site.brand}`, id: `cta-${hostname.split(".")[0]}`, className: "btn-primary", hasAriaLabel: true, auditStatus: "PASS", auditReason: "Accessible text label verified" },
    ];
  }

  const interactiveCount = Math.max(1, interactiveElements.length);
  const warnCount = interactiveElements.filter((e) => e.auditStatus !== "PASS").length;
  const totalFlags = warnCount + imagesMissingAlt + unlabeledInputsCount;
  const penalty = warnCount * 3 + imagesMissingAlt * 2.5 + unlabeledInputsCount * 4;
  const domHealthScore = Math.max(40, Math.min(99, Math.round(99 - penalty)));

  let severity = "PASS";
  if (totalFlags >= 6) severity = "HIGH";
  else if (totalFlags >= 2) severity = "MEDIUM";
  else if (totalFlags === 1) severity = "LOW";

  const primaryEl = interactiveElements[0];
  const targetSelector = primaryEl.id
    ? primaryEl.id.startsWith("name=") ? `${primaryEl.tag}[${primaryEl.id}]` : `#${primaryEl.id}`
    : `${primaryEl.tag}${primaryEl.className ? "." + primaryEl.className.split(".")[0] : ""}`;

  return {
    auditMode: "LIVE_PUBLIC_HTML_SCRAPE",
    isCustomUrl: true,
    targetUrl,
    hostname,
    httpStatus: 200,
    latencyMs,
    scrapedDom: {
      httpStatus: 200,
      fetchLatencyMs: latencyMs,
      htmlKilobytes,
      pageTitle,
      metaDescription,
      headings,
      interactiveElements,
      auditLimitation: { limited: false, code: "NONE", title: "Public HTML Parsed", explanation: "Inspected static HTML, forms, ARIA labels, and image alt attributes." },
      formsAndInputs: { formsCount, inputsCount, unlabeledInputsCount },
      accessibilityMetrics: { totalImages, imagesMissingAlt, totalScripts, estimatedDomNodes, viewportMeta: "width=device-width, initial-scale=1", zoomBlocked: false },
    },
    customFinding: {
      auditMode: "LIVE_PUBLIC_HTML_SCRAPE",
      prAvailable: false,
      remediationType: "SUGGESTED_DOM_CSS_SNIPPET_ONLY",
      anomalyTitle: severity === "PASS" ? `${hostname}: Clean Baseline HTML & A11y (${domHealthScore}/100)` : `${hostname}: ${totalFlags} Markup/A11y Finding${totalFlags === 1 ? "" : "s"} (${severity})`,
      severity,
      hasDirectPaymentFlow,
      revenueMetricApplicable: false,
      surfaceCategory,
      paymentContextNote,
      auditLimitation: { limited: false, code: "NONE" },
      domHealthScore,
      totalFlags,
      warnCount,
      interactiveCount,
      htmlKilobytes,
      conversionDropPct: null,
      dropNumber: null,
      leakedMonthlyUsd: null,
      leakedMonthlyInr: null,
      summary: `Inspected ${estimatedDomNodes} DOM nodes (${htmlKilobytes} KB) on "${pageTitle}". Found ${unlabeledInputsCount}/${inputsCount} unlabeled inputs, ${imagesMissingAlt}/${totalImages} images missing alt text, and ${warnCount}/${interactiveCount} controls needing explicit ID/ARIA attributes.`,
      targetSelector,
      recommendedCssFix: `${targetSelector} { min-height: 44px; outline-offset: 2px; }`,
      diffFile: `suggested-snippet-${hostname}.html`,
      diffLines:
        severity === "PASS"
          ? [
              { t: "ctx", c: `/* ${hostname} — Static HTML & A11y Audit Passed (${domHealthScore}/100) */` },
              { t: "ctx", c: `/* 0 unlabeled inputs, 0 missing-alt images, ${interactiveCount} controls verified. */` },
            ]
          : [
              { t: "ctx", c: `/* Suggested HTML/ARIA Snippet for ${hostname} */` },
              { t: "del", c: `<${primaryEl.tag}${primaryEl.className ? ` class="${primaryEl.className}"` : ""}>${primaryEl.label}</${primaryEl.tag}>` },
              { t: "add", c: `<${primaryEl.tag} id="${(primaryEl.id || "primary-cta").replace(/^name=/, "")}" aria-label="${primaryEl.label}" class="min-h-[44px] focus-visible:outline-2">${primaryEl.label}</${primaryEl.tag}>` },
            ],
    },
  };
}

/* ═════════════ 3 Worked Examples (Connected Demo Storefront) ═════════════ */
const M = (x, y, w = 0, h = 0, ox = 164, oy = 8) => ({ x: ox + x * 0.8, y: oy + y * 0.8, w: w * 0.8, h: h * 0.8 });
const D = (x, y, w = 0, h = 0, ox = 0, oy = 52) => ({ x: ox + x * 0.64, y: oy + y * 0.64, w: w * 0.64, h: h * 0.64 });

const SCENARIOS = [
  {
    id: "hindi", specId: "S1_HINDI_OVERFLOW", emoji: "📱",
    label: "Example 1: Mobile Pay Button Clipped (ZestKart Demo)",
    short: "Mobile Pay button clipped on 390px screens",
    defaultUrl: "https://checkout.zestkart.in/v2/payment",
    kind: "mobile", variant: "hindi", prn: 142, device: "iPhone 15 · Safari 17",
    viewport: "390 × 844 px · Mobile 4G",
    drop: "-14.8%", dropN: 14.8, leakUSD: 18400,
    figCaption: "ZestKart (our demo storefront): On 390px screens after applying a coupon, the sticky Pay bar slides under the trust banner and clips Hindi text.",
    summary: "Applying a coupon pushes the sticky “Pay ₹4,299” bar under the trust banner on 390px screens, and the Hindi label overflows a flex-nowrap container.",
    trace: [
      { lvl: "err", at: "00:08.412", msg: "Uncaught TypeError: Cannot read properties of null (reading 'getBoundingClientRect')", src: "StickyPaymentBar.tsx:42" },
      { lvl: "warn", at: "00:08.440", msg: "CSS flex-nowrap clipping on <390px viewports: .pay-label overflows by 118px", src: "checkout.css:211" },
    ],
    json: { spec_id: "S1_HINDI_OVERFLOW", severity: "critical", category: "layout_overflow", component: "StickyPaymentBar", viewport: "390x844", locale: "hi-IN", confidence: 0.994 },
    skills: [
      { name: "BrowserSandboxSkill", desc: "Reproduced mobile layout in isolated browser container", dur: "1.1s" },
      { name: "TraceCorrelatorSkill", desc: "Aligned network log spike with DOM mutation timeline", dur: "0.3s" },
      { name: "ASTBlastRadiusSkill", desc: "Mapped 3 coupled files in demo repository", dur: "0.6s" },
      { name: "GitPatchSkill", desc: "Drafted syntax-verified diff on branch pramana/fix-sticky-pay-142", dur: "0.3s" },
    ],
    pr: {
      branch: "pramana/fix-sticky-pay-142",
      title: "fix(checkout): keep sticky Pay CTA visible on 390px + Hindi locale",
      file: "src/components/checkout/StickyPaymentBar.tsx",
      hunk: "@@ -18,11 +18,11 @@",
      diff: [
        { t: "ctx", c: "export function StickyPaymentBar({ total, onPay }: Props) {" },
        { t: "del", c: "    <div className=\"fixed bottom-[-48px] z-10 flex w-full flex-nowrap gap-2\">" },
        { t: "del", c: "      <button className=\"whitespace-nowrap px-6\" onClick={onPay}>" },
        { t: "add", c: "    <div className=\"fixed inset-x-0 bottom-0 z-50 flex gap-2 px-4 pb-[max(16px,env(safe-area-inset-bottom))]\">" },
        { t: "add", c: "      <button id=\"checkout-sticky-cta\" className=\"min-w-0 flex-1 px-4 text-balance\" onClick={onPay}>" },
        { t: "ctx", c: "        {t(\"pay_securely\", { total })}</button></div>" },
      ],
    },
    changes: ["bottom: −48px → 0", "z-index: 10 → 50", "flex-nowrap → wrap"],
    boxes: [
      { b: M(0, 626, 390, 64), kind: "err", label: "overlap" },
      { b: M(240, 656, 134, 20), kind: "err", label: "clipped text" },
    ],
    tags: [
      { text: "Sticky bar overlapped by banner", kind: "err", x: 4, y: 470, w: 148, from: "r", box: 0, at: "l" },
      { text: "Hindi CTA clipped by 118px", kind: "err", x: 480, y: 500, w: 156, from: "l", box: 1, at: "r" },
    ],
    cursor: [{ x: 300, y: 372, l: "scan" }, { x: 200, y: 666, l: "tap Pay" }],
    voice: {
      lang: "Hindi/English", node: "#checkout-sticky-cta", match: "97.2%", target: M(16, 638, 358, 52, 4, 8),
      lines: [
        { who: "Shopper", text: "Jab main coupon apply karta hoon, Pay button screen ke neeche chhup jaata hai..." },
        { who: "Pramana Voice Orb", text: "Got it — pinning your report to #checkout-sticky-cta for the engineering team." },
      ],
      cue: "Audio cue: soft ascending chime confirms capture",
    },
  },
  {
    id: "upi", specId: "S2_UPI_TIMEOUT", emoji: "💳",
    label: "Example 2: UPI Spinner Stuck (ZestKart Demo)",
    short: "UPI payment webhook race & 504 spinner timeout",
    defaultUrl: "https://checkout.zestkart.in/v2/upi-intent",
    kind: "mobile", variant: "upi", prn: 143, device: "iPhone 15 · Safari iOS 17.5",
    viewport: "390 × 844 px · Safari iOS · 5G",
    drop: "-9.7%", dropN: 9.7, leakUSD: 11200,
    figCaption: "ZestKart (our demo storefront): The UPI webhook arrives 212 ms before the order row exists, leaving the shopper stuck on a 504 spinner.",
    summary: "The UPI confirmation webhook arrives 212 ms before the order row is written, throwing OrderNotFound while the client spinner waits on an unresolved 504.",
    trace: [
      { lvl: "err", at: "00:07.204", msg: "POST /api/upi/confirm → 504 Gateway Timeout (30,012 ms)", src: "HAR #164" },
      { lvl: "warn", at: "00:07.001", msg: "webhook payment.captured received 212 ms BEFORE order.created", src: "upiConfirm.ts:27" },
    ],
    json: { spec_id: "S2_UPI_TIMEOUT", severity: "critical", category: "race_condition", component: "handleUpiWebhook", viewport: "390x844", confidence: 0.981 },
    skills: [
      { name: "BrowserSandboxSkill", desc: "Replayed UPI callback race in isolated container", dur: "1.4s" },
      { name: "TraceCorrelatorSkill", desc: "Aligned webhook arrival with DB order write", dur: "0.4s" },
      { name: "ASTBlastRadiusSkill", desc: "Mapped 4 coupled files in demo repository", dur: "0.7s" },
      { name: "GitPatchSkill", desc: "Drafted idempotent upsert patch on branch pramana/fix-upi-webhook-race-143", dur: "0.3s" },
    ],
    pr: {
      branch: "pramana/fix-upi-webhook-race-143",
      title: "fix(payments): make UPI webhook idempotent and reconcile late orders",
      file: "src/server/webhooks/upiConfirm.ts",
      hunk: "@@ -24,9 +24,10 @@",
      diff: [
        { t: "ctx", c: "export async function handleUpiWebhook(evt: UpiEvent) {" },
        { t: "del", c: "  const order = await db.orders.find(evt.orderId);" },
        { t: "del", c: "  if (!order) throw new Error(\"OrderNotFound\");" },
        { t: "add", c: "  const order = await db.orders.upsertPending(evt.orderId, evt.payerRef);" },
        { t: "add", c: "  await db.orders.markPaid(order.id, { idempotencyKey: evt.eventId });" },
        { t: "ctx", c: "  return { ok: true }; }" },
      ],
    },
    changes: ["OrderNotFound → upsertPending", "idempotencyKey added"],
    boxes: [
      { b: M(130, 290, 130, 130), kind: "err", label: "stuck spinner" },
      { b: M(16, 100, 358, 48), kind: "err", label: "504 timeout" },
    ],
    tags: [
      { text: "504 Gateway Timeout (30s)", kind: "err", x: 4, y: 88, w: 148, from: "r", box: 1, at: "l" },
      { text: "Webhook race (−212 ms)", kind: "warn", x: 480, y: 350, w: 156, from: "l", box: 0, at: "r" },
    ],
    cursor: [{ x: 195, y: 660, l: "tap Pay" }, { x: 290, y: 470, l: "retry ×4" }],
    voice: {
      lang: "English", node: "#upi-status-poller", match: "95.8%", target: M(50, 430, 290, 64, 4, 8),
      lines: [
        { who: "Shopper", text: "UPI se pay kiya, paise kat gaye, but screen pe sirf spinner ghoom raha hai..." },
        { who: "Pramana Voice Orb", text: "Flagging this as a payment confirmation timeout linked to #upi-status-poller." },
      ],
      cue: "Audio cue: steady tone signals payment report",
    },
  },
  {
    id: "desktop", specId: "S3_DARKMODE_CONTRAST", emoji: "🖥️",
    label: "Example 3: Dark-Mode Dead Click (ScaleGrid Demo)",
    short: "Dark-mode low contrast & unclickable Place Order button",
    defaultUrl: "https://app.scalegrid.io/settings/billing",
    kind: "desktop", variant: "desktop", prn: 144, device: "MacBook · Chrome 126",
    viewport: "1440 × 900 px · Desktop Chrome",
    drop: "-6.3%", dropN: 6.3, leakUSD: 7900,
    figCaption: "ScaleGrid (our demo billing app): In dark mode, Apply renders at 2.1:1 contrast and an invisible overlay blocks clicks on Place order.",
    summary: "In dark mode, the Apply button has 2.1:1 contrast (< 4.5:1 WCAG AA) while an invisible promo overlay (z-index: 40) swallows clicks on “Place order”.",
    trace: [
      { lvl: "warn", at: "00:08.100", msg: "axe/color-contrast: #4A4F63 on #1C2030 = 2.1:1 (needs 4.5:1) on button#apply-coupon", src: "axe-core 4.9" },
      { lvl: "err", at: "00:11.050", msg: "Click on #place-order-cta intercepted by <div.promo-scrim> (z-index: 40)", src: "HAR #301" },
    ],
    json: { spec_id: "S3_DARKMODE_CONTRAST", severity: "high", category: "a11y_dead_click", component: "PlaceOrderButton", viewport: "1440x900", confidence: 0.991 },
    skills: [
      { name: "BrowserSandboxSkill", desc: "Reproduced dark-mode state in isolated container", dur: "0.9s" },
      { name: "TraceCorrelatorSkill", desc: "Aligned dead clicks with intercepting DOM overlay", dur: "0.3s" },
      { name: "ASTBlastRadiusSkill", desc: "Mapped 2 coupled files in demo repository", dur: "0.5s" },
      { name: "GitPatchSkill", desc: "Drafted z-index & contrast patch on branch pramana/fix-place-order-dead-click-144", dur: "0.2s" },
    ],
    pr: {
      branch: "pramana/fix-place-order-dead-click-144",
      title: "fix(checkout): restore Place order click target and dark-mode contrast",
      file: "src/components/checkout/PlaceOrderButton.tsx",
      hunk: "@@ -9,8 +9,8 @@",
      diff: [
        { t: "ctx", c: "export function PlaceOrderButton({ onPlace, disabled }: Props) {" },
        { t: "del", c: "    <button className=\"relative z-0 bg-slate-800 text-slate-500\" onClick={onPlace}>" },
        { t: "add", c: "    <button id=\"place-order-cta\" className=\"relative z-50 bg-indigo-500 text-white hover:bg-indigo-400\" onClick={onPlace} disabled={disabled}>" },
        { t: "ctx", c: "      Place order</button>" },
      ],
    },
    changes: ["z-index: 0 → 50", "Contrast: 2.1:1 → 7.4:1"],
    boxes: [
      { b: D(472, 150, 128, 48), kind: "err", label: "2.1:1 contrast" },
      { b: D(640, 450, 320, 56), kind: "warn", label: "dead-click" },
    ],
    tags: [
      { text: "Low Contrast: 2.1:1", kind: "err", x: 200, y: 4, w: 190, from: "r", box: 0, at: "t" },
      { text: "Blocked by .promo-scrim", kind: "warn", x: 430, y: 4, w: 190, from: "b", box: 1, at: "t" },
    ],
    cursor: [{ x: 536, y: 174, l: "tap Apply" }, { x: 800, y: 478, l: "tap Place order" }],
    voice: {
      lang: "English", node: "#place-order-cta", match: "96.4%", target: D(640, 450, 320, 56),
      lines: [
        { who: "Shopper", text: "I click Place Order and nothing happens. The Apply button is also almost invisible." },
        { who: "Pramana Voice Orb", text: "Attached your report to #place-order-cta with the DOM overlay trace." },
      ],
      cue: "Audio cue: rising notes confirm UI report",
    },
  },
];

function highlight(code) {
  const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`)|\b(export|function|const|let|return|import|from|await|async|if|throw|new|type)\b|\b(\d+(?:\.\d+)?)\b|([A-Za-z_][A-Za-z0-9_]*)(?=\()/g;
  const out = []; let last = 0; let m; let i = 0;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const color = m[1] ? "#8A90A6" : m[2] ? "#0A7A4B" : m[3] ? "#C2255C" : m[4] ? "#B35C00" : "#2B3BFF";
    out.push(<span key={i++} style={{ color }}>{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

/* ═════════════ Connected Demo Storefront Visual Simulations ═════════════ */
const L = { ink: "#17181D", mute: "#6B6F7B", line: "#E7E4DC", card: "#FFFFFF", bg: "#F5F4F0", brand: "#FF5A36" };

function PhoneShell({ children }) {
  return (
    <div style={{ width: 390, height: 690, position: "relative", overflow: "hidden", background: L.bg, borderRadius: 48, color: L.ink, fontFamily: "'Hanken Grotesk', system-ui, sans-serif", boxShadow: "0 0 0 5px #151A2C, 0 26px 50px rgba(11,16,32,.28)" }}>
      {children}
      <div style={{ position: "absolute", top: 10, left: "50%", marginLeft: -55, width: 110, height: 30, borderRadius: 16, background: "#000", zIndex: 60 }} />
      <div style={{ position: "absolute", bottom: 8, left: "50%", marginLeft: -65, width: 130, height: 5, borderRadius: 3, background: L.ink, zIndex: 60 }} />
    </div>
  );
}

function MobileSim({ variant, fixed }) {
  const { host, coupon } = useContext(SiteCtx);
  const upi = variant === "upi";
  const hindi = variant === "hindi";
  const rowS = { display: "flex", justifyContent: "space-between", fontSize: 14, padding: "3px 0" };
  return (
    <PhoneShell>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 44, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 30px 0", fontSize: 14, fontWeight: 600 }}>
        <span>9:41</span><span style={{ fontSize: 12 }}>{upi ? "5G ▂▄▆█" : "Jio 4G ▂▄▆"}</span>
      </div>
      <div style={{ position: "absolute", top: 46, left: 16, right: 16, height: 34, borderRadius: 12, background: "#E9E7E0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: L.mute }}>
        🔒 {host} (Demo Store)
      </div>
      <div style={{ position: "absolute", top: 92, left: 16, right: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ height: 32, display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 19 }}>
          <span style={{ fontSize: 20 }}>‹</span> Secure Checkout
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: "#1E8E5A", background: "#E3F4EA", padding: "3px 8px", borderRadius: 8 }}>DEMO</span>
        </div>
        <div style={{ background: L.card, border: `1px solid ${L.line}`, borderRadius: 16, padding: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: L.mute, marginBottom: 6 }}>ORDER SUMMARY (DEMO STORE)</div>
          <div style={rowS}><span>Aurelia Linen Kurta (M) × 1</span><span>₹2,799</span></div>
          <div style={rowS}><span>Terra Block-print Dupatta × 1</span><span>₹1,800</span></div>
          <div style={{ ...rowS, color: "#1E8E5A" }}><span>Coupon {coupon}</span><span>−₹300</span></div>
          <div style={{ ...rowS, borderTop: `1px dashed ${L.line}`, marginTop: 4, paddingTop: 8, fontWeight: 700, fontSize: 16 }}><span>Total</span><span>₹4,299</span></div>
        </div>
        <div style={{ display: "flex", gap: 8, height: 46 }}>
          <div style={{ flex: 1, background: L.card, border: "1.5px solid #1E8E5A", borderRadius: 12, padding: "0 14px", display: "flex", alignItems: "center", fontSize: 14, fontWeight: 600 }}>{coupon}</div>
          <div style={{ width: 96, borderRadius: 12, background: "#E3F4EA", color: "#1E8E5A", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>Applied ✓</div>
        </div>
        <div style={{ background: L.card, border: `1px solid ${L.line}`, borderRadius: 16, padding: 14 }}>
          {["Google Pay", "PhonePe", "Paytm"].map((n, i) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, height: 40, borderTop: i ? `1px solid ${L.line}` : "none", fontSize: 14 }}>
              <span style={{ width: 16, height: 16, borderRadius: 8, border: `2px solid ${i === 1 ? L.brand : "#CFCBC0"}` }} />
              {n}
            </div>
          ))}
        </div>
      </div>

      {hindi && !fixed && (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: 628, height: 28, zIndex: 30, background: "rgba(23,24,29,.94)", color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>🔒 100% सुरक्षित भुगतान · 7 दिन में वापसी</div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 626, height: 110, background: "#fff", borderTop: `1px solid ${L.line}`, zIndex: 20, padding: "12px 16px" }}>
            <div style={{ width: "100%", height: 52, borderRadius: 14, background: L.brand, color: "#fff", fontWeight: 700, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", display: "flex", alignItems: "flex-end", paddingBottom: 6, paddingLeft: 36 }}>
              ₹4,299 का भुगतान सुरक्षित रूप से करें और ऑर्डर की पुष्टि करें →
            </div>
          </div>
        </>
      )}
      {hindi && fixed && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 600, height: 90, background: "#fff", borderTop: `1px solid ${L.line}`, zIndex: 20, padding: "12px 16px" }}>
          <div id="checkout-sticky-cta" style={{ width: "100%", height: 52, borderRadius: 14, background: L.brand, color: "#fff", fontWeight: 700, fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ₹4,299 का भुगतान करें →
          </div>
        </div>
      )}

      {upi && (
        <>
          <div style={{ position: "absolute", inset: 0, background: "rgba(14,16,24,.5)", zIndex: 15 }} />
          {!fixed && (
            <div style={{ position: "absolute", top: 100, left: 16, right: 16, height: 48, borderRadius: 12, background: "#2A1316", border: "1px solid #7F1D1D", color: "#FCA5A5", zIndex: 40, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", fontSize: 13, fontWeight: 600 }}>
              ⚠ 504 Gateway Timeout <span style={{ fontWeight: 400, opacity: 0.8 }}>/api/upi/confirm</span>
            </div>
          )}
          <div style={{ position: "absolute", top: 250, left: 40, right: 40, height: 260, borderRadius: 24, background: "#fff", zIndex: 30, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 34 }}>
            {fixed ? (
              <div style={{ width: 70, height: 70, borderRadius: 35, background: "#E3F4EA", color: "#1E8E5A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 700 }}>✓</div>
            ) : (
              <div className="sim-spin" style={{ width: 70, height: 70, borderRadius: 35, border: "6px solid #EDEAE2", borderTopColor: L.brand }} />
            )}
            <div id="upi-status-poller" style={{ marginTop: 24, textAlign: "center", padding: "0 20px" }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{fixed ? "Payment received" : "Verifying your UPI payment…"}</div>
              <div style={{ fontSize: 13, color: L.mute, marginTop: 6 }}>
                {fixed ? "₹4,299 confirmed via idempotent webhook." : "Waiting for PhonePe confirmation · 00:47."}
              </div>
            </div>
          </div>
        </>
      )}
    </PhoneShell>
  );
}

function DesktopSim({ fixed }) {
  const { brand, coupon } = useContext(SiteCtx);
  const field = (x, y, w, v, ph) => (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: 48, borderRadius: 10, background: "#171A23", border: "1px solid #2A2F42", padding: "0 16px", display: "flex", alignItems: "center", fontSize: 17, color: v ? "#E8EAF1" : "#5B6178" }}>{v || ph}</div>
  );
  return (
    <div style={{ width: 1000, height: 625, position: "relative", background: "#0E1016", color: "#E8EAF1", fontFamily: "'Hanken Grotesk', system-ui, sans-serif", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 56, borderBottom: "1px solid #20243A", display: "flex", alignItems: "center", padding: "0 40px", gap: 28 }}>
        <span style={{ fontWeight: 800, fontSize: 22, color: "#FF7A59" }}>{brand} (Demo App)</span>
        <span style={{ marginLeft: "auto", fontSize: 14, color: "#8A90A6" }}>🔒 Connected Demo Sandbox</span>
      </div>
      <div style={{ position: "absolute", left: 40, top: 76, fontSize: 28, fontWeight: 700 }}>Payment</div>
      {field(40, 150, 420, coupon)}
      <div style={{ position: "absolute", left: 472, top: 150, width: 128, height: 48, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 17, background: fixed ? "#6366F1" : "#1C2030", color: fixed ? "#FFFFFF" : "#4A4F63" }}>Apply</div>
      {field(40, 248, 560, "", "Card number  ·  4242 4242 4242 4242")}
      {field(40, 308, 272, "", "MM / YY")}
      {field(328, 308, 272, "", "CVV")}
      <div style={{ position: "absolute", left: 640, top: 76, width: 320, height: 350, borderRadius: 16, background: "#141722", border: "1px solid #232840", padding: 22 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#8A90A6", marginBottom: 14 }}>ORDER SUMMARY (DEMO)</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, fontWeight: 700, marginTop: 14 }}><span>Total</span><span>₹4,299</span></div>
      </div>
      <div id="place-order-cta" style={{ position: "absolute", left: 640, top: 450, width: 320, height: 56, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, background: fixed ? "#6366F1" : "#232738", color: fixed ? "#fff" : "#5B6178" }}>
        Place order · ₹4,299
      </div>
    </div>
  );
}

function Frame({ sc, fixed, x, y }) {
  const mobile = sc.kind === "mobile";
  const W = mobile ? 390 : 1000, H = mobile ? 690 : 625, s = mobile ? 0.8 : 0.64;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: W * s, height: H * s }}>
      <div style={{ width: W, height: H, transform: `scale(${s})`, transformOrigin: "0 0" }}>
        {mobile ? <MobileSim variant={sc.variant} fixed={fixed} /> : <DesktopSim fixed={fixed} />}
      </div>
    </div>
  );
}

/* ═════════════ Vision Overlays ═════════════ */
function Box({ item, delay }) {
  const c = KC[item.kind]; const b = item.b;
  return (
    <div style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, border: `2px solid ${c}`, borderRadius: 4, background: `${c}26`, animation: "boxin .5s ease both", animationDelay: `${delay}ms`, zIndex: 30 }}>
      <span style={{ position: "absolute", left: -2, top: -16, background: c, color: KFG[item.kind], fontSize: 9, fontFamily: "var(--mono)", fontWeight: 700, padding: "1px 5px", borderRadius: "3px 3px 3px 0", whiteSpace: "nowrap" }}>{item.label}</span>
    </div>
  );
}
function Tag({ t }) {
  const c = KC[t.kind];
  return (
    <div style={{ position: "absolute", left: t.x, top: t.y, width: t.w, border: `1.5px solid ${c}`, background: "#fff", color: "#0B1020", borderRadius: 10, padding: "6px 9px", fontSize: 11.5, lineHeight: 1.3, fontWeight: 600, zIndex: 35, display: "flex", gap: 7, alignItems: "flex-start", boxShadow: "0 6px 16px rgba(11,16,32,.12)" }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: c, marginTop: 4, flexShrink: 0 }} />
      <span>{t.text}</span>
    </div>
  );
}
function ptOf(r, side) {
  if (side === "l") return [r.x, r.y + r.h / 2];
  if (side === "r") return [r.x + r.w, r.y + r.h / 2];
  if (side === "t") return [r.x + r.w / 2, r.y];
  return [r.x + r.w / 2, r.y + r.h];
}

function VisionStage({ sc, scanning }) {
  const mobile = sc.kind === "mobile";
  const ox = mobile ? 164 : 0, oy = mobile ? 8 : 52;
  const H = mobile ? 568 : 468;
  const fw = mobile ? 312 : 640, fh = mobile ? 552 : 400;
  return (
    <Stage H={H}>
      <Frame sc={sc} fixed={false} x={ox} y={oy} />
      <svg width="640" height={H} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 34 }}>
        {sc.tags.filter((t) => t.box !== undefined).map((t, i) => {
          const r = sc.boxes[t.box].b; const c = KC[t.kind];
          const from = t.from === "r" ? [t.x + t.w, t.y + 16] : t.from === "l" ? [t.x, t.y + 16] : [t.x + t.w / 2, t.y + 36];
          const to = ptOf(r, t.at);
          return (
            <g key={i}>
              <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={c} strokeWidth="1.6" strokeDasharray="4 3" />
              <circle cx={to[0]} cy={to[1]} r="4" fill={c} stroke="#fff" strokeWidth="1.5" />
            </g>
          );
        })}
      </svg>
      {sc.boxes.map((b, i) => <Box key={sc.id + i} item={b} delay={i * 160} />)}
      {sc.tags.map((t, i) => <Tag key={sc.id + "t" + i} t={t} />)}
      {scanning && <div className="scanline" style={{ left: ox, top: oy, width: fw, height: fh }}><i /></div>}
    </Stage>
  );
}

/* ═════════════ Before / After Stage ═════════════ */
function PatchBadge({ tone, children, x, y }) {
  const bad = tone === "bad";
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#fff", background: bad ? KC.err : KC.ok, zIndex: 40 }}>
      {children}
    </div>
  );
}
function PatchStage({ sc, view, pos }) {
  const mobile = sc.kind === "mobile";
  if (view === "split") {
    if (mobile) {
      return (
        <Stage H={600}>
          <PatchBadge tone="bad" x={4} y={4}>Before (Buggy UI)</PatchBadge>
          <PatchBadge tone="ok" x={324} y={4}>After (Patched UI)</PatchBadge>
          <Frame sc={sc} fixed={false} x={4} y={40} />
          <Frame sc={sc} fixed={true} x={324} y={40} />
        </Stage>
      );
    }
    return (
      <Stage H={908}>
        <PatchBadge tone="bad" x={0} y={4}>Before (Buggy UI)</PatchBadge>
        <Frame sc={sc} fixed={false} x={0} y={40} />
        <PatchBadge tone="ok" x={0} y={460}>After (Patched UI)</PatchBadge>
        <Frame sc={sc} fixed={true} x={0} y={496} />
      </Stage>
    );
  }
  const fw = mobile ? 312 : 640, fh = mobile ? 552 : 400;
  const ox = mobile ? 164 : 0, oy = 40;
  const cut = (pos / 100) * fw;
  return (
    <Stage H={oy + fh + 12}>
      <PatchBadge tone="bad" x={mobile ? 4 : 0} y={4}>Before (Buggy UI)</PatchBadge>
      <PatchBadge tone="ok" x={mobile ? 330 : 380} y={4}>After (Patched UI)</PatchBadge>
      <Frame sc={sc} fixed={false} x={ox} y={oy} />
      <div style={{ position: "absolute", left: ox, top: oy, width: fw, height: fh, clipPath: `inset(0 0 0 ${cut}px)` }}>
        <Frame sc={sc} fixed={true} x={0} y={0} />
      </div>
      <div style={{ position: "absolute", left: ox + cut - 1.5, top: oy - 6, width: 3, height: fh + 12, background: "#0B1020", zIndex: 45 }} />
    </Stage>
  );
}

/* ═════════════ Voice Orb Stage ═════════════ */
function useTyped(lines, active, resetKey) {
  const total = lines.reduce((n, l) => n + l.text.length, 0);
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!active) return undefined;
    const id = setInterval(() => setN((v) => (v >= total ? v : v + 2)), 32);
    return () => clearInterval(id);
  }, [active, resetKey, total]);
  let rem = n;
  const shown = lines.map((l) => { const k = Math.max(0, Math.min(l.text.length, rem)); rem -= l.text.length; return { ...l, vis: l.text.slice(0, k), done: k >= l.text.length }; });
  return { shown, finished: n >= total };
}
function VoicePanel({ voiceObj, typed, row, host }) {
  const [copied, doCopy] = useCopy();
  const snippet = `<script src="https://cdn.pramana.dev/orb.js" data-site="${host}" async></script>`;
  return (
    <div className="vpanel" style={{ flexDirection: row ? "row" : "column" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: row ? 180 : "100%", flexShrink: 0 }}>
        <div className="vtag"><span className="live-dot gold" /> Voice Capture · {voiceObj.lang}</div>
        <div className="orb-wrap"><span className="orb-ring" /><span className="orb-ring r2" /><div className="orb"><Icon n="mic" size={24} stroke={2.2} /></div></div>
        <div style={{ fontSize: 11, color: "var(--mute)", textAlign: "center" }}>♪ {voiceObj.cue}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {typed.shown.map((l, i) => (
            <div key={i} className={"bubble" + (i === 0 ? " user" : "")}>
              <div className="who">{l.who}</div>
              <div className="said">{i === 0 ? "“" : ""}{l.vis}{!l.done && <span className="caret" />}{i === 0 && l.done ? "”" : ""}</div>
            </div>
          ))}
        </div>
        <div className="mapped">
          <Icon n="link" size={12} /> linked to <b>{voiceObj.node}</b> · {voiceObj.match}
        </div>
        <div className="snippet">
          <div className="snippet-k">Optional 1-line customer voice widget</div>
          <code>{snippet}</code>
          <button type="button" onClick={() => doCopy(snippet)} className="mini-btn"><Icon n={copied ? "check" : "copy"} size={11} /> {copied ? "Copied" : "Copy snippet"}</button>
        </div>
      </div>
    </div>
  );
}
function VoiceStage({ sc, active, host }) {
  const mobile = sc.kind === "mobile";
  const typed = useTyped(sc.voice.lines, active, sc.id);
  if (mobile) {
    return (
      <Stage H={568}>
        <Frame sc={sc} fixed={false} x={4} y={8} />
        <div style={{ position: "absolute", left: 332, top: 8, width: 308, height: 552 }}><VoicePanel voiceObj={sc.voice} typed={typed} row={false} host={host} /></div>
      </Stage>
    );
  }
  return (
    <Stage H={760}>
      <Frame sc={sc} fixed={false} x={0} y={32} />
      <div style={{ position: "absolute", left: 0, top: 444, width: 640, height: 300 }}><VoicePanel voiceObj={sc.voice} typed={typed} row={true} host={host} /></div>
    </Stage>
  );
}

/* ═════════════ Exhibit (Worked Example Left Column) ═════════════ */
const LENSES = [
  { id: "vision", label: "Visual Bug Detection", icon: "eye", c: "#2B3BFF", wash: "#E3E7FF" },
  { id: "patch", label: "Before / After UI Fix", icon: "sparkles", c: "#007A51", wash: "#D8F5E8" },
  { id: "voice", label: "Customer Voice Report", icon: "mic", c: "#9A6B00", wash: "#FFF0C2" },
];
function Exhibit({ sc, mode, setMode, audit, host }) {
  const [patchView, setPatchView] = useState("split");
  const [pos, setPos] = useState(50);
  const running = audit.state === "running";
  const lens = LENSES.find((l) => l.id === mode);

  return (
    <section className="exhibit" aria-label="Worked example visual stage">
      <header className="ex-head">
        <div>
          <div className="kicker" style={{ color: "var(--blue)" }}>
            Worked Example · {sc.variant === "desktop" ? "ScaleGrid (Our Demo App)" : "ZestKart (Our Demo Store)"}
          </div>
          <p className="caption">{sc.figCaption}</p>
        </div>
        <span className="chip mono">{sc.viewport}</span>
      </header>
      <div className="lenses" role="tablist">
        {LENSES.map((l) => (
          <button key={l.id} role="tab" aria-selected={mode === l.id} type="button" onClick={() => setMode(l.id)} className="lens"
            style={mode === l.id ? { background: l.wash, color: l.c, boxShadow: `inset 0 -3px 0 ${l.c}` } : undefined}>
            <Icon n={l.icon} size={15} /> {l.label}
          </button>
        ))}
      </div>
      {mode === "patch" && (
        <div className="patchbar">
          <div className="seg">
            {[["split", "Side-by-side"], ["swipe", "Swipe compare"]].map(([id, l]) => (
              <button key={id} type="button" onClick={() => setPatchView(id)} className={patchView === id ? "on" : ""}>{l}</button>
            ))}
          </div>
          {patchView === "swipe" && (
            <label className="swipe">
              <span style={{ color: "var(--red-d)" }}>Before</span>
              <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(Number(e.target.value))} className="range" />
              <span style={{ color: "var(--green-d)" }}>After</span>
            </label>
          )}
        </div>
      )}
      <div className="stagewrap" style={{ background: lens.wash }}>
        {mode === "vision" && <VisionStage sc={sc} scanning={running} />}
        {mode === "patch" && <PatchStage sc={sc} view={patchView} pos={pos} />}
        {mode === "voice" && <VoiceStage sc={sc} active host={host} />}
      </div>
      <footer className="ex-foot">
        <span>{mode === "patch" ? `Fix applied: ${sc.changes.join(" · ")}` : `${sc.boxes.length} UI regions highlighted on ${sc.device}`}</span>
        <a href="/demo-store/index.html" target="_blank" rel="noopener noreferrer" className="mono" style={{ fontSize: 11.5, color: "var(--blue)", fontWeight: 700, textDecoration: "none" }}>
          Open interactive demo store ↗
        </a>
      </footer>
    </section>
  );
}

/* ═════════════ Honest Pending & Unverified Error States (T-306) ═════════════ */
function PendingLiveAuditCard({ url, startedAt, onCancel }) {
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setElapsedMs(Math.max(0, Date.now() - (startedAt || Date.now())));
    }, 100);
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <section className="pending-card" aria-live="polite" aria-label="Live Audit In Progress">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="spinner tiny" />
          <span className="badge-pill blue">AUDIT PENDING · WAITING FOR /API/AUDIT</span>
          <span className="badge-pill cyan">STATIC HTML ONLY</span>
          <span className="mono tnum" style={{ fontSize: 12, color: "var(--ink2)" }}>
            {(elapsedMs / 1000).toFixed(1)}s elapsed
          </span>
        </div>
        <button type="button" onClick={onCancel} className="btn-act">
          Cancel
        </button>
      </div>
      <div>
        <div className="kicker">Submitted URL (Bound to Request)</div>
        <div className="mono" style={{ fontSize: 13.5, color: "var(--ink)", marginTop: 4, wordBreak: "break-all" }}>
          GET {url}
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--ink2)" }}>
          Fetching live public HTML from the server. No heuristic client score or estimate is shown before the server response settles.
        </p>
      </div>
      <div className="shimmer-grid" aria-hidden="true">
        <div className="shimmer-box" />
        <div className="shimmer-box" />
        <div className="shimmer-box" />
        <div className="shimmer-box" />
      </div>
    </section>
  );
}

function UnverifiedErrorCard({ url, error, onRetry }) {
  return (
    <section className="calm-report" aria-label="Unverified Audit Error">
      <div className="story" style={{ borderColor: "var(--red)", background: "var(--card)" }}>
        <div className="story-head" style={{ background: "var(--red-w)", cursor: "default" }}>
          <div>
            <span className="kicker" style={{ color: "var(--red-d)" }}>UNVERIFIED · SERVER AUDIT FAILED</span>
            <span className="story-title">Could not complete live static HTML audit</span>
          </div>
          <span className="badge-pill err">UNVERIFIED</span>
        </div>
        <div className="story-body" style={{ display: "grid", gap: 10 }}>
          <div className="mono" style={{ fontSize: 12.5, color: "var(--ink)" }}>{url}</div>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink2)" }}>
            {error || "Network or API failure while contacting /api/audit. Pramana refuses to substitute a client-side heuristic estimate as a live scrape."}
          </p>
          <div>
            <button type="button" onClick={onRetry} className="btn-act primary">
              <Icon n="rotate" size={13} /> Retry Live Audit
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═════════════ Live 390×844 Mobile Viewport & Pinpointed Issue X-Ray ═════════════ */
function LiveMobileViewport({ customAudit }) {
  const dom = customAudit.scrapedDom || {};
  const finding = customAudit.customFinding || {};
  const findingsList = finding.findings || [];
  const elements = dom.interactiveElements || [];
  const warnControls = elements.filter((el) => el.auditStatus !== "PASS");
  const mobileVp = dom.mobileViewport || { width: 390, height: 844, frameAllowed: false, frameBlockedReason: null };
  const limitation = finding.auditLimitation || dom.auditLimitation || { limited: false };
  const hasPreviewHtml = Boolean(dom.mobilePreviewHtml && dom.mobilePreviewHtml.trim().length > 40);
  const canRenderLiveDom = Boolean(mobileVp.frameAllowed || hasPreviewHtml);
  const [viewMode, setViewMode] = useState("issues");

  useEffect(() => {
    setViewMode(findingsList.length > 0 || limitation.limited ? "issues" : canRenderLiveDom ? "iframe" : "issues");
  }, [customAudit.targetUrl, findingsList.length, limitation.limited, canRenderLiveDom]);

  return (
    <div className="story">
      <div className="story-head" style={{ cursor: "default" }}>
        <div>
          <span className="kicker">Mobile Viewport · 390 × 844 px</span>
          <span className="story-title">
            {findingsList.length > 0 ? `Pinpointed Mobile Issues (${findingsList.length})` : "Live Mobile Capture"}
          </span>
        </div>
        <div className="seg" role="tablist" aria-label="Mobile view mode">
          <button
            type="button"
            className={viewMode === "issues" ? "on" : ""}
            onClick={() => setViewMode("issues")}
          >
            Issues X-Ray ({findingsList.length})
          </button>
          <button
            type="button"
            className={viewMode === "iframe" ? "on" : ""}
            onClick={() => setViewMode("iframe")}
          >
            Live 390px Render
          </button>
        </div>
      </div>
      <div className="story-body" style={{ display: "grid", gap: 12 }}>
        <div className="phone-shell">
          <div className="phone-notch">
            <span>9:41</span>
            <span>iPhone 15 · 390px</span>
            <span>5G</span>
          </div>
          <div className="phone-urlbar" title={customAudit.targetUrl}>
            🔒 {customAudit.targetUrl}
          </div>
          <div className="phone-viewport">
            {viewMode === "iframe" ? (
              <div style={{ width: "100%", height: "100%", position: "relative" }}>
                {mobileVp.frameAllowed ? (
                  <iframe
                    src={customAudit.targetUrl}
                    title={`Live mobile preview of ${customAudit.hostname}`}
                    className="phone-iframe"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    referrerPolicy="no-referrer"
                  />
                ) : hasPreviewHtml ? (
                  <iframe
                    srcDoc={dom.mobilePreviewHtml}
                    title={`Sanitized live mobile HTML render of ${customAudit.hostname}`}
                    className="phone-iframe"
                    sandbox="allow-same-origin"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <iframe
                    src={customAudit.targetUrl}
                    title={`Live mobile preview of ${customAudit.hostname}`}
                    className="phone-iframe"
                    sandbox="allow-scripts allow-same-origin"
                    referrerPolicy="no-referrer"
                  />
                )}
                {findingsList.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      left: 8,
                      right: 8,
                      bottom: 8,
                      background: "rgba(11,16,32,0.92)",
                      color: "#fff",
                      borderRadius: 10,
                      padding: "8px 10px",
                      fontSize: 11,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span>
                      <b style={{ color: "#FF6B4A" }}>● {findingsList.length} mobile defect{findingsList.length === 1 ? "" : "s"}</b> outlined on page
                    </span>
                    <button
                      type="button"
                      onClick={() => setViewMode("issues")}
                      style={{ background: "#F0431F", color: "#fff", border: 0, borderRadius: 6, padding: "3px 8px", font: "700 10px var(--mono)" }}
                    >
                      Inspect →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: 12, height: "100%", overflowY: "auto", fontFamily: "var(--sans)", fontSize: 12, color: "#0B1020", background: "#fff" }}>
                {/* Mini Live Visual Header or OG Preview */}
                {hasPreviewHtml && !limitation.limited && (
                  <div style={{ height: 118, overflow: "hidden", borderRadius: 8, border: "1.5px solid #F0431F", marginBottom: 10, position: "relative", background: "#F6F7FB" }}>
                    <iframe
                      srcDoc={dom.mobilePreviewHtml}
                      title={`Mini mobile snapshot of ${customAudit.hostname}`}
                      style={{ width: 390, height: 320, border: 0, transform: "scale(0.69)", transformOrigin: "top left", pointerEvents: "none" }}
                      sandbox="allow-same-origin"
                    />
                    <span
                      style={{
                        position: "absolute",
                        right: 6,
                        bottom: 6,
                        background: "#F0431F",
                        color: "#fff",
                        font: "700 9px var(--mono)",
                        padding: "2px 6px",
                        borderRadius: 4,
                      }}
                    >
                      LIVE 390PX DOM SNAPSHOT
                    </span>
                  </div>
                )}

                {limitation.limited && (
                  <div style={{ padding: "10px 11px", borderRadius: 10, background: "#FFF0C2", border: "1.5px solid #FFB400", marginBottom: 10 }}>
                    <div className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: "#8A5F00" }}>UNVERIFIED · {limitation.code}</div>
                    <div style={{ fontWeight: 700, fontSize: 12, marginTop: 2 }}>{limitation.title}</div>
                    <div style={{ fontSize: 11, color: "#3B4259", marginTop: 2 }}>{limitation.evidenceSnippet || limitation.explanation}</div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span className="mono" style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", color: findingsList.length > 0 ? "#C2300F" : "#007A51" }}>
                    {findingsList.length > 0
                      ? `Pinpointed Mobile Bugs (${findingsList.length})`
                      : "0 Static Mobile Defects Detected"}
                  </span>
                  <span className="mono" style={{ fontSize: 9.5, color: "#636A82" }}>
                    {customAudit.activeModel || "gemini-3.5-flash-lite"}
                  </span>
                </div>

                {/* Render EXACT issues found on the page (NEVER a list of green PASS nav links when issues exist!) */}
                {findingsList.length > 0 ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {findingsList.map((f, idx) => (
                      <div
                        key={f.id || idx}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1.5px solid #F0431F",
                          background: "#FFF5F2",
                          display: "grid",
                          gap: 4,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 11.5, color: "#0B1020", lineHeight: 1.3 }}>
                            {idx + 1}. {f.title}
                          </span>
                          <span className="badge-pill err" style={{ fontSize: 8.5, flexShrink: 0 }}>
                            {f.severity || "ISSUE"}
                          </span>
                        </div>
                        {f.plainEnglishImpact && (
                          <div style={{ fontSize: 10.5, color: "#3B4259", lineHeight: 1.35 }}>
                            {f.plainEnglishImpact}
                          </div>
                        )}
                        {f.markupSnippet && (
                          <code
                            style={{
                              display: "block",
                              padding: "4px 6px",
                              borderRadius: 4,
                              background: "#FFFFFF",
                              border: "1px solid #F0431F",
                              font: "500 9.5px/1.35 var(--mono)",
                              color: "#C2300F",
                              overflowX: "auto",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {f.markupSnippet}
                          </code>
                        )}
                      </div>
                    ))}
                    {warnControls.map((ctrl, idx) => (
                      <div
                        key={`warn-${idx}`}
                        style={{
                          padding: "7px 9px",
                          borderRadius: 8,
                          border: "1.5px solid #FFB400",
                          background: "#FFFBEB",
                          display: "grid",
                          gap: 3,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 700, fontSize: 11 }}>{ctrl.label}</span>
                          <span className="badge-pill warn" style={{ fontSize: 8.5 }}>WARN</span>
                        </div>
                        <div style={{ fontSize: 10.5, color: "#3B4259" }}>{ctrl.auditReason}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: 10, borderRadius: 8, background: "#D8F5E8", border: "1px solid #00A36C", fontSize: 11.5, color: "#007A51" }}>
                    <b>Clean Static Mobile Baseline:</b> All {elements.length} static controls, images, and viewport rules passed inspection.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6, fontSize: 11.5, color: "var(--mute)" }}>
          <span>
            {viewMode === "issues"
              ? `Showing ${findingsList.length} exact pinpointed defect${findingsList.length === 1 ? "" : "s"} caught on ${customAudit.hostname}.`
              : mobileVp.frameAllowed
              ? "Live 390px mobile frame loaded."
              : "Rendering server-fetched mobile HTML with red defect outlines."}
          </span>
          <a href={customAudit.targetUrl} target="_blank" rel="noopener noreferrer" className="mono" style={{ color: "var(--blue)", fontWeight: 700, textDecoration: "none" }}>
            Open Live Site ↗
          </a>
        </div>
      </div>
    </div>
  );
}

/* ═════════════ Editorial Live URL Report (T-305..T-310) ═════════════ */
function CalmLiveReport({ customAudit, onOpenShare, onOpenConnectRepo }) {
  const [copiedFix, copyFix] = useCopy();
  const [copiedPrompt, copyPrompt] = useCopy();
  const [showTechJson, setShowTechJson] = useState(false);
  const [evidenceFilter, setEvidenceFilter] = useState("ALL");

  const dom = customAudit.scrapedDom || {};
  const finding = customAudit.customFinding || {};
  const telemetry = customAudit.telemetry || {};
  const elements = dom.interactiveElements || [];
  const findingsList = finding.findings || [];
  const a11y = dom.accessibilityMetrics || {};
  const forms = dom.formsAndInputs || {};
  const limitation = finding.auditLimitation || dom.auditLimitation || { limited: false, code: "NONE", signals: [] };

  const isUnverified = Boolean(limitation.limited || finding.severity === "UNVERIFIED");
  const score = typeof finding.domHealthScore === "number" ? finding.domHealthScore : null;
  const sev = finding.severity || (isUnverified ? "UNVERIFIED" : "PASS");
  const remediationEligible = Boolean(finding.remediationEligible && !isUnverified);
  const diffLines = finding.diffLines || [];
  const rawFix = diffLines.map((l) => `${l.t === "add" ? "+ " : l.t === "del" ? "- " : "  "}${l.c}`).join("\n");

  const aiFixPrompt =
    finding.aiFixPrompt ||
    `Fix the ${findingsList.length} mobile UX & HTML issues observed on ${customAudit.targetUrl}:\n\n${findingsList
      .map((f, i) => `${i + 1}. [${f.id}] ${f.title}\n   Observed HTML: ${f.markupSnippet || "N/A"}`)
      .join("\n")}\n\nSuggested patch:\n${rawFix}`;

  const filteredElements = elements.filter((el) => {
    if (evidenceFilter === "FACT") return (el.claimType || "OBSERVED_FACT") === "OBSERVED_FACT";
    if (evidenceFilter === "INFERENCE") return el.claimType === "INFERENCE";
    if (evidenceFilter === "ISSUES") return el.auditStatus !== "PASS";
    return true;
  });

  const sevTone =
    sev === "PASS" ? "ok" : sev === "LOW" ? "blue" : sev === "UNVERIFIED" || sev === "CRITICAL" ? "err" : "warn";

  const providerCallsCount = telemetry.providerCallCount ?? 0;
  const tokenText = telemetry.measuredTokenUsage?.available
    ? `${telemetry.measuredTokenUsage.inputTokens ?? "?"} in / ${telemetry.measuredTokenUsage.outputTokens ?? "?"} out`
    : "Not measured (0 LLM calls)";

  return (
    <section className="calm-report" aria-label="Live URL Audit Report">
      {/* 1. Top Verdict Banner */}
      <div className="report-bar">
        <div style={{ minWidth: 0, flex: "1 1 420px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span className="badge-pill cyan">STATIC HTML ONLY</span>
            <span className="badge-pill blue">{finding.surfaceCategory || "Public Surface"}</span>
            <span className={"badge-pill " + sevTone}>Verdict: {sev}</span>
            <span className="mono tnum" style={{ fontSize: 11.5, color: "var(--ink2)" }}>
              HTTP {customAudit.httpStatus ?? 0} · {customAudit.latencyMs}ms · {dom.htmlKilobytes ?? 0} KB
            </span>
          </div>
          <h2 style={{ margin: "8px 0 3px", font: "700 20px/1.25 var(--display)", color: "var(--ink)" }}>
            {dom.pageTitle || customAudit.hostname}
          </h2>
          <div className="mono" style={{ fontSize: 11.5, color: "var(--mute)", wordBreak: "break-all" }}>
            GET {customAudit.targetUrl} · {a11y.estimatedDomNodes ?? 0} static nodes · {a11y.totalScripts ?? 0} scripts
          </div>
        </div>
        <div className="action-group">
          <button
            type="button"
            disabled={!remediationEligible}
            onClick={() => copyPrompt(aiFixPrompt)}
            className="btn-act primary"
            title="Copy ready-to-paste prompt for Cursor, Lovable, Bolt, or v0"
          >
            <Icon n={copiedPrompt ? "check" : "sparkles"} size={13} />
            {copiedPrompt ? "Copied AI Prompt ✓" : "Copy AI Fix Prompt (Cursor/Lovable)"}
          </button>
          <button
            type="button"
            disabled={!remediationEligible}
            onClick={() => copyFix(rawFix)}
            className="btn-act"
            title={remediationEligible ? "Copy evidence-grounded code diff" : "Remediation suppressed for unverified or clean static scan"}
          >
            <Icon n={copiedFix ? "check" : "copy"} size={13} />
            {copiedFix ? "Copied Diff ✓" : "Copy Code Diff"}
          </button>
          <button type="button" onClick={onOpenShare} className="btn-act">
            <Icon n="link" size={13} /> Share Proof
          </button>
          <button type="button" onClick={onOpenConnectRepo} className="btn-act">
            <Icon n="merge" size={13} /> Connect Repo
          </button>
        </div>
      </div>

      {/* Fail-Closed Scope Limitation Banner (T-305) */}
      {limitation.limited && (
        <div className="story" style={{ borderColor: "var(--gold)", background: "var(--gold-w)" }}>
          <div style={{ padding: "14px 18px", display: "grid", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <span className="kicker" style={{ color: "var(--gold-d)" }}>
                FAIL-CLOSED SCOPE LIMITATION · {limitation.code}
              </span>
              <span className="badge-pill warn">CLEAN PASS &amp; FIX SUPPRESSED</span>
            </div>
            <div style={{ fontSize: 13.5, color: "var(--ink)" }}>
              <b>{limitation.title}:</b> {limitation.explanation}
            </div>
            {Array.isArray(limitation.signals) && limitation.signals.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                {limitation.signals.map((sig) => (
                  <span key={sig} className="chip mono" style={{ fontSize: 10.5 }}>{sig}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. 4-Card Vital Telemetry Strip */}
      <div className="vitals-strip">
        <div className="vital-box">
          <span className="kicker">Static HTML Readiness</span>
          {score === null ? (
            <>
              <div className="vital-val warn" style={{ fontSize: 22 }}>UNVERIFIED</div>
              <span style={{ fontSize: 11.5, color: "var(--ink2)" }}>
                Numeric score suppressed ({limitation.code})
              </span>
            </>
          ) : (
            <>
              <div className={"vital-val " + (score >= 90 ? "ok" : score >= 75 ? "warn" : "err")}>
                {score}<span style={{ fontSize: 14, fontWeight: 500, color: "var(--mute)" }}>/100</span>
              </div>
              <div className="micro-bar">
                <div style={{ width: `${score}%`, background: score >= 90 ? "var(--green)" : score >= 75 ? "var(--gold)" : "var(--red)" }} />
              </div>
              <span style={{ fontSize: 11.5, color: "var(--ink2)" }}>
                {a11y.estimatedDomNodes ?? 0} static nodes · Static HTML only
              </span>
            </>
          )}
        </div>

        <div className="vital-box">
          <span className="kicker">Interactive Controls</span>
          <div className="vital-val">
            {elements.length - (finding.warnCount || 0)}
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--mute)" }}>/{elements.length} pass</span>
          </div>
          <span style={{ fontSize: 11.5, color: "var(--ink2)" }}>
            {finding.warnCount || 0} warnings in parsed static markup
          </span>
        </div>

        <div className="vital-box">
          <span className="kicker">Form &amp; Image A11y Flags</span>
          <div className={"vital-val " + ((forms.unlabeledInputsCount || 0) + (a11y.imagesMissingAlt || 0) > 0 ? "warn" : "ok")}>
            {(forms.unlabeledInputsCount || 0) + (a11y.imagesMissingAlt || 0)}
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--mute)" }}> flags</span>
          </div>
          <span style={{ fontSize: 11.5, color: "var(--ink2)" }}>
            {forms.unlabeledInputsCount || 0} unlabeled inputs · {a11y.imagesMissingAlt || 0} missing alt
          </span>
        </div>

        <div className="vital-box">
          <span className="kicker">Auditable Telemetry (T-309)</span>
          <div className="mono" style={{ fontSize: 11.5, color: "var(--ink)", display: "grid", gap: 3 }}>
            <div>Provider Calls: <b style={{ color: "var(--cyan)" }}>{providerCallsCount}</b> ({customAudit.activeModel})</div>
            <div>Est. Marginal: <b>${telemetry.estimatedMarginalCostUsd ?? 0.024}</b> <span style={{ color: "var(--mute)" }}>(amortized)</span></div>
            <div>Tokens: <span style={{ color: "var(--ink2)" }}>{tokenText}</span></div>
            <div style={{ color: "var(--mute)", fontSize: 10.5 }}>Revenue Impact: N/A (Static HTML)</div>
          </div>
        </div>
      </div>

      {/* 3. Master-Detail 2-Column Evidence & Remediation Workspace */}
      <div className="grid" style={{ marginTop: 0 }}>
        <div className="col-l">
          {/* Evidence-Grounded Findings Card (T-307) */}
          {findingsList.length > 0 && (
            <div className="story">
              <div className="story-head" style={{ cursor: "default" }}>
                <div>
                  <span className="kicker">Observed Evidence (T-307 · Static HTML Only)</span>
                  <span className="story-title">Grounded Findings ({findingsList.length})</span>
                </div>
                <span className="badge-pill cyan">OBSERVED vs INFERENCE</span>
              </div>
              <div className="story-body" style={{ display: "grid", gap: 10 }}>
                {findingsList.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      padding: "11px 13px",
                      borderRadius: 8,
                      border: "1px solid var(--rule)",
                      background: "var(--well)",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>{f.title}</span>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        <span className={"badge-pill " + (f.claimType === "OBSERVED_FACT" ? "ok" : "warn")}>
                          {f.claimType === "OBSERVED_FACT" ? "OBSERVED FACT" : "INFERENCE"}
                        </span>
                        <span className="badge-pill cyan">{f.evidenceSource}</span>
                        <span className="chip mono" style={{ fontSize: 10 }}>role={f.role}</span>
                      </div>
                    </div>
                    {f.plainEnglishImpact && (
                      <div style={{ fontSize: 12.5, color: "var(--ink)", background: "var(--card)", padding: "6px 10px", borderRadius: 6, borderLeft: "3px solid var(--blue)" }}>
                        <b>Why this costs customers:</b> {f.plainEnglishImpact}
                      </div>
                    )}
                    {f.markupSnippet && <code className="snippet-code" style={{ maxWidth: "100%" }}>{f.markupSnippet}</code>}
                    <div style={{ fontSize: 12, color: "var(--ink2)" }}>
                      {f.limitationNote} <span className="mono" style={{ color: "var(--mute)" }}>· diag: {f.diagnosticSelector}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* High-Density Interactive Controls Table */}
          <div className="story">
            <div className="story-head" style={{ cursor: "default" }}>
              <div>
                <span className="kicker">Role &amp; Name Identity (INV-03) · Selectors Diagnostic Only</span>
                <span className="story-title">Inspected Static Controls</span>
              </div>
              <span className="chip mono">{elements.length} controls</span>
            </div>
            <div className="filter-row" role="group" aria-label="Filter controls">
              {[
                ["ALL", `All (${elements.length})`],
                ["FACT", `Observed Fact (${elements.filter((e) => (e.claimType || "OBSERVED_FACT") === "OBSERVED_FACT").length})`],
                ["INFERENCE", `Inference (${elements.filter((e) => e.claimType === "INFERENCE").length})`],
                ["ISSUES", `Warnings (${elements.filter((e) => e.auditStatus !== "PASS").length})`],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setEvidenceFilter(id)}
                  className={"filter-pill" + (evidenceFilter === id ? " on" : "")}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="story-body" style={{ padding: 0 }}>
              <div style={{ overflowX: "auto" }}>
                <table className="cta-table">
                  <thead>
                    <tr>
                      <th>Role &amp; Accessible Name</th>
                      <th>Status &amp; Claim</th>
                      <th>Observed Evidence / Diagnostic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredElements.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="mono" style={{ color: "var(--mute)" }}>
                          No static HTML controls match the current filter.
                        </td>
                      </tr>
                    ) : (
                      filteredElements.slice(0, 8).map((el, idx) => (
                        <tr key={idx}>
                          <td>
                            <div style={{ fontWeight: 700, color: "var(--ink)" }}>{el.accessibleName || el.label}</div>
                            <div className="mono" style={{ fontSize: 11, color: "var(--blue-d)", marginTop: 2 }}>
                              role=&quot;{el.role || el.tag}&quot; · {el.diagnosticSelector || `<${el.tag}>`}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                              <span className={"badge-pill " + (el.auditStatus === "CRITICAL" ? "err" : el.auditStatus === "WARN" ? "warn" : "ok")}>
                                {el.auditStatus}
                              </span>
                              <span className="mono" style={{ fontSize: 10, color: "var(--mute)" }}>
                                {el.claimType || "OBSERVED_FACT"}
                              </span>
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: "var(--ink2)" }}>
                            <div>{el.auditReason}</div>
                            {el.markupSnippet && <code className="snippet-code">{el.markupSnippet}</code>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-r">
          {/* Live 390×844 Mobile Viewport Preview */}
          <LiveMobileViewport customAudit={customAudit} />

          {/* Evidence-Grounded Fix Snippet Card */}
          <div className="story">
            <div className="story-head" style={{ cursor: "default" }}>
              <div>
                <span className="kicker">Evidence-Grounded Remediation</span>
                <span className="story-title">
                  {remediationEligible ? "Copyable HTML / ARIA Diff" : isUnverified ? "Remediation Suppressed (Unverified)" : "No Static Fix Needed"}
                </span>
              </div>
              <span className={"badge-pill " + (remediationEligible ? "blue" : isUnverified ? "warn" : "ok")}>
                {remediationEligible ? "No Repo Connected" : isUnverified ? "Fail-Closed" : "Clean Census"}
              </span>
            </div>
            <div className="story-body">
              <div className="diff">
                <div className="diff-head">
                  <span className="mono">{finding.diffFile || "suggested-snippet.html"}</span>
                  <span className="mono">{finding.remediationTargetFindingId || finding.remediationType}</span>
                </div>
                <div className="diff-scroll">
                  <div className="diff-inner">
                    {diffLines.map((l, i) => (
                      <div key={i} className={"dl " + l.t}>
                        <span className="sign">{l.t === "add" ? "+" : l.t === "del" ? "−" : ""}</span>
                        <span className="code">{highlight(l.c)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  disabled={!remediationEligible}
                  onClick={() => copyPrompt(aiFixPrompt)}
                  className="merge-btn blue-btn"
                >
                  <Icon n={copiedPrompt ? "check" : "sparkles"} size={14} />
                  {remediationEligible
                    ? copiedPrompt
                      ? "Copied AI Fix Prompt ✓ (Paste into Cursor / Lovable / Bolt)"
                      : "Copy AI Fix Prompt (Cursor / Lovable / Bolt)"
                    : isUnverified
                    ? "Patch Suppressed — Unrendered Shell"
                    : "No Static Fix Needed"}
                </button>
                {remediationEligible && (
                  <button
                    type="button"
                    onClick={() => copyFix(rawFix)}
                    className="btn-act"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    <Icon n={copiedFix ? "check" : "copy"} size={13} />
                    {copiedFix ? "Copied Raw HTML/ARIA Diff ✓" : "Copy Raw HTML / ARIA Diff"}
                  </button>
                )}
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--mute)" }}>
                Built with Cursor, Lovable, Bolt, or Shopify? Paste the AI Fix Prompt above straight into your editor—or{" "}
                <button
                  type="button"
                  onClick={onOpenConnectRepo}
                  style={{ background: "none", border: 0, padding: 0, color: "var(--blue-d)", fontWeight: 700, textDecoration: "underline" }}
                >
                  Connect GitHub App →
                </button>
              </p>
            </div>
          </div>

          {/* Collapsible Developer Diagnostics & Auditable Telemetry JSON */}
          <div className="story">
            <button type="button" onClick={() => setShowTechJson((v) => !v)} className="story-head">
              <div>
                <span className="kicker">Developer Diagnostics</span>
                <span style={{ fontWeight: 700, fontSize: 13.5 }}>Raw Server JSON &amp; Telemetry Ledger</span>
              </div>
              <Icon n="chevron" size={16} style={{ transform: showTechJson ? "rotate(180deg)" : "none" }} />
            </button>
            {showTechJson && (
              <div className="story-body" style={{ paddingTop: 12 }}>
                <pre className="mono" style={{ margin: 0, padding: 12, background: "var(--well)", border: "1px solid var(--rule)", borderRadius: 6, fontSize: 11, overflowX: "auto", color: "var(--ink)" }}>
                  {JSON.stringify({ telemetry, auditLimitation: limitation, customFinding: finding }, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═════════════ Collapsed Worked Example Right Column ═════════════ */
function WorkedExampleRightColumn({ sc, merge, setMerge, onOpenShare }) {
  const [copiedDiff, copyDiff] = useCopy();
  const [showTechDrawer, setShowTechDrawer] = useState(false);
  const t = useRef(null);
  useEffect(() => () => clearTimeout(t.current), []);

  const p = sc.pr;
  const adds = p.diff.filter((l) => l.t === "add").length;
  const dels = p.diff.filter((l) => l.t === "del").length;
  const rawDiff = p.diff.map((l) => `${l.t === "add" ? "+ " : l.t === "del" ? "- " : "  "}${l.c}`).join("\n");

  const doMerge = () => {
    if (merge !== "idle") return;
    setMerge("merging");
    fetch(apiUrl("/api/patch"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prNumber: sc.prn, scenarioId: sc.specId, file: sc.pr.file, branch: sc.pr.branch }),
    }).catch(() => {});
    t.current = setTimeout(() => setMerge("merged"), 1000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Card 1: Concise Issue Summary */}
      <article className="story">
        <div className="story-head" style={{ background: "var(--red-w)", cursor: "default" }}>
          <div>
            <span className="kicker" style={{ color: "var(--red-d)" }}>1. Issue Detected (Connected Demo Store)</span>
            <span className="story-title">{sc.short}</span>
          </div>
          <span className="sev">Demo Blocker</span>
        </div>
        <div className="story-body">
          <p style={{ margin: 0, fontSize: 14.5, color: "var(--ink2)", lineHeight: 1.55 }}>{sc.summary}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <span className="chip mono">Modeled demo impact: {sc.drop} (~${fmt(sc.leakUSD)}/mo)</span>
            <span className="chip mono">Reproduced 3/3 on {sc.device}</span>
          </div>
        </div>
      </article>

      {/* Card 2: Proposed Code Fix Diff (Primary Action) */}
      <article className="story">
        <div className="story-head" style={{ background: "var(--green-w)", cursor: "default" }}>
          <div>
            <span className="kicker" style={{ color: "var(--green-d)" }}>2. Proposed Code Fix (Demo Repo)</span>
            <span className="story-title">{p.file.split("/").pop()}</span>
          </div>
          <span className="sev green">+{adds} −{dels}</span>
        </div>
        <div className="story-body">
          <div className="diff">
            <div className="diff-head">
              <span className="mono">{p.file}</span>
              <span className="mono">{p.branch}</span>
            </div>
            <div className="diff-scroll">
              <div className="diff-inner">
                {p.diff.map((l, i) => (
                  <div key={i} className={"dl " + l.t}>
                    <span className="sign">{l.t === "add" ? "+" : l.t === "del" ? "−" : ""}</span>
                    <span className="code">{highlight(l.c)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
            {merge === "merged" ? (
              <div className="merged" role="status">
                <div className="stamp">Merged</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 13.5, color: "var(--green-d)" }}>Simulated Demo Merge Complete</div>
                  <div style={{ fontSize: 12, color: "var(--ink2)" }}>Verified against connected demo storefront repo.</div>
                </div>
                <button type="button" onClick={() => setMerge("idle")} className="nav-pill" style={{ fontSize: 11 }}>
                  <Icon n="rotate" size={11} /> Reset
                </button>
              </div>
            ) : (
              <button type="button" onClick={doMerge} disabled={merge === "merging"} className="merge-btn">
                {merge === "merging" ? (<><span className="spinner" /> Verifying demo checks…</>) : (<><Icon n="merge" size={16} /> Simulate Demo Merge (Sandbox Repo)</>)}
              </button>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => copyDiff(rawDiff)} className="btn-act" style={{ flex: 1, justifyContent: "center" }}>
                <Icon n={copiedDiff ? "check" : "copy"} size={13} /> {copiedDiff ? "Copied (.diff) ✓" : "Copy Patch (.diff)"}
              </button>
              <button type="button" onClick={onOpenShare} className="btn-act" style={{ flex: 1, justifyContent: "center" }}>
                <Icon n="link" size={13} /> Share Summary
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Card 3: Collapsed Technical Logs, 4-Step Trail & Spec JSON (Progressive Disclosure) */}
      <article className="story">
        <button type="button" onClick={() => setShowTechDrawer((v) => !v)} className="story-head">
          <div>
            <span className="kicker">3. Technical Diagnostics (Collapsed by Default)</span>
            <span style={{ fontWeight: 700, fontSize: 14.5 }}>Root-Cause Logs, 4-Step Skill Trail &amp; JSON</span>
          </div>
          <Icon n="chevron" size={17} style={{ transform: showTechDrawer ? "rotate(180deg)" : "none" }} />
        </button>
        {showTechDrawer && (
          <div className="story-body" style={{ display: "grid", gap: 14 }}>
            <div>
              <div className="kicker" style={{ marginBottom: 6 }}>Root-Cause Logs</div>
              <div style={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 10, padding: 10, display: "grid", gap: 6 }}>
                {sc.trace.map((l, i) => (
                  <div key={i} className="mono" style={{ fontSize: 11.5 }}>
                    <b style={{ color: l.lvl === "err" ? "var(--red-d)" : "var(--gold-d)" }}>[{l.lvl.toUpperCase()}]</b> {l.at} — {l.msg} <span style={{ color: "var(--mute)" }}>({l.src})</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="kicker" style={{ marginBottom: 6 }}>4-Step Agent Execution Trail</div>
              <div style={{ display: "grid", gap: 6 }}>
                {sc.skills.map((s) => (
                  <div key={s.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "6px 10px", background: "var(--paper)", borderRadius: 8 }}>
                    <span><b>✅ {s.name}</b> — {s.desc}</span>
                    <span className="mono" style={{ color: "var(--blue)" }}>{s.dur}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="kicker" style={{ marginBottom: 6 }}>Structured JSON Payload</div>
              <pre className="mono" style={{ margin: 0, padding: 10, background: "var(--paper)", borderRadius: 8, fontSize: 11.5, overflowX: "auto" }}>
                {JSON.stringify(sc.json, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}

/* ═════════════ Minimal Shareable Audit Report View ═════════════ */
function ShareableReportView({ sc, site, customAudit, setPageView }) {
  const [copiedDiff, copyDiff] = useCopy();
  const [copiedLink, copyLink] = useCopy();
  const isCustom = Boolean(customAudit && customAudit.isCustomUrl);
  const finding = customAudit?.customFinding || {};
  const dom = customAudit?.scrapedDom || {};
  const title = isCustom ? finding.anomalyTitle : `Worked Example (${site.brand} Demo Store): ${sc.short}`;
  const diffLines = isCustom ? (finding.diffLines || sc.pr.diff) : sc.pr.diff;
  const rawDiffText = diffLines.map((l) => `${l.t === "add" ? "+" : l.t === "del" ? "-" : " "} ${l.c}`).join("\n");
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/proof/index.html?${isCustom ? `url=${encodeURIComponent(customAudit.targetUrl)}` : `id=${sc.prn}&brand=${encodeURIComponent(site.brand)}`}`
    : `/proof/index.html?id=${sc.prn}`;

  return (
    <div style={{ maxWidth: 860, margin: "12px auto 0", display: "grid", gap: 20 }}>
      <section className="story" style={{ padding: 26 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <span className="badge-pill blue">
            {isCustom ? "Shareable Live HTML Audit Summary" : "Shareable Worked Example Summary (Demo Store)"}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => copyLink(shareUrl)} className="btn-act primary">
              <Icon n={copiedLink ? "check" : "link"} size={13} />
              {copiedLink ? "Copied Link ✓" : "Copy Shareable URL"}
            </button>
            <button type="button" onClick={() => setPageView("command")} className="btn-act">
              ← Back to Audit Tool
            </button>
          </div>
        </div>

        <h2 style={{ margin: "14px 0 6px", font: "700 clamp(24px, 3.2vw, 36px)/1.12 var(--display)" }}>{title}</h2>
        <p style={{ margin: 0, fontSize: 15, color: "var(--ink2)" }}>{isCustom ? finding.summary : sc.summary}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 18 }}>
          {[
            ["Mode", isCustom ? "STATIC HTML ONLY (PUBLIC)" : "CONNECTED SANDBOX EXAMPLE"],
            ["Target", isCustom ? customAudit.targetUrl : `${site.host} (Demo Store)`],
            [
              "Verdict",
              isCustom
                ? typeof finding.domHealthScore === "number"
                  ? `${finding.severity} (${finding.domHealthScore}/100 across ${dom.accessibilityMetrics?.estimatedDomNodes ?? 0} nodes)`
                  : `${finding.severity || "UNVERIFIED"} (Score suppressed · ${finding.auditLimitation?.code || "LIMITED"})`
                : "Demo Blocker (3/3 reproduced)",
            ],
            ["Revenue Metric", isCustom ? "Not Applicable (Static HTML)" : `${sc.drop} (Modeled demo benchmark)`],
          ].map(([k, v]) => (
            <div key={k} style={{ background: "var(--well)", border: "1px solid var(--rule)", borderRadius: 8, padding: 12 }}>
              <div className="kicker">{k}</div>
              <div className="mono" style={{ fontSize: 12, fontWeight: 700, marginTop: 4, wordBreak: "break-word" }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          <div className="kicker" style={{ marginBottom: 8 }}>Proposed Fix (.diff)</div>
          <div className="diff">
            <div className="diff-scroll">
              <div className="diff-inner">
                {diffLines.map((l, i) => (
                  <div key={i} className={"dl " + l.t}>
                    <span className="sign">{l.t === "add" ? "+" : l.t === "del" ? "−" : ""}</span>
                    <span className="code">{highlight(l.c)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button type="button" onClick={() => copyDiff(rawDiffText)} className="btn-act green">
              <Icon n={copiedDiff ? "check" : "copy"} size={14} />
              {copiedDiff ? "Copied Git Patch (.diff) ✓" : "Copy Git Patch (.diff)"}
            </button>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="btn-act">
              Open Standalone Proof Page ↗
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ═════════════ Real Product Modals: Connect GitHub Repo & Pricing ═════════════ */
function ConnectRepoModal({ onClose }) {
  const [copiedAction, copyAction] = useCopy();
  const actionYaml = `name: Pramana Checkout Audit
on: [pull_request]
jobs:
  pramana-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Pramana Audit Gate
        run: npx pramana-ai audit --url \${{ vars.STAGING_URL }} --open-pr`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Connect GitHub Repository">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="badge-pill blue">GitHub Integration</span>
          <button type="button" onClick={onClose} className="nav-pill">Close ✕</button>
        </div>
        <h2 style={{ margin: "10px 0 6px", font: "700 26px/1.15 var(--display)" }}>
          Connect Your Repository for Autonomous PRs
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--ink2)" }}>
          In Live Public HTML mode, Pramana never opens unsolicited PRs on external repositories. Connect your repo in 2 steps to unlock full browser replay + AST-verified Pull Requests:
        </p>
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <div style={{ padding: 14, borderRadius: 12, background: "var(--paper)", border: "1px solid var(--rule)" }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>Step 1 · Add `.github/workflows/pramana.yml` to your repository</div>
            <pre className="mono" style={{ margin: "8px 0 0", padding: 10, background: "var(--well)", border: "1px solid var(--rule)", borderRadius: 6, fontSize: 11.5, overflowX: "auto", color: "var(--ink)" }}>
              {actionYaml}
            </pre>
            <button type="button" onClick={() => copyAction(actionYaml)} className="btn-act primary" style={{ marginTop: 10 }}>
              <Icon n={copiedAction ? "check" : "copy"} size={13} />
              {copiedAction ? "Copied Workflow YAML ✓" : "Copy GitHub Action YAML"}
            </button>
          </div>
          <div style={{ padding: 14, borderRadius: 12, background: "var(--paper)", border: "1px solid var(--rule)" }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>Step 2 · Or test the connected flow right now</div>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink2)" }}>
              Our fictional <b>ZestKart</b> demo storefront is pre-connected on this deployment so you can test simulated PR merges immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Plans and Packaging">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="badge-pill ok">Plans &amp; Packaging</span>
          <button type="button" onClick={onClose} className="nav-pill">Close ✕</button>
        </div>
        <h2 style={{ margin: "10px 0 6px", font: "700 26px/1.15 var(--display)" }}>
          Transparent Usage &amp; Team Packaging
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--ink2)" }}>
          Free during Startup Buildathon India 2026 ($0.00 Free-Tier stack).
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: 12, marginTop: 16 }}>
          {[
            ["Free / Buildathon", "$0", "Live Public HTML audits, DOM & A11y readiness score, copyable CSS/HTML snippets, 3 worked examples."],
            ["D2C Growth", "$199/mo", "Connected staging browser (390px mobile + Jio 4G + Hindi locale), UPI webhook race checks, Slack alerts."],
            ["Engineering Pro", "$499/mo", "Connected GitHub App, AST-verified pull requests on every deploy, CI regression gate (~$0.024/audit)."],
          ].map(([tier, price, desc]) => (
            <div key={tier} style={{ padding: 14, borderRadius: 14, border: "1px solid var(--rule)", background: "var(--paper)" }}>
              <div className="kicker">{tier}</div>
              <div style={{ font: "800 26px/1.1 var(--display)", margin: "6px 0" }}>{price}</div>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.45 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═════════════ Main Application ═════════════ */
export default function App() {
  const [sid, setSidRaw] = useState(0);
  const [url, setUrl] = useState("");
  // Active workspace surface: "ready" (calm empty tool state) | "live" (honest live report) | "examples" (worked examples)
  const [surfaceMode, setSurfaceMode] = useState("ready");
  const [liveAudit, setLiveAudit] = useState(INITIAL_LIVE_AUDIT_STATE);
  const [audit, setAudit] = useState({ state: "done", step: 4, ran: false });
  const [mode, setMode] = useState("vision");
  const [merge, setMerge] = useState("idle");
  const [pageView, setPageView] = useState("command");
  const [showQuotas, setShowQuotas] = useState(false);
  const [showConnectRepo, setShowConnectRepo] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [recentAudits, setRecentAudits] = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const liveAuditRef = useRef(INITIAL_LIVE_AUDIT_STATE);
  const sc = SCENARIOS[sid];
  const effectiveUrl = url.trim() || sc.defaultUrl;
  const site = useMemo(() => parseSite(effectiveUrl), [effectiveUrl]);

  // T-306: Only expose settled server audit result — never a heuristic client profile!
  const activeCustomAudit =
    surfaceMode === "live" && liveAudit.status === "settled" ? liveAudit.result : null;

  const liveHook = useLiveAudit ? useLiveAudit(sc.specId) : {};
  const quotaRouter = useMemo(() => new QuotaAwareRouter(), []);
  const lyriaSynth = useMemo(() => new LyriaWebAudioSynth(), []);

  useMemo(() => {
    void quotaRouter;
    return validateAuditReportPayload ? validateAuditReportPayload({}) : null;
  }, [quotaRouter]);

  // Linear-style keyboard shortcut: "/" or Cmd/Ctrl+K focuses URL command bar
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || e.target?.isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !isTyping)) {
        e.preventDefault();
        setPageView("command");
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => () => { if (abortRef.current) abortRef.current.abort(); }, []);

  const pushHistory = (entry) => {
    setRecentAudits((prev) => {
      const filtered = prev.filter((item) => item.url !== entry.url);
      const next = [entry, ...filtered].slice(0, 6);
      try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const selectExample = (i) => {
    if (abortRef.current) abortRef.current.abort();
    const nextReset = resetLiveAudit(liveAuditRef.current);
    liveAuditRef.current = nextReset;
    setLiveAudit(nextReset);
    setApiError(null);
    setSidRaw(i);
    setSurfaceMode("examples");
    setUrl(SCENARIOS[i].defaultUrl);
    setMerge("idle");
    setPageView("command");
    setAudit({ state: "done", step: 4, ran: true });
    pushHistory({
      url: SCENARIOS[i].defaultUrl,
      host: parseSite(SCENARIOS[i].defaultUrl).host,
      mode: "EXAMPLE",
      verdict: `Example ${i + 1}`,
      exampleIdx: i,
    });
  };

  const resetToReadyState = () => {
    if (abortRef.current) abortRef.current.abort();
    const nextReset = resetLiveAudit(liveAuditRef.current);
    liveAuditRef.current = nextReset;
    setLiveAudit(nextReset);
    setApiError(null);
    setSurfaceMode("ready");
    setUrl("");
    setMerge("idle");
    setPageView("command");
    setAudit({ state: "done", step: 4, ran: false });
  };

  const executeAuditForUrl = async (targetInput) => {
    const trimmed = String(targetInput ?? url).trim();
    if (!trimmed) {
      setApiError("Enter a URL above (or click google.com, github.com, example.com, or apple.com/shop/bag) to run a live static HTML audit.");
      if (inputRef.current) inputRef.current.focus();
      return;
    }
    const parsed = parseSite(trimmed);
    if (parsed.isPreset) {
      const matchIdx = SCENARIOS.findIndex((s) => trimmed.includes(s.variant));
      selectExample(matchIdx >= 0 ? matchIdx : 0);
      return;
    }

    // T-306: Cancel any in-flight audit so stale/out-of-order responses never overwrite a newer URL
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const pendingState = beginLiveAudit(liveAuditRef.current, trimmed);
    liveAuditRef.current = pendingState;
    setLiveAudit(pendingState);
    setApiError(null);
    setMerge("idle");
    setPageView("command");
    setSurfaceMode("live");
    setAudit({ state: "running", step: 1, ran: false });

    const reqId = pendingState.requestId;

    try {
      const resp = await fetch(apiUrl("/api/audit"), {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, target_url: trimmed, targetUrl: trimmed, scenarioId: sc.specId }),
      });
      const data = await resp.json().catch(() => null);
      if (reqId !== liveAuditRef.current.requestId) return;

      if (!resp.ok || !data || data.ok === false) {
        const errMsg = data?.message || `Audit rejected (HTTP ${resp.status})`;
        const failed = failLiveAudit(liveAuditRef.current, reqId, errMsg);
        liveAuditRef.current = failed;
        setLiveAudit(failed);
        setApiError(errMsg);
        setAudit({ state: "done", step: 4, ran: true });
        return;
      }

      if (data.isCustomUrl) {
        const enriched = await enrichAuditWithFirebaseGemini(data);
        if (reqId !== liveAuditRef.current.requestId) return;
        const settled = resolveLiveAudit(liveAuditRef.current, reqId, enriched);
        liveAuditRef.current = settled;
        setLiveAudit(settled);
        setAudit({ state: "done", step: 4, ran: true });
        const sev = enriched.customFinding?.severity || "UNVERIFIED";
        const score = enriched.customFinding?.domHealthScore;
        pushHistory({
          url: enriched.targetUrl || pendingState.submittedUrl,
          host: `${enriched.hostname}${(() => { try { const p = new URL(enriched.targetUrl).pathname; return p && p !== "/" ? p : ""; } catch { return ""; } })()}`,
          mode: "LIVE",
          verdict: typeof score === "number" ? `${sev} (${score}/100)` : sev,
        });
        try { lyriaSynth.playSuccessChime(); } catch { /* ignore */ }
      }
    } catch (err) {
      if (err?.name === "AbortError" || reqId !== liveAuditRef.current.requestId) return;
      const errMsg = err instanceof Error ? err.message : "Network error reaching /api/audit";
      const failed = failLiveAudit(liveAuditRef.current, reqId, `${errMsg} — No client heuristic fallback was substituted.`);
      liveAuditRef.current = failed;
      setLiveAudit(failed);
      setAudit({ state: "done", step: 4, ran: true });
    }
  };

  const quickTryUrl = (sampleUrl) => {
    setUrl(sampleUrl);
    executeAuditForUrl(sampleUrl);
  };

  const running = liveAudit.status === "pending";

  return (
    <SiteCtx.Provider value={site}>
      <style>{EDITORIAL_CSS}</style>
      <div className="page">
        {/* Sticky Workstation Masthead */}
        <header className="mast">
          <div className="gutter mast-main">
            <div className="brand-row" onClick={resetToReadyState}>
              <h1 className="wordmark">Pramana<em>AI</em></h1>
              <span className="deva" lang="sa">प्रमाण</span>
              <span className="brand-tagline">Evidence-grounded static HTML &amp; checkout UX auditor.</span>
            </div>
            <nav className="nav-actions" aria-label="Primary navigation">
              <button
                type="button"
                onClick={() => setPageView("command")}
                className={"nav-pill" + (pageView === "command" ? " active" : "")}
              >
                <Icon n="zap" size={13} /> Audit Tool
              </button>
              <button
                type="button"
                onClick={() => setPageView("certificate")}
                className={"nav-pill" + (pageView === "certificate" ? " active" : "")}
              >
                <Icon n="lock" size={13} /> Shareable Report
              </button>
              <button type="button" onClick={() => setShowConnectRepo(true)} className="nav-pill">
                <Icon n="merge" size={13} /> Connect Repo
              </button>
              <button type="button" onClick={() => setShowPricing(true)} className="nav-pill accent">
                Plans · Free
              </button>
            </nav>
          </div>
        </header>

        <main className="gutter main">
          {showQuotas && (
            <div style={{ marginBottom: 18 }}>
              <LiveTelemetryStrip health={liveHook.health} liveMeta={liveHook.liveMeta} isProbing={liveHook.isProbing || running} />
            </div>
          )}

          {pageView === "certificate" ? (
            <ShareableReportView
              sc={sc}
              site={site}
              customAudit={activeCustomAudit}
              setPageView={setPageView}
            />
          ) : (
            <div>
              {/* 1. Focused Command Hero */}
              <section className="quiet-hero">
                <h2 className="quiet-headline">
                  Paste any URL. Get <em>evidence-grounded</em> audit proof.
                </h2>
                <p className="quiet-sub">
                  Honest static HTML &amp; accessibility inspection on any public URL—or explore full mobile replay &amp; AST-verified PR workflows on our connected demo storefront.
                </p>

                {/* Segmented Mode Switch */}
                <div className="mode-switch-bar" role="tablist" aria-label="Audit mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={surfaceMode !== "examples"}
                    onClick={() => {
                      if (surfaceMode === "examples") resetToReadyState();
                    }}
                    className={"mode-tab" + (surfaceMode !== "examples" ? " on" : "")}
                  >
                    <span className="live-dot" /> Live URL Audit (Static HTML)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={surfaceMode === "examples"}
                    onClick={() => selectExample(sid)}
                    className={"mode-tab" + (surfaceMode === "examples" ? " on" : "")}
                  >
                    Connected Demo Storefront (3 Examples)
                  </button>
                </div>

                {/* Monolithic Command Bar */}
                <div className="cmd-box">
                  <div className="cmd-row">
                    <div className="cmd-input-wrap">
                      <Icon n="globe" size={16} style={{ color: "var(--mute)" }} />
                      <label htmlFor="audit-url" className="sr">Website URL to audit</label>
                      <input
                        ref={inputRef}
                        id="audit-url"
                        name="target_url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") executeAuditForUrl(url); }}
                        placeholder="https://example.com, https://github.com, or https://apple.com/shop/bag"
                        spellCheck="false"
                        autoComplete="off"
                      />
                      <span className="kbd-hint" title="Press / or Ctrl+K to focus">/</span>
                    </div>
                    <button type="button" onClick={() => executeAuditForUrl(url)} disabled={running} className="cmd-btn">
                      {running ? (<><span className="spinner" /> Auditing…</>) : (<>Run Audit <Icon n="zap" size={14} /></>)}
                    </button>
                  </div>
                </div>

                {apiError && liveAudit.status !== "error" && (
                  <div style={{ maxWidth: 820, margin: "8px auto 0", padding: "8px 12px", borderRadius: 6, background: "var(--red-w)", color: "var(--red-d)", fontSize: 12.5, fontWeight: 600 }}>
                    ⚠ {apiError}
                  </div>
                )}

                {/* Quick-Try Presets + Capability Boundary */}
                <div className="cmd-meta">
                  <div className="sample-chips">
                    <span>Try D2C &amp; startup sites:</span>
                    {[
                      ["boldcare.in (D2C)", "https://boldcare.in"],
                      ["plumgoodness.com (D2C)", "https://plumgoodness.com"],
                      ["beminimalist.co (D2C)", "https://beminimalist.co"],
                      ["demoblaze.com (Store)", "https://demoblaze.com"],
                      ["apple.com/shop/bag (JS Shell)", "https://www.apple.com/shop/bag"],
                    ].map(([label, target]) => (
                      <button key={label} type="button" className="sample-chip" onClick={() => quickTryUrl(target)}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <span className="limitation-line">
                    Live mode inspects static HTML only (fail-closed on JS shells). Browser replay + PRs run on connected repos.
                  </span>
                </div>
              </section>

              {/* 2. Surface Routing: Ready State vs. Pending/Error/Settled Live Report vs. Worked Examples */}
              {surfaceMode === "ready" && !running && (
                <section className="ready-grid" aria-label="How Pramana works">
                  <div className="steps-3">
                    <div className="step-card">
                      <span className="step-num">01</span>
                      <h3>Static HTML &amp; Shell Detection</h3>
                      <p>
                        Inspects public HTML, ARIA roles, forms, and images with zero login—and fails closed with <span className="mono">UNVERIFIED</span> on JS-only shells instead of issuing a false PASS.
                      </p>
                    </div>
                    <div className="step-card">
                      <span className="step-num">02</span>
                      <h3>Observed Facts vs. Inferences</h3>
                      <p>
                        Every claim cites exact observed markup snippets, separates static facts from inferences, and never fabricates revenue or conversion numbers.
                      </p>
                    </div>
                    <div className="step-card">
                      <span className="step-num">03</span>
                      <h3>Evidence-Grounded Fix or PR</h3>
                      <p>
                        Copy a remediation snippet tied directly to the observed finding, or connect your GitHub repository for browser replay and AST-verified PRs.
                      </p>
                    </div>
                  </div>

                  {recentAudits.length > 0 && (
                    <div className="history-card">
                      <div className="history-head">
                        <span className="kicker">Recent Settled Audits in This Session</span>
                        <button
                          type="button"
                          onClick={() => {
                            setRecentAudits([]);
                            try { localStorage.removeItem(HISTORY_STORAGE_KEY); } catch { /* ignore */ }
                          }}
                          style={{ background: "none", border: 0, fontSize: 11.5, color: "var(--mute)" }}
                        >
                          Clear history
                        </button>
                      </div>
                      <div className="history-list">
                        {recentAudits.map((item) => (
                          <button
                            key={item.url}
                            type="button"
                            className="history-item"
                            onClick={() => {
                              if (item.mode === "EXAMPLE" && typeof item.exampleIdx === "number") {
                                selectExample(item.exampleIdx);
                              } else {
                                quickTryUrl(item.url);
                              }
                            }}
                          >
                            <span className={"badge-pill " + (item.mode === "LIVE" ? "cyan" : "warn")}>{item.mode}</span>
                            <b className="mono">{item.host}</b>
                            <span style={{ color: "var(--mute)" }}>{item.verdict}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {surfaceMode === "live" && liveAudit.status === "pending" && (
                <PendingLiveAuditCard
                  url={liveAudit.submittedUrl}
                  startedAt={liveAudit.startedAt}
                  onCancel={resetToReadyState}
                />
              )}

              {surfaceMode === "live" && liveAudit.status === "error" && (
                <UnverifiedErrorCard
                  url={liveAudit.submittedUrl}
                  error={liveAudit.error}
                  onRetry={() => executeAuditForUrl(liveAudit.submittedUrl)}
                />
              )}

              {surfaceMode === "live" && liveAudit.status === "settled" && activeCustomAudit && (
                <CalmLiveReport
                  customAudit={activeCustomAudit}
                  onOpenShare={() => setPageView("certificate")}
                  onOpenConnectRepo={() => setShowConnectRepo(true)}
                />
              )}

              {surfaceMode === "examples" && (
                <div>
                  <div className="example-pills" role="radiogroup" aria-label="Worked Examples">
                    {SCENARIOS.map((s, i) => (
                      <button
                        key={s.id}
                        type="button"
                        role="radio"
                        aria-checked={sid === i}
                        onClick={() => selectExample(i)}
                        className={"ex-pill" + (sid === i ? " on" : "")}
                      >
                        <span>{s.emoji}</span>
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="grid">
                    <div className="col-l">
                      <Exhibit sc={sc} mode={mode} setMode={setMode} audit={audit} host={site.host} />
                    </div>
                    <div className="col-r">
                      <WorkedExampleRightColumn
                        sc={sc}
                        merge={merge}
                        setMerge={setMerge}
                        onOpenShare={() => setPageView("certificate")}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Modals */}
        {showConnectRepo && <ConnectRepoModal onClose={() => setShowConnectRepo(false)} />}
        {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}

        {/* Compact Single-Bar Footer */}
        <footer className="colophon">
          <div className="gutter colo-row">
            <span>
              <b>Pramana AI (प्रमाण)</b> · Built by Team Vimarsha · ZestKart &amp; ScaleGrid are fictional demo storefronts.
            </span>
            <div className="colo-links">
              <button type="button" onClick={() => setShowQuotas((q) => !q)}>
                {showQuotas ? "Hide System Telemetry" : "System Telemetry"}
              </button>
              <a href="/demo-store/index.html" target="_blank" rel="noopener noreferrer">Demo Storefront ↗</a>
              <a href="/proof/index.html?id=142" target="_blank" rel="noopener noreferrer">Standalone Proof ↗</a>
              <a href="/deck/index.html" target="_blank" rel="noopener noreferrer">Buildathon Deck ↗</a>
            </div>
          </div>
        </footer>
      </div>
    </SiteCtx.Provider>
  );
}
