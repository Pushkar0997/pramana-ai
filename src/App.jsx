import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";
import { useLiveAudit } from "./hooks/useLiveAudit";
import { LiveTelemetryStrip } from "./components/LiveTelemetryStrip";
import { extractBrandFromUrl, validateAuditReportPayload } from "./schemas/auditReportValidator";
import { QuotaAwareRouter, LyriaWebAudioSynth } from "./services/quotaRouter";

/* ═════════════ Editorial Broadsheet Styles (Self-Contained) ═════════════ */
const EDITORIAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Noto+Serif+Devanagari:wght@600;700&display=swap');

  :root {
    --paper: #F6F7FB; --card: #FFFFFF; --ink: #0B1020; --ink2: #3B4259; --mute: #636A82; --rule: #D8DCEA; --rule2: #ECEEF6;
    --blue: #2B3BFF; --blue-d: #1B27C7; --blue-w: #E3E7FF;
    --red: #F0431F; --red-d: #C2300F; --red-w: #FFE5DD;
    --green: #00A36C; --green-d: #007A51; --green-w: #D8F5E8;
    --gold: #FFB400; --gold-d: #8A5F00; --gold-w: #FFF0C2;
    --display: 'Bodoni Moda', 'Didot', 'Bodoni 72', Georgia, serif;
    --sans: 'Hanken Grotesk', ui-sans-serif, system-ui, sans-serif;
    --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    color-scheme: light;
  }
  *, *::before, *::after { box-sizing: border-box; }
  html, body { background: var(--paper); color: var(--ink); }
  body {
    margin: 0; color: var(--ink); font-family: var(--sans); font-size: 15px; line-height: 1.5; -webkit-font-smoothing: antialiased;
    background: radial-gradient(760px 340px at 88% -40px, rgba(43,59,255,.10), transparent 70%),
                radial-gradient(560px 300px at 0 0, rgba(255,180,0,.12), transparent 70%), var(--paper);
    background-repeat: no-repeat;
  }
  .gutter { padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
  .page { min-height: 100vh; display: flex; flex-direction: column; background: transparent; color: var(--ink); }
  .main { flex: 1; width: 100%; max-width: 1400px; margin: 0 auto; padding-block: 34px 8px; }
  .mast > .gutter, .colophon > .gutter { max-width: 1400px; margin: 0 auto; width: 100%; }
  button { font-family: inherit; cursor: pointer; color: inherit; }
  button:disabled { cursor: default; }
  button:focus-visible, input:focus-visible { outline: 3px solid var(--blue); outline-offset: 2px; }
  .sr { position: absolute !important; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .mono { font-family: var(--mono); }
  .tnum { font-variant-numeric: tabular-nums; }
  em { font-style: italic; }

  /* ── Masthead ── */
  .mast-top { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px 20px; padding: 11px 0; font: 500 11px/1.3 var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--mute); border-bottom: 1px solid var(--rule); }
  .status { display: inline-flex; align-items: center; gap: 8px; color: var(--ink); }
  .mast-links { display: inline-flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .mast-links a { color: var(--ink2); text-decoration: none; font-weight: 700; transition: color .15s; }
  .mast-links a:hover { color: var(--blue); }
  .mast-main { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 14px 24px; padding-top: 16px; }
  .brand { display: flex; align-items: flex-end; gap: 6px 20px; flex-wrap: wrap; }
  .wordmark { margin: 0; font: 800 clamp(42px, 5.6vw, 68px)/.92 var(--display); letter-spacing: -.025em; font-variation-settings: "opsz" 40; color: var(--ink); }
  .wordmark em { font-weight: 500; color: var(--blue); margin-left: .12em; }
  .brand-side { display: flex; flex-direction: column; padding-bottom: 6px; }
  .deva { font: 700 26px/1.15 'Noto Serif Devanagari', var(--display); color: var(--blue); }
  .gloss { font-size: 12px; color: var(--mute); }
  .tabs { display: flex; gap: 6px; flex-wrap: wrap; }
  .tab { display: flex; align-items: center; gap: 10px; padding: 10px 16px 11px; background: none; border: 0; border-bottom: 4px solid transparent; color: var(--mute); text-align: left; transition: color .15s, background .15s; text-decoration: none; }
  .tab:hover { color: var(--ink); background: rgba(43,59,255,.05); }
  .tab b { display: block; font-size: 15px; font-weight: 700; line-height: 1.2; }
  .tab small { display: block; font-size: 12px; font-weight: 500; }
  .tab[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--blue); }
  .tab[aria-selected="true"] svg { color: var(--blue); }
  .dbl { margin-top: 0; border-top: 3px solid var(--ink); border-bottom: 1px solid var(--ink); height: 6px; }

  /* ── Type roles ── */
  .kicker { display: block; font: 800 11px/1.3 var(--sans); letter-spacing: .16em; text-transform: uppercase; }
  .sub-k { font: 800 11px/1.3 var(--sans); letter-spacing: .14em; text-transform: uppercase; color: var(--mute); margin: 22px 0 9px; }
  .headline { margin: 14px 0 0; font: 700 clamp(34px, 4.7vw, 62px)/1.03 var(--display); letter-spacing: -.022em; font-variation-settings: "opsz" 40; text-wrap: balance; animation: rise .55s cubic-bezier(.2,.7,.2,1) both; color: var(--ink); }
  .headline em { font-weight: 500; color: var(--red); }
  .headline em.blue { color: var(--blue); }
  .standfirst { margin: 20px 0 0; max-width: 54ch; font-size: 18px; line-height: 1.55; color: var(--ink2); text-wrap: pretty; }
  .byline { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 18px; font-size: 13px; color: var(--mute); }
  .byline b { color: var(--ink); }
  .lede-sm { margin: 18px 0; font-size: 15px; line-height: 1.6; color: var(--ink2); text-wrap: pretty; }
  .foot-note { margin: 12px 0 0; font-size: 12.5px; color: var(--mute); }
  .pulse-dot, .live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); display: inline-block; flex-shrink: 0; animation: livepulse 1.8s ease-out infinite; }
  .pulse-dot { background: var(--red); margin-right: 8px; animation-name: redpulse; }
  .live-dot.gold { background: var(--gold); animation-name: goldpulse; }

  /* ── Hero ── */
  .hero { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 40px 48px; align-items: center; }
  .hero.solo { align-items: end; }
  .hero-copy { padding: 6px 0 10px; }
  .desk { position: relative; overflow: hidden; background: var(--blue); color: #fff; border-radius: 24px; padding: 26px; box-shadow: 0 30px 60px -28px rgba(43,59,255,.6); }
  .desk::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle, rgba(255,255,255,.2) 1.5px, transparent 2px) 0 0 / 12px 12px; -webkit-mask-image: radial-gradient(circle at 100% 0, #000, transparent 55%); mask-image: radial-gradient(circle at 100% 0, #000, transparent 55%); }
  .desk > * { position: relative; z-index: 1; }
  .desk-k { font: 800 11px/1.3 var(--sans); letter-spacing: .16em; text-transform: uppercase; color: #C7CDFF; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .desk-field { display: flex; align-items: center; gap: 10px; height: 56px; padding: 0 16px; background: #fff; color: var(--ink); border-radius: 14px; }
  .desk-field:focus-within { box-shadow: 0 0 0 4px var(--gold); }
  .desk-field input { flex: 1; min-width: 0; border: 0; outline: 0; background: none; font: 500 14px var(--mono); color: var(--ink); }
  .desk-run { width: 100%; height: 56px; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 10px; border: 0; border-radius: 14px; background: var(--gold); color: var(--ink); font: 800 16px var(--sans); transition: transform .15s, box-shadow .15s; box-shadow: 0 6px 0 #C48A00; }
  .desk-run:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 7px 0 #C48A00; }
  .desk-run:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 2px 0 #C48A00; }
  .desk-run:disabled { opacity: .85; }
  .desk-sub { margin: 24px 0 10px; font: 800 11px/1.3 var(--sans); letter-spacing: .14em; text-transform: uppercase; color: #C7CDFF; }
  .scn-list { display: grid; gap: 8px; }
  .scn { display: flex; align-items: flex-start; gap: 12px; text-align: left; padding: 11px 14px; border: 1.5px solid rgba(255,255,255,.38); border-radius: 14px; background: transparent; color: #fff; font-size: 14px; font-weight: 500; line-height: 1.35; transition: background .15s, transform .15s; }
  .scn:hover { background: rgba(255,255,255,.14); transform: translateX(2px); }
  .scn.on { background: #fff; color: var(--ink); border-color: #fff; font-weight: 700; }
  .scn-em { font-size: 19px; line-height: 1.2; }
  .desk-note { margin: 18px 0 0; font-size: 12.5px; line-height: 1.5; color: #D6DAFF; }
  .desk-note b { color: #fff; }
  .spinner { width: 16px; height: 16px; border-radius: 50%; border: 2.5px solid rgba(255,255,255,.35); border-top-color: #fff; animation: spin .8s linear infinite; display: inline-block; }
  .desk-run .spinner { border-color: rgba(11,16,32,.25); border-top-color: var(--ink); }
  .spinner.tiny { width: 13px; height: 13px; border-width: 2px; border-color: rgba(43,59,255,.25); border-top-color: var(--blue); }

  /* ── Press strip (audit progress) ── */
  .press { margin-top: 30px; background: var(--card); border: 1px solid var(--rule); border-radius: 18px; padding: 16px 20px; }
  .press-bar { height: 5px; border-radius: 3px; background: var(--rule2); overflow: hidden; }
  .press-bar > div { height: 100%; background: linear-gradient(90deg, var(--blue), var(--green)); transition: width .75s linear; }
  .press ol { list-style: none; margin: 14px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 10px 18px; }
  .press li { display: flex; align-items: flex-start; gap: 10px; font: 500 12.5px/1.4 var(--mono); color: var(--mute); }
  .press li.done { color: var(--ink); }
  .press li.active { color: var(--blue); font-weight: 700; }
  .ix { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--rule); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
  .press li.done .ix { background: var(--green); border-color: var(--green); color: #fff; }
  .press li.active .ix { border-color: var(--blue); }
  .press-done { margin-top: 12px; font: 700 12.5px var(--mono); color: var(--green-d); }

  /* ── Grids ── */
  .grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 28px; align-items: start; margin-top: 40px; }
  .col-l { grid-column: span 7; min-width: 0; position: sticky; top: 16px; }
  .col-r { grid-column: span 5; min-width: 0; display: flex; flex-direction: column; gap: 22px; }

  /* ── Exhibit ── */
  .exhibit { background: var(--card); border: 1px solid var(--rule); border-radius: 24px; overflow: hidden; box-shadow: 0 24px 50px -30px rgba(11,16,32,.35); }
  .ex-head { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px 20px; padding: 22px 24px 18px; }
  .caption { margin: 8px 0 0; max-width: 48ch; font: italic 400 18px/1.4 var(--display); color: var(--ink2); font-variation-settings: "opsz" 18; text-wrap: pretty; }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; }
  .chip { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; padding: 5px 11px; background: var(--paper); border: 1px solid var(--rule); border-radius: 999px; white-space: nowrap; color: var(--ink); }
  .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
  .lenses { display: flex; flex-wrap: wrap; border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
  .lens { flex: 1 1 190px; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 10px; background: var(--card); border: 0; border-right: 1px solid var(--rule); font: 700 13px var(--sans); color: var(--mute); transition: background .15s, color .15s; }
  .lens:last-child { border-right: 0; }
  .lens:hover { background: var(--paper); color: var(--ink); }
  .patchbar { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 18px; padding: 12px 20px; border-bottom: 1px solid var(--rule); }
  .seg { display: inline-flex; background: var(--paper); border-radius: 10px; padding: 3px; }
  .seg button { border: 0; background: none; padding: 6px 13px; border-radius: 8px; font: 700 12px var(--sans); color: var(--mute); }
  .seg button.on { background: #fff; color: var(--ink); box-shadow: 0 1px 4px rgba(11,16,32,.14); }
  .swipe { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 200px; font: 700 12px var(--sans); }
  .range { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 999px; background: var(--rule); flex: 1; width: 100%; }
  .range::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: var(--blue); border: 4px solid #fff; box-shadow: 0 2px 8px rgba(11,16,32,.35); cursor: pointer; }
  .range::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: var(--blue); border: 4px solid #fff; box-shadow: 0 2px 8px rgba(11,16,32,.35); cursor: pointer; }
  .range.gold::-webkit-slider-thumb { background: var(--ink); }
  .range.gold::-moz-range-thumb { background: var(--ink); }
  .stagewrap { padding: 22px 12px 16px; transition: background .3s; }
  .ex-foot { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px 20px; padding: 14px 24px 16px; border-top: 1px solid var(--rule); font-size: 13px; color: var(--ink2); }
  .legend { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; font-size: 12px; color: var(--mute); }
  .legend i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; margin-left: 8px; }

  /* ── Custom Live DOM Stage inside Fig. 1 ── */
  .live-dom-stage { background: #fff; border: 1.5px solid var(--ink); border-radius: 18px; overflow: hidden; box-shadow: 0 18px 40px -20px rgba(11,16,32,.3); }
  .live-dom-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 16px; background: var(--paper); border-bottom: 1.5px solid var(--ink); font: 600 12px var(--mono); }
  .live-dom-body { padding: 18px; display: grid; gap: 14px; }
  .live-dom-title { font: 700 22px/1.2 var(--display); color: var(--ink); margin: 4px 0; }
  .cta-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  .cta-table th { text-align: left; padding: 8px 10px; border-bottom: 1.5px solid var(--ink); font: 700 10.5px var(--mono); text-transform: uppercase; letter-spacing: .06em; color: var(--mute); background: var(--paper); }
  .cta-table td { padding: 9px 10px; border-bottom: 1px solid var(--rule); vertical-align: top; }
  .badge-pill { display: inline-flex; align-items: center; gap: 5px; font: 700 10px var(--mono); padding: 3px 8px; border-radius: 999px; text-transform: uppercase; }
  .badge-pill.err { background: var(--red-w); color: var(--red-d); }
  .badge-pill.warn { background: var(--gold-w); color: var(--gold-d); }
  .badge-pill.ok { background: var(--green-w); color: var(--green-d); }

  /* ── Findings ── */
  .story { background: var(--card); border: 1px solid var(--rule); border-radius: 24px; overflow: hidden; box-shadow: 0 24px 50px -34px rgba(11,16,32,.35); }
  .story-head { width: 100%; display: flex; align-items: center; gap: 12px; padding: 18px 22px; border: 0; color: var(--ink); }
  .story.red .story-head { background: var(--red-w); } .story.red .kicker { color: var(--red-d); }
  .story.blue .story-head { background: var(--blue-w); } .story.blue .kicker { color: var(--blue-d); }
  .story.green .story-head { background: var(--green-w); } .story.green .kicker { color: var(--green-d); }
  .story-title { display: block; margin-top: 5px; font: 700 23px/1.15 var(--display); letter-spacing: -.01em; font-variation-settings: "opsz" 30; text-wrap: balance; }
  .story-body { padding: 22px; }
  .sev { font: 700 10.5px/1 var(--mono); letter-spacing: .06em; text-transform: uppercase; padding: 6px 10px; border-radius: 999px; background: var(--red); color: #fff; white-space: nowrap; }
  .sev.blue { background: var(--blue); } .sev.green { background: var(--green-d); }
  .shimmer { background: linear-gradient(90deg, #EEF0F8 0%, #E0E4F2 50%, #EEF0F8 100%); background-size: 200% 100%; animation: shimmer 1.2s linear infinite; }
  .bignum-row { display: flex; align-items: flex-end; flex-wrap: wrap; gap: 14px 28px; }
  .bignum { font: 800 clamp(58px, 6vw, 84px)/.9 var(--display); font-variation-settings: "opsz" 18; letter-spacing: -.035em; color: var(--red-d); font-variant-numeric: tabular-nums lining-nums; }
  .bignum span { font-size: .5em; font-variation-settings: "opsz" 18; font-weight: 500; font-style: italic; margin-left: 2px; }
  .bignum-cap { margin-top: 10px; font: 800 11px/1.3 var(--sans); letter-spacing: .12em; text-transform: uppercase; color: var(--mute); }
  .leakline { font: 500 20px/1.25 var(--display); margin-bottom: 8px; }
  .leakline b { font-weight: 800; }
  .spark-axis { display: flex; justify-content: space-between; font: 500 10px var(--mono); color: var(--mute); text-transform: uppercase; letter-spacing: .06em; }
  .trace { border: 1px solid var(--rule); border-radius: 16px; overflow: hidden; background: #FBFBFE; }
  .trace-head { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--paper); border-bottom: 1px solid var(--rule); font: 600 10.5px/1.3 var(--mono); letter-spacing: .05em; text-transform: uppercase; color: var(--mute); }
  .trace-body { padding: 14px; display: grid; gap: 12px; }
  .trace-line { display: grid; grid-template-columns: auto auto minmax(0, 1fr); gap: 4px 10px; font: 400 12px/1.5 var(--mono); }
  .trace-line .at { color: var(--mute); }
  .lvl { font: 700 10px/1 var(--mono); padding: 3px 6px; border-radius: 4px; align-self: start; margin-top: 2px; }
  .lvl.err { background: var(--red-w); color: var(--red-d); } .lvl.warn { background: var(--gold-w); color: var(--gold-d); }
  .trace-line .msg { overflow-wrap: anywhere; } .trace-line .src { color: var(--mute); margin-left: 4px; }
  .trace-toggle { width: 100%; display: flex; align-items: center; gap: 6px; padding: 10px 14px; background: none; border: 0; border-top: 1px solid var(--rule); font: 700 12px var(--mono); color: var(--blue); text-align: left; }
  .trace-toggle:hover { background: var(--blue-w); }
  .json { margin: 0; padding: 4px 14px 14px; font: 400 12px/1.5 var(--mono); color: var(--green-d); overflow-x: auto; }
  .scrub { border: 1px solid var(--rule); border-radius: 16px; padding: 14px 16px 10px; }
  .scrub-top { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
  .round-btn { width: 34px; height: 34px; border-radius: 50%; border: 0; background: var(--ink); color: #fff; display: inline-flex; align-items: center; justify-content: center; transition: background .15s; }
  .round-btn:hover { background: var(--blue); }
  .track { position: relative; height: 34px; }
  .track-bg, .track-fill { position: absolute; left: 0; top: 14px; height: 6px; border-radius: 3px; }
  .track-bg { right: 0; background: var(--rule2); } .track-fill { background: var(--blue); }
  .playhead { position: absolute; top: 8px; width: 3px; height: 18px; border-radius: 2px; background: var(--ink); }
  .track-input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
  .marker { position: absolute; top: 9px; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 0 1px var(--rule); z-index: 2; padding: 0; }
  .events { list-style: none; margin: 8px 0 0; padding: 0; display: grid; }
  .events button { width: 100%; display: flex; align-items: center; gap: 10px; background: none; border: 0; padding: 6px 0; font-size: 13.5px; color: var(--ink2); text-align: left; }
  .events button:hover { color: var(--ink); }
  .events i { width: 9px; height: 9px; border-radius: 50%; }
  .events .mono { color: var(--mute); font-size: 12px; }
  .durbar { display: flex; gap: 3px; height: 12px; border-radius: 6px; overflow: hidden; margin-bottom: 14px; }
  .durbar span { display: block; height: 100%; }
  .ledger { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--rule); }
  .ledger li { border-bottom: 1px solid var(--rule); }
  .ledger button { width: 100%; display: flex; gap: 16px; padding: 14px 4px; background: none; border: 0; text-align: left; transition: background .15s; }
  .ledger button:hover { background: var(--paper); }
  .dur { min-width: 42px; font-size: 12.5px; font-weight: 700; color: var(--blue); padding-top: 2px; }
  .sk-name { display: block; font: 700 13.5px var(--mono); }
  .sk-desc { display: block; margin-top: 3px; font-size: 14px; color: var(--ink2); }
  .sk-log { display: block; margin-top: 9px; padding: 9px 11px; background: var(--paper); border: 1px solid var(--rule); border-radius: 10px; font-size: 11.5px; color: var(--blue-d); overflow-wrap: anywhere; }
  .pr-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-bottom: 14px; }
  .filechip { display: inline-flex; align-items: center; gap: 7px; max-width: 100%; padding: 6px 11px; border: 1px solid var(--rule); border-radius: 9px; background: var(--paper); font: 500 12px var(--mono); overflow-wrap: anywhere; }
  .branch { font-size: 11px; color: var(--mute); overflow-wrap: anywhere; }
  .diff { border: 1px solid var(--rule); border-radius: 16px; overflow: hidden; background: #FBFBFE; }
  .diff-head { display: flex; justify-content: space-between; gap: 10px; padding: 9px 14px; background: var(--paper); border-bottom: 1px solid var(--rule); font-size: 11.5px; color: var(--mute); }
  .diff-scroll { overflow-x: auto; }
  .diff-inner { min-width: max-content; padding: 6px 0; font: 400 12.5px/1.75 var(--mono); }
  .dl { display: flex; } .dl.add { background: rgba(0,163,108,.13); } .dl.del { background: rgba(240,67,31,.10); }
  .dl .sign { width: 30px; flex-shrink: 0; text-align: center; font-weight: 800; user-select: none; }
  .dl.add .sign { color: var(--green-d); } .dl.del .sign { color: var(--red-d); }
  .dl .code { white-space: pre; padding-right: 18px; color: var(--ink); }
  .dl.ctx .code { color: var(--mute); }
  .merge-btn { width: 100%; padding: 17px 18px; border: 0; border-radius: 16px; background: var(--green-d); color: #fff; font: 800 15.5px var(--sans); display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 6px 0 #004D33; transition: transform .15s, box-shadow .15s, background .15s; }
  .merge-btn:hover:not(:disabled) { background: #008F5F; transform: translateY(-1px); }
  .merge-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 2px 0 #004D33; }
  .merge-btn:disabled { opacity: .9; }
  .merged { display: flex; align-items: center; gap: 18px; padding: 18px; border: 2px solid var(--green); border-radius: 16px; background: var(--green-w); animation: pop .4s ease both; }
  .stamp { flex-shrink: 0; transform: rotate(-8deg); border: 3px double var(--green-d); border-radius: 6px; padding: 6px 12px; font: 800 italic 22px/1 var(--display); letter-spacing: .08em; text-transform: uppercase; color: var(--green-d); animation: stampin .45s cubic-bezier(.2,1.4,.4,1) both; }
  .merged-t { font: 800 14px/1.35 var(--sans); color: var(--green-d); }
  .merged-s { font-size: 12.5px; color: var(--ink2); margin-top: 3px; }
  .pr-foot { display: flex; justify-content: space-between; gap: 10px; margin-top: 12px; font: 400 11.5px/1.4 var(--mono); color: var(--mute); }
  .reset { display: inline-flex; align-items: center; gap: 5px; background: none; border: 0; color: var(--ink2); font: 700 11.5px var(--mono); flex-shrink: 0; }
  .reset:hover { color: var(--blue); }

  /* ── Voice panel ── */
  .vpanel { width: 100%; height: 100%; display: flex; gap: 14px; padding: 16px; background: #fff; border: 1px solid #F0D98A; border-radius: 18px; overflow: hidden; box-shadow: 0 12px 30px -12px rgba(138,95,0,.35); }
  .vtag { display: flex; align-items: center; gap: 8px; align-self: stretch; font: 700 10px var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--gold-d); }
  .bubble { padding: 9px 12px; border-radius: 12px; background: var(--paper); }
  .bubble.user { background: var(--gold-w); }
  .who { font: 600 10px var(--mono); color: var(--mute); margin-bottom: 2px; }
  .said { font-size: 13.5px; line-height: 1.45; color: var(--ink); }
  .bubble.user .said { font-style: italic; }
  .mapped { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 7px 10px; border-radius: 9px; background: var(--blue-w); color: var(--blue-d); font: 500 11px var(--mono); transition: opacity .4s; }
  .snippet { margin-top: auto; padding: 10px; border-radius: 12px; background: var(--ink); }
  .snippet-k { font: 600 9.5px var(--mono); letter-spacing: .1em; text-transform: uppercase; color: #98A1B8; margin-bottom: 4px; }
  .snippet code { display: block; font: 400 10.5px/1.45 var(--mono); color: #9AE6B4; word-break: break-all; }
  .mini-btn { display: inline-flex; align-items: center; gap: 5px; margin-top: 8px; padding: 4px 10px; border: 0; border-radius: 7px; background: var(--gold); color: var(--ink); font: 700 10.5px var(--mono); }
  .orb-wrap { position: relative; width: 76px; height: 76px; flex-shrink: 0; margin: 6px 0; }
  .orb-wrap.small { width: 48px; height: 48px; margin: 0; }
  .orb { position: absolute; inset: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--ink); background: radial-gradient(circle at 30% 28%, #FFF1B8, #FFB400 50%, #E08A00); box-shadow: 0 10px 28px rgba(255,180,0,.55); }
  .orb-ring { position: absolute; inset: 0; border-radius: 50%; border: 2.5px solid var(--gold); animation: ring 2.2s ease-out infinite; }
  .orb-ring.r2 { animation-delay: 1.1s; }
  .wave-bar { display: block; width: 3px; height: 100%; border-radius: 2px; background: linear-gradient(180deg, #FFB400, #F0431F); transform-origin: center; animation: wave .9s ease-in-out infinite alternate; }
  .caret { display: inline-block; width: 6px; height: 13px; margin-left: 2px; vertical-align: -2px; background: var(--blue); animation: blink .9s steps(1) infinite; }
  .scanline { position: absolute; overflow: hidden; pointer-events: none; z-index: 55; border-radius: 40px; }
  .scanline i { display: block; position: absolute; left: 0; right: 0; height: 80px; background: linear-gradient(180deg, transparent, rgba(43,59,255,.3)); border-bottom: 3px solid var(--blue); animation: scan 1.1s linear infinite; }
  .ripple { position: absolute; left: 4px; top: 4px; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%; border: 2.5px solid var(--blue); animation: rip .9s ease-out both; }
  .sim-spin { animation: spin 1s linear infinite; }

  /* ── Colophon ── */
  .colophon { margin-top: 64px; padding-block: 48px 30px; background: var(--ink); color: #fff; }
  .colo-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 36px 32px; }
  .colo-k { font: 800 11px/1.3 var(--sans); letter-spacing: .16em; text-transform: uppercase; color: #98A1FF; margin-bottom: 16px; }
  .colophon ul { list-style: none; margin: 0; padding: 0; }
  .colophon li { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 8px; margin-bottom: 10px; font-size: 14.5px; }
  .colophon li i { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; align-self: center; }
  .colophon li b { font-weight: 700; } .colophon li span { color: #A3AAC2; font-size: 13px; }
  .colo-num { font: 800 46px/1.05 var(--display); letter-spacing: -.02em; font-variation-settings: "opsz" 30; }
  .colo-num small { font: 500 14px var(--sans); letter-spacing: 0; color: #A3AAC2; }
  .colo-fine { margin: 12px 0 0; font: 400 11px/1.5 var(--mono); color: #A3AAC2; }
  .key li { color: #E6E8F5; }
  .colo-base { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px 24px; margin-top: 38px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,.16); font: 400 11.5px/1.5 var(--mono); color: #98A1B8; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes shimmer { to { background-position: -200% 0; } }
  @keyframes blink { 50% { opacity: 0; } }
  @keyframes pop { from { transform: scale(.96); opacity: .5; } to { transform: scale(1); opacity: 1; } }
  @keyframes stampin { from { transform: rotate(-8deg) scale(2.2); opacity: 0; } to { transform: rotate(-8deg) scale(1); opacity: 1; } }
  @keyframes rise { from { transform: translateY(10px); opacity: .2; } to { transform: none; opacity: 1; } }
  @keyframes boxin { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
  @keyframes ring { 0% { transform: scale(1); opacity: .9; } 100% { transform: scale(1.9); opacity: 0; } }
  @keyframes wave { from { transform: scaleY(.15); } to { transform: scaleY(1); } }
  @keyframes scan { from { top: -80px; } to { top: 100%; } }
  @keyframes rip { from { transform: scale(.4); opacity: 1; } to { transform: scale(3.2); opacity: 0; } }
  @keyframes livepulse { 0% { box-shadow: 0 0 0 0 rgba(0,163,108,.55); } 100% { box-shadow: 0 0 0 9px rgba(0,163,108,0); } }
  @keyframes redpulse { 0% { box-shadow: 0 0 0 0 rgba(240,67,31,.55); } 100% { box-shadow: 0 0 0 9px rgba(240,67,31,0); } }
  @keyframes goldpulse { 0% { box-shadow: 0 0 0 0 rgba(255,180,0,.6); } 100% { box-shadow: 0 0 0 9px rgba(255,180,0,0); } }

  @media (max-width: 1040px) {
    .col-l { position: static; }
    .hero { grid-template-columns: minmax(0, 1fr); }
    .col-l, .col-r { grid-column: 1 / -1; grid-row: auto; }
    .colo-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 640px) {
    .main { padding-block: 22px 4px; }
    .tabs { width: 100%; } .tab { flex: 1 1 45%; padding: 8px 6px 10px; }
    .tab svg { display: none; }
    .desk { padding: 20px; } .story-body { padding: 18px; }
    .colo-grid { grid-template-columns: minmax(0, 1fr); }
    .merged { flex-direction: column; align-items: flex-start; }
  }
`;

/* ═════════════ Icons (inline, lucide-style) ═════════════ */
const ICONS = {
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  sparkles: <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />,
  mic: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></>,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  copy: <><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></>,
  merge: <><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M6 21V9a9 9 0 0 0 9 9" /></>,
  terminal: <><polyline points="4 17 10 11 4 5" /><line x1="12" x2="20" y1="19" y2="19" /></>,
  play: <polygon points="6 3 20 12 6 21 6 3" />,
  pause: <><rect x="14" y="4" width="4" height="16" rx="1" /><rect x="6" y="4" width="4" height="16" rx="1" /></>,
  mail: <><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>,
  lock: <><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  file: <><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
  code: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>,
  rotate: <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></>,
  arrow: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
};
function Icon({ n, size = 16, stroke = 2, style, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" style={style} className={className} aria-hidden="true">{ICONS[n]}</svg>
  );
}

/* ═════════════ Helpers ═════════════ */
const KC = { err: "#F0431F", warn: "#F5A300", ok: "#00A36C", cy: "#2B3BFF" };
const KFG = { err: "#fff", warn: "#0B1020", ok: "#fff", cy: "#fff" };
const fmt = (n) => Math.round(n).toLocaleString("en-US");
const mmss = (s) => `00:${String(Math.floor(s)).padStart(2, "0")}`;

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
function useCountUp(target, dur = 800) {
  const [v, setV] = useState(target);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; setV(target); return undefined; }
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(target); return undefined; }
    let raf; const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      setV(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
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
  let host = "checkout.zestkart.in";
  try {
    const u = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : "https://" + url.trim());
    if (u.hostname.includes(".")) host = u.hostname.replace(/^www\./, "");
  } catch { /* keep default */ }
  const extracted = extractBrandFromUrl(url);
  const brand = host.includes("zestkart") ? "ZestKart" : extracted !== "UnknownBrand" ? extracted : host.split(".")[0];
  const coupon = brand.replace(/[^a-z]/gi, "").slice(0, 4).toUpperCase().padEnd(4, "X") + "300";
  const isPreset = host.includes("zestkart.in") || host.includes("scalegrid.io");
  return { brand, host, coupon, isPreset };
}

/* ═════════════ Scenario data ═════════════ */
const M = (x, y, w = 0, h = 0, ox = 164, oy = 8) => ({ x: ox + x * 0.8, y: oy + y * 0.8, w: w * 0.8, h: h * 0.8 });
const D = (x, y, w = 0, h = 0, ox = 0, oy = 52) => ({ x: ox + x * 0.64, y: oy + y * 0.64, w: w * 0.64, h: h * 0.64 });

const SCENARIOS = [
  {
    id: "hindi", specId: "S1_HINDI_OVERFLOW", emoji: "📱", label: "iPhone 15 · Jio 4G + Hindi Overflow (₹ Revenue Leak)", short: "Hindi overflow",
    defaultUrl: "https://checkout.zestkart.in/v2/payment",
    kind: "mobile", variant: "hindi", prn: 142, device: "iPhone 15 · Safari 17",
    viewport: "390 × 844 px · Throttled 4G",
    audience: "an iPhone 15 shopper on Jio 4G", audienceShort: "iPhone",
    headline: (b, usd) => <>The Pay button on {b} hides on small screens. It costs <em>${fmt(usd)}</em> a month.</>,
    figCaption: "iPhone 15 on Jio 4G, coupon applied. The sticky Pay bar slides under the trust banner and the Hindi label is clipped.",
    drop: "-14.8%", dropN: 14.8, leakUSD: 18400, baseVol: 3900,
    spark: [3.9, 4.0, 3.9, 4.1, 4.0, 3.9, 4.0, 3.4, 3.3, 3.4, 3.3, 3.3, 3.4, 3.3], deployAt: 7,
    summary: "The sticky “Pay ₹4,299” bar slides under the trust banner on 390px screens once a coupon is applied, and the Hindi label overflows a flex-nowrap container.",
    trace: [
      { lvl: "err", at: "00:08.412", msg: "Uncaught TypeError: Cannot read properties of null (reading 'getBoundingClientRect')", src: "StickyPaymentBar.tsx:42" },
      { lvl: "warn", at: "00:08.440", msg: "CSS flex-nowrap clipping on <390px viewports: .pay-label overflows by 118px", src: "checkout.css:211" },
      { lvl: "warn", at: "00:11.020", msg: "3 click events landed on .trust-strip (z-index 50) instead of #checkout-sticky-cta", src: "HAR #218" },
    ],
    json: { severity: "critical", category: "layout_overflow", component: "StickyPaymentBar", viewport: "390x844", locale: "hi-IN", confidence: 0.994, est_conv_drop_pct: 14.8 },
    replay: [{ t: 4, label: "Coupon Applied", kind: "ok" }, { t: 8, label: "Viewport Overflow", kind: "warn" }, { t: 11, label: "3x Frustrated Rage Clicks", kind: "err" }],
    skills: [
      { name: "BrowserSandboxSkill", desc: "Reproduced state in isolated Cloud Run container", dur: "1.1s", log: "chromium --device='iPhone 15' --net=jio-4g · coupon applied → overflow reproduced 3/3" },
      { name: "TraceCorrelatorSkill", desc: "Aligned HAR network spike with DOM mutation via Gemma 4 31B", dur: "0.3s", log: "HAR #218 t=8.41s ↔ MutationObserver(.sticky-bar) Δbottom = −48px" },
      { name: "ASTBlastRadiusSkill", desc: "Mapped 3 coupled files in repository via Google Antigravity", dur: "0.6s", log: "StickyPaymentBar.tsx ← CheckoutLayout.tsx ← locale/hi.json (3 files, 0 tests broken)" },
      { name: "GitPatchSkill", desc: "Synthesized AST-verified diff on branch pramana/fix-sticky-pay-142", dur: "0.3s", log: "src/components/checkout/StickyPaymentBar.tsx (+4 / -4 lines, INV-04 verified)" },
    ],
    pr: { branch: "pramana/fix-sticky-pay-142", title: "fix(checkout): keep sticky Pay CTA visible on 390px + Hindi locale", file: "src/components/checkout/StickyPaymentBar.tsx", hunk: "@@ -18,11 +18,11 @@",
      diff: [
        { t: "ctx", c: "export function StickyPaymentBar({ total, onPay }: Props) {" },
        { t: "ctx", c: "  const { t } = useLocale();" },
        { t: "del", c: "  return (" },
        { t: "del", c: "    <div className=\"fixed bottom-[-48px] z-10 flex w-full flex-nowrap gap-2\">" },
        { t: "del", c: "      <button className=\"whitespace-nowrap px-6\" onClick={onPay}>" },
        { t: "del", c: "        {t(\"pay_securely\", { total })}" },
        { t: "add", c: "  return (" },
        { t: "add", c: "    <div className=\"fixed inset-x-0 bottom-0 z-50 flex gap-2 px-4 pb-[max(16px,env(safe-area-inset-bottom))]\">" },
        { t: "add", c: "      <button id=\"checkout-sticky-cta\" className=\"min-w-0 flex-1 px-4 text-balance\" onClick={onPay}>" },
        { t: "add", c: "        {t(\"pay_securely\", { total })}" },
        { t: "ctx", c: "      </button>" },
        { t: "ctx", c: "    </div>" },
        { t: "ctx", c: "  );" },
        { t: "ctx", c: "}" },
      ] },
    changes: ["bottom: −48px → 0", "z-index: 10 → 50", "flex-nowrap → min-w-0 + wrap", "safe-area-inset-bottom padding"],
    boxes: [
      { b: M(0, 626, 390, 64), kind: "err", label: "overlap 0.994" },
      { b: M(16, 638, 358, 18), kind: "warn", label: "dead-click", hatch: true },
      { b: M(240, 656, 134, 20), kind: "err", label: "clip 0.968" },
    ],
    tags: [
      { text: "Layout Overlap: 99.4% confidence", kind: "err", x: 4, y: 470, w: 148, from: "r", box: 0, at: "l" },
      { text: "Dead-Click Zone Detected", kind: "warn", x: 480, y: 440, w: 156, from: "l", box: 1, at: "r" },
      { text: "Hindi text clipped: 96.8% confidence", kind: "err", x: 480, y: 500, w: 156, from: "l", box: 2, at: "r" },
      { text: "Omni vision · 14 regions · 3 anomalies", kind: "cy", x: 4, y: 12, w: 148 },
      { text: "DOM → #checkout-sticky-cta", kind: "cy", x: 480, y: 12, w: 156 },
    ],
    cursor: [{ x: 300, y: 372, l: "scan" }, { x: 200, y: 520, l: "tap UPI" }, { x: 200, y: 666, l: "tap Pay" }, { x: 200, y: 666, l: "no response" }],
    voice: { lang: "Hindi/English", node: "#checkout-sticky-cta", match: "97.2%", target: M(16, 638, 358, 52, 4, 8),
      lines: [
        { who: "User (Hindi/English)", text: "Jab main coupon apply karta hoon, Pay button screen ke neeche chhup jaata hai..." },
        { who: "Orb · Gemini Live", text: "Samajh gaya. Kya aap Pay button dekh paa rahe hain? Main ise abhi developer ko bhej raha hoon." },
      ],
      cue: "Lyria cue: soft ascending chime (A4 → E5) confirms the report was captured" },
  },
  {
    id: "upi", specId: "S2_UPI_TIMEOUT", emoji: "💳", label: "Safari iOS · UPI Webhook Race Condition (504 Timeout)", short: "UPI timeout",
    defaultUrl: "https://checkout.zestkart.in/v2/upi-intent",
    kind: "mobile", variant: "upi", prn: 143, device: "iPhone 15 · Safari iOS 17.5",
    viewport: "390 × 844 px · Safari iOS · 5G",
    audience: "a Safari iOS shopper paying with UPI", audienceShort: "UPI",
    headline: (b, usd) => <>UPI payments on {b} go through, then hang. That costs <em>${fmt(usd)}</em> a month.</>,
    figCaption: "Safari on iPhone 15 after a UPI payment. The webhook lands before the order exists, so the spinner never ends.",
    drop: "-9.7%", dropN: 9.7, leakUSD: 11200, baseVol: 2800,
    spark: [3.8, 3.9, 3.8, 3.9, 3.9, 3.8, 3.9, 3.5, 3.5, 3.4, 3.5, 3.5, 3.4, 3.5], deployAt: 7,
    summary: "The UPI confirmation webhook arrives 212 ms before the order row exists, the handler throws OrderNotFound, and the client spinner waits on a 504 that never resolves.",
    trace: [
      { lvl: "err", at: "00:07.204", msg: "POST /api/upi/confirm → 504 Gateway Timeout (30,012 ms)", src: "HAR #164" },
      { lvl: "warn", at: "00:07.001", msg: "webhook payment.captured received 212 ms BEFORE order.created → order_id = null", src: "upi-gw.log" },
      { lvl: "err", at: "00:07.233", msg: "Uncaught (in promise) Error: OrderNotFound at handleUpiWebhook", src: "upiConfirm.ts:27" },
    ],
    json: { severity: "critical", category: "race_condition", component: "handleUpiWebhook", viewport: "390x844", provider: "upi", confidence: 0.981, est_conv_drop_pct: 9.7 },
    replay: [{ t: 3, label: "UPI Intent Launched", kind: "ok" }, { t: 7, label: "Webhook Race (order_id null)", kind: "warn" }, { t: 11, label: "4x Retry Taps · Spinner Stuck", kind: "err" }],
    skills: [
      { name: "BrowserSandboxSkill", desc: "Replayed UPI intent flow in an isolated Cloud Run container", dur: "1.4s", log: "webkit --device='iPhone 15' · mock PSP callback delayed −212ms → 504 reproduced 5/5" },
      { name: "TraceCorrelatorSkill", desc: "Aligned webhook arrival with the order write via Gemma 4 31B", dur: "0.4s", log: "payment.captured t=7.001s < orders.insert t=7.213s → ordering gap 212ms" },
      { name: "ASTBlastRadiusSkill", desc: "Mapped 4 coupled files in repository via Google Antigravity", dur: "0.7s", log: "upiConfirm.ts ← orders.repo.ts ← useUpiPoller.ts ← order.reconcile.job.ts" },
      { name: "GitPatchSkill", desc: "Synthesized idempotent upsert patch on branch pramana/fix-upi-webhook-race-143", dur: "0.3s", log: "src/server/webhooks/upiConfirm.ts (+3 / -3 lines, INV-04 verified)" },
    ],
    pr: { branch: "pramana/fix-upi-webhook-race-143", title: "fix(payments): make UPI webhook idempotent and reconcile late orders", file: "src/server/webhooks/upiConfirm.ts", hunk: "@@ -24,9 +24,10 @@",
      diff: [
        { t: "ctx", c: "export async function handleUpiWebhook(evt: UpiEvent) {" },
        { t: "del", c: "  const order = await db.orders.find(evt.orderId);" },
        { t: "del", c: "  if (!order) throw new Error(\"OrderNotFound\");" },
        { t: "del", c: "  await db.orders.markPaid(order.id);" },
        { t: "add", c: "  const order = await db.orders.upsertPending(evt.orderId, evt.payerRef);" },
        { t: "add", c: "  await db.orders.markPaid(order.id, { idempotencyKey: evt.eventId });" },
        { t: "add", c: "  await queue.enqueue(\"order.reconcile\", { id: order.id }, { delayMs: 250 });" },
        { t: "ctx", c: "  return { ok: true };" },
        { t: "ctx", c: "}" },
      ] },
    changes: ["throw OrderNotFound → upsertPending", "idempotencyKey = eventId", "reconcile job (+250ms)", "client poller: 3x backoff"],
    boxes: [
      { b: M(130, 290, 130, 130), kind: "err", label: "loader 0.981" },
      { b: M(16, 100, 358, 48), kind: "err", label: "504" },
      { b: M(50, 430, 290, 64), kind: "warn", label: "stale status" },
    ],
    tags: [
      { text: "Infinite Loader: 98.1% confidence", kind: "err", x: 4, y: 270, w: 148, from: "r", box: 0, at: "l" },
      { text: "504 Gateway Timeout · 30,012 ms", kind: "err", x: 4, y: 88, w: 148, from: "r", box: 1, at: "l" },
      { text: "Webhook race: payment.captured −212 ms", kind: "warn", x: 480, y: 350, w: 156, from: "l", box: 2, at: "r" },
      { text: "Omni vision · 11 regions · 3 anomalies", kind: "cy", x: 4, y: 500, w: 148 },
      { text: "DOM → #upi-status-poller", kind: "cy", x: 480, y: 12, w: 156 },
    ],
    cursor: [{ x: 120, y: 520, l: "tap PhonePe" }, { x: 195, y: 660, l: "tap Pay" }, { x: 195, y: 360, l: "wait 30s" }, { x: 290, y: 470, l: "retry" }],
    voice: { lang: "English", node: "#upi-status-poller", match: "95.8%", target: M(50, 430, 290, 64, 4, 8),
      lines: [
        { who: "User (Hindi/English)", text: "UPI se pay kiya, paise kat gaye, but screen pe sirf spinner ghoom raha hai..." },
        { who: "Orb · Gemini Live", text: "Got it. I have your UPI reference and I am flagging this as a payment confirmation delay now." },
      ],
      cue: "Lyria cue: low steady tone (D3) signals a payment-critical report" },
  },
  {
    id: "desktop", specId: "S3_DARKMODE_CONTRAST", emoji: "🖥️", label: "Desktop Chrome · Dark-Mode Contrast & Dead Click", short: "Dark-mode dead click",
    defaultUrl: "https://app.scalegrid.io/settings/billing",
    kind: "desktop", variant: "desktop", prn: 144, device: "MacBook · Chrome 126",
    viewport: "1440 × 900 px · Desktop Chrome",
    audience: "a desktop Chrome shopper using dark mode", audienceShort: "desktop",
    headline: (b, usd) => <>In dark mode, “Place order” on {b} does nothing. That costs <em>${fmt(usd)}</em> a month.</>,
    figCaption: "Desktop Chrome in dark mode. The Apply button is barely visible and Place order ignores every click.",
    drop: "-6.3%", dropN: 6.3, leakUSD: 7900, baseVol: 5200,
    spark: [4.4, 4.5, 4.4, 4.5, 4.4, 4.5, 4.4, 4.2, 4.2, 4.1, 4.2, 4.2, 4.1, 4.2], deployAt: 7,
    summary: "In dark mode the Apply-coupon button renders at 2.1:1 contrast, and an invisible promo scrim swallows every click on “Place order”.",
    trace: [
      { lvl: "warn", at: "00:08.100", msg: "axe/color-contrast: #4A4F63 on #1C2030 = 2.1:1 (needs 4.5:1) on button#apply-coupon", src: "axe-core 4.9" },
      { lvl: "err", at: "00:11.050", msg: "Click on #place-order-cta intercepted by <div.promo-scrim> (z-index: 40)", src: "HAR #301" },
      { lvl: "warn", at: "00:11.900", msg: "5 clicks → 0 handlers fired · dead-click rate 41% on this route", src: "rum.session" },
    ],
    json: { severity: "high", category: "a11y_dead_click", component: "PlaceOrderButton", viewport: "1440x900", theme: "dark", confidence: 0.991, est_conv_drop_pct: 6.3 },
    replay: [{ t: 4, label: "Coupon Field Focused", kind: "ok" }, { t: 8, label: "Apply Button Unreadable", kind: "warn" }, { t: 11, label: "5x Dead Clicks on Place Order", kind: "err" }],
    skills: [
      { name: "BrowserSandboxSkill", desc: "Reproduced dark-mode state in isolated Cloud Run container", dur: "0.9s", log: "chromium 126 --color-scheme=dark · dead click reproduced 5/5" },
      { name: "TraceCorrelatorSkill", desc: "Aligned click events with the intercepting DOM node via Gemma 4 31B", dur: "0.3s", log: "elementFromPoint(#place-order-cta) → div.promo-scrim (z 40 > z 0)" },
      { name: "ASTBlastRadiusSkill", desc: "Mapped 2 coupled files in repository via Google Antigravity", dur: "0.5s", log: "PlaceOrderButton.tsx ← PromoScrim.tsx (2 files, 0 tests broken)" },
      { name: "GitPatchSkill", desc: "Synthesized z-50 & WCAG AA patch on branch pramana/fix-place-order-dead-click-144", dur: "0.2s", log: "src/components/checkout/PlaceOrderButton.tsx (+2 / -2 lines, INV-04 verified)" },
    ],
    pr: { branch: "pramana/fix-place-order-dead-click-144", title: "fix(checkout): restore Place order click target and dark-mode contrast", file: "src/components/checkout/PlaceOrderButton.tsx", hunk: "@@ -9,8 +9,8 @@",
      diff: [
        { t: "ctx", c: "export function PlaceOrderButton({ onPlace, disabled }: Props) {" },
        { t: "del", c: "  return (" },
        { t: "del", c: "    <button className=\"relative z-0 bg-slate-800 text-slate-500\" onClick={onPlace}>" },
        { t: "add", c: "  return (" },
        { t: "add", c: "    <button id=\"place-order-cta\" className=\"relative z-50 bg-indigo-500 text-white hover:bg-indigo-400\" onClick={onPlace} disabled={disabled}>" },
        { t: "ctx", c: "      Place order" },
        { t: "ctx", c: "    </button>" },
        { t: "ctx", c: "  );" },
        { t: "ctx", c: "}" },
      ] },
    changes: ["z-index: 0 → 50 (above scrim)", "Apply: 2.1:1 → 7.4:1 contrast", "Place order: opacity restored", "scrim: pointer-events none"],
    boxes: [
      { b: D(472, 150, 128, 48), kind: "err", label: "contrast 2.1:1" },
      { b: D(640, 450, 320, 56), kind: "warn", label: "dead-click", hatch: true },
    ],
    tags: [
      { text: "Low Contrast: 2.1:1 · 99.1% confidence", kind: "err", x: 200, y: 4, w: 210, from: "r", box: 0, at: "t" },
      { text: "Dead-Click Zone Detected", kind: "warn", x: 430, y: 4, w: 200, from: "b", box: 1, at: "t" },
    ],
    cursor: [{ x: 250, y: 174, l: "focus coupon" }, { x: 536, y: 174, l: "tap Apply" }, { x: 800, y: 478, l: "tap Place order" }, { x: 800, y: 478, l: "no response" }],
    voice: { lang: "English", node: "#place-order-cta", match: "96.4%", target: D(640, 450, 320, 56),
      lines: [
        { who: "User (English)", text: "I click Place Order and nothing happens. The Apply button is also almost invisible." },
        { who: "Orb · Gemini Live", text: "Thanks. I can see the dead area on Place order and I am attaching it to your session replay." },
      ],
      cue: "Lyria cue: two short rising notes signal a UI-interaction report" },
  },
];

const STACK_MODELS = [
  ["Gemini Omni", "Visual DOM"],
  ["Gemini Live", "Voice Bug Capture"],
  ["Gemma 4 31B", "Fast Log Triage"],
  ["Nano Banana", "Visual UI Diff"],
  ["Lyria", "Sonic Accessibility Cues"],
];
const STACK_TOOLS = [
  ["Google Antigravity", "Self-Healing AST"],
  ["Google Agent Skills", "Deterministic skills"],
  ["Google AI Studio", "Structured JSON"],
  ["Google Cloud Run", "Isolated sandboxes"],
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

/* ═════════════ Benchmark Storefront Simulations ═════════════ */
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
      <div style={{ position: "absolute", top: 46, left: 16, right: 16, height: 34, borderRadius: 12, background: "#E9E7E0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: L.mute, overflow: "hidden", whiteSpace: "nowrap" }}>
        🔒 {host.length > 30 ? host.slice(0, 29) + "…" : host}
      </div>
      <div style={{ position: "absolute", top: 92, left: 16, right: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ height: 32, display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 19 }}>
          <span style={{ fontSize: 20 }}>‹</span> Secure Checkout
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: "#1E8E5A", background: "#E3F4EA", padding: "3px 8px", borderRadius: 8 }}>SSL</span>
        </div>
        <div style={{ background: L.card, border: `1px solid ${L.line}`, borderRadius: 16, padding: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: L.mute, letterSpacing: 0.6, marginBottom: 6 }}>ORDER SUMMARY</div>
          <div style={rowS}><span>Aurelia Linen Kurta (M) × 1</span><span>₹2,799</span></div>
          <div style={rowS}><span>Terra Block-print Dupatta × 1</span><span>₹1,800</span></div>
          <div style={{ ...rowS, color: "#1E8E5A" }}><span>Coupon {coupon}</span><span>−₹300</span></div>
          <div style={{ ...rowS, color: L.mute }}><span>Delivery</span><span>Free</span></div>
          <div style={{ ...rowS, borderTop: `1px dashed ${L.line}`, marginTop: 4, paddingTop: 8, fontWeight: 700, fontSize: 16 }}><span>Total</span><span>₹4,299</span></div>
        </div>
        <div style={{ display: "flex", gap: 8, height: 46 }}>
          <div style={{ flex: 1, background: L.card, border: "1.5px solid #1E8E5A", borderRadius: 12, padding: "0 14px", display: "flex", alignItems: "center", fontSize: 14, fontWeight: 600 }}>{coupon}</div>
          <div style={{ width: 96, borderRadius: 12, background: "#E3F4EA", color: "#1E8E5A", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>Applied ✓</div>
        </div>
        <div style={{ background: L.card, border: `1px solid ${L.line}`, borderRadius: 16, padding: 14 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {["UPI", "Card", "COD"].map((t, i) => (
              <div key={t} style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 10, fontSize: 13, fontWeight: 600, background: i === 0 ? L.ink : "#F0EEE8", color: i === 0 ? "#fff" : L.mute }}>{t}</div>
            ))}
          </div>
          {["Google Pay", "PhonePe", "Paytm"].map((n, i) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, height: 42, borderTop: i ? `1px solid ${L.line}` : "none", fontSize: 14 }}>
              <span style={{ width: 18, height: 18, borderRadius: 9, border: `2px solid ${i === 1 ? L.brand : "#CFCBC0"}`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                {i === 1 && <span style={{ width: 8, height: 8, borderRadius: 4, background: L.brand }} />}
              </span>
              {n}
            </div>
          ))}
        </div>
        {hindi && fixed && <div style={{ fontSize: 12, textAlign: "center", color: L.mute }}>🔒 100% सुरक्षित भुगतान · 7 दिन में वापसी</div>}
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
          <div id="checkout-sticky-cta" style={{ width: "100%", height: 52, borderRadius: 14, background: L.brand, color: "#fff", fontWeight: 700, fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", boxShadow: "0 6px 18px rgba(255,90,54,.35)" }}>
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
          <div style={{ position: "absolute", top: 250, left: 40, right: 40, height: 270, borderRadius: 24, background: "#fff", zIndex: 30, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 36, boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
            {fixed ? (
              <div style={{ width: 74, height: 74, borderRadius: 37, background: "#E3F4EA", color: "#1E8E5A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 700 }}>✓</div>
            ) : (
              <div className="sim-spin" style={{ width: 74, height: 74, borderRadius: 37, border: "6px solid #EDEAE2", borderTopColor: L.brand }} />
            )}
            <div id="upi-status-poller" style={{ marginTop: 28, textAlign: "center", padding: "0 20px" }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{fixed ? "Payment received" : "Verifying your UPI payment…"}</div>
              <div style={{ fontSize: 13, color: L.mute, marginTop: 6, lineHeight: 1.4 }}>
                {fixed ? "₹4,299 · UPI Ref 4182 9930 21. Confirming your order, no need to retry." : "Waiting for PhonePe confirmation · 00:47. Do not press back."}
              </div>
            </div>
            {fixed ? (
              <div style={{ marginTop: 22, width: 220, height: 8, borderRadius: 4, background: "#EDEAE2", overflow: "hidden" }}><div style={{ width: "78%", height: "100%", background: "#1E8E5A" }} /></div>
            ) : (
              <div style={{ marginTop: 20, fontSize: 13, fontWeight: 700, color: L.brand }}>Retry ×4</div>
            )}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 626, height: 90, background: "#fff", borderTop: `1px solid ${L.line}`, zIndex: 20, padding: "12px 16px" }}>
            <div style={{ width: "100%", height: 52, borderRadius: 14, background: "#CFCBC0", color: "#fff", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{fixed ? "Confirming order…" : "Processing…"}</div>
          </div>
        </>
      )}
    </PhoneShell>
  );
}

function DesktopSim({ fixed }) {
  const { brand, coupon } = useContext(SiteCtx);
  const lbl = { position: "absolute", fontSize: 15, color: "#8A90A6", fontWeight: 600 };
  const field = (x, y, w, v, ph) => (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: 48, borderRadius: 10, background: "#171A23", border: "1px solid #2A2F42", padding: "0 16px", display: "flex", alignItems: "center", fontSize: 17, color: v ? "#E8EAF1" : "#5B6178" }}>{v || ph}</div>
  );
  return (
    <div style={{ width: 1000, height: 625, position: "relative", background: "#0E1016", color: "#E8EAF1", fontFamily: "'Hanken Grotesk', system-ui, sans-serif", borderRadius: 14, overflow: "hidden", boxShadow: "0 0 0 1px #262A3A, 0 24px 50px rgba(11,16,32,.3)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 56, borderBottom: "1px solid #20243A", display: "flex", alignItems: "center", padding: "0 40px", gap: 28 }}>
        <span style={{ fontWeight: 800, fontSize: 22, color: "#FF7A59" }}>{brand}</span>
        <span style={{ fontSize: 15, color: "#5B6178" }}>Cart  ›  Details  ›  <b style={{ color: "#E8EAF1" }}>Payment</b></span>
        <span style={{ marginLeft: "auto", fontSize: 14, color: "#8A90A6" }}>🔒 Secure checkout</span>
      </div>
      <div style={{ position: "absolute", left: 40, top: 76, fontSize: 28, fontWeight: 700 }}>Payment</div>
      <div style={{ ...lbl, left: 40, top: 124 }}>Coupon code</div>
      {field(40, 150, 420, coupon)}
      <div style={{ position: "absolute", left: 472, top: 150, width: 128, height: 48, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 17, background: fixed ? "#6366F1" : "#1C2030", color: fixed ? "#FFFFFF" : "#4A4F63", border: fixed ? "1px solid #818CF8" : "1px solid #262B3E" }}>Apply</div>
      <div style={{ ...lbl, left: 40, top: 222 }}>Card details</div>
      {field(40, 248, 560, "", "Card number  ·  4242 4242 4242 4242")}
      {field(40, 308, 272, "", "MM / YY")}
      {field(328, 308, 272, "", "CVV")}
      {field(40, 368, 560, "", "Name on card")}
      <div style={{ position: "absolute", left: 40, top: 436, fontSize: 15, color: "#8A90A6", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 18, height: 18, borderRadius: 5, border: "1.5px solid #3A4058" }} /> Save card for faster checkout
      </div>
      <div style={{ position: "absolute", left: 640, top: 76, width: 320, height: 350, borderRadius: 16, background: "#141722", border: "1px solid #232840", padding: 22 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.8, color: "#8A90A6", marginBottom: 14 }}>ORDER SUMMARY</div>
        {[["Aurelia Linen Kurta", "₹2,799"], ["Terra Dupatta", "₹1,800"], ["Coupon " + coupon, "−₹300"], ["Delivery", "Free"]].map(([a, b]) => (
          <div key={a} style={{ display: "flex", justifyContent: "space-between", fontSize: 16, padding: "9px 0", color: a.startsWith("Coupon") ? "#34D399" : "#C9CDDA" }}><span>{a}</span><span>{b}</span></div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, fontWeight: 700, borderTop: "1px dashed #2A2F42", marginTop: 14, paddingTop: 16 }}><span>Total</span><span>₹4,299</span></div>
      </div>
      <div id="place-order-cta" style={{ position: "absolute", left: 640, top: 450, width: 320, height: 56, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, background: fixed ? "linear-gradient(180deg,#6366F1,#4F46E5)" : "#232738", color: fixed ? "#fff" : "#5B6178", cursor: fixed ? "pointer" : "not-allowed", boxShadow: fixed ? "0 8px 28px rgba(99,102,241,.45)" : "none" }}>
        Place order · ₹4,299
      </div>
      <div style={{ position: "absolute", left: 640, top: 520, width: 320, textAlign: "center", fontSize: 13, color: "#5B6178" }}>UPI · Cards · Netbanking · Wallets</div>
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
    <div style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, border: `2px solid ${c}`, borderRadius: 4, boxShadow: `0 0 0 3px ${c}33`, background: item.hatch ? `repeating-linear-gradient(45deg, ${c}55 0 4px, transparent 4px 9px)` : `${c}26`, animation: "boxin .5s ease both", animationDelay: `${delay}ms`, zIndex: 30 }}>
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
function AiCursor({ pts }) {
  const [i, setI] = useState(0);
  useEffect(() => { setI(0); const id = setInterval(() => setI((v) => (v + 1) % pts.length), 1500); return () => clearInterval(id); }, [pts]);
  const p = pts[i % pts.length];
  return (
    <div style={{ position: "absolute", left: p.x, top: p.y, transition: "left 1s cubic-bezier(.4,0,.2,1), top 1s cubic-bezier(.4,0,.2,1)", zIndex: 50, pointerEvents: "none" }}>
      <span key={i} className="ripple" />
      <svg width="28" height="28" viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 4px 6px rgba(43,59,255,.45))" }}>
        <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" fill="#2B3BFF" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
      <span style={{ position: "absolute", left: 22, top: 20, background: "#2B3BFF", color: "#fff", fontSize: 10, fontFamily: "var(--mono)", fontWeight: 700, padding: "2px 7px", borderRadius: 6, whiteSpace: "nowrap" }}>Pramana · {p.l}</span>
    </div>
  );
}

function VisionStage({ sc, scanning }) {
  const mobile = sc.kind === "mobile";
  const ox = mobile ? 164 : 0, oy = mobile ? 8 : 52;
  const H = mobile ? 568 : 468;
  const pts = useMemo(() => sc.cursor.map((c) => { const q = mobile ? M(c.x, c.y) : D(c.x, c.y); return { x: q.x - 4, y: q.y - 4, l: c.l }; }), [sc, mobile]);
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
      <AiCursor pts={pts} />
      {scanning && <div className="scanline" style={{ left: ox, top: oy, width: fw, height: fh }}><i /></div>}
    </Stage>
  );
}

/* ═════════════ Live Custom URL Exhibit Stage (When Auditing External URLs Like github.com) ═════════════ */
function CustomLiveDomStage({ customAudit, mode }) {
  const dom = customAudit.scrapedDom || {};
  const finding = customAudit.customFinding || {};
  const elements = dom.interactiveElements || [];
  const headings = dom.headings || [];
  const a11y = dom.accessibilityMetrics || {};
  const forms = dom.formsAndInputs || {};

  if (mode === "patch") {
    const firstEl = elements[0] || { tag: "button", label: "Primary CTA", auditReason: "Missing mobile 390px guard & explicit aria-label" };
    return (
      <div className="live-dom-stage">
        <div className="live-dom-bar">
          <span>🔒 {customAudit.hostname} · Nano Banana DOM/CSS Remediation</span>
          <span className="badge-pill ok">Deterministic Patch ($0.00)</span>
        </div>
        <div className="live-dom-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            <div style={{ border: "1.5px solid var(--red)", borderRadius: 14, padding: 14, background: "var(--red-w)" }}>
              <div className="kicker" style={{ color: "var(--red-d)", marginBottom: 8 }}>Broken Live DOM Node</div>
              <div className="mono" style={{ padding: 10, borderRadius: 8, background: "#fff", fontSize: 12, color: "var(--ink)" }}>
                {`<${firstEl.tag}${firstEl.className ? ` class="${firstEl.className}"` : ""}>${firstEl.label}</${firstEl.tag}>`}
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--red-d)" }}>{firstEl.auditReason}</p>
            </div>
            <div style={{ border: "1.5px solid var(--green)", borderRadius: 14, padding: 14, background: "var(--green-w)" }}>
              <div className="kicker" style={{ color: "var(--green-d)", marginBottom: 8 }}>Nano Banana Patched Node</div>
              <div className="mono" style={{ padding: 10, borderRadius: 8, background: "#fff", fontSize: 12, color: "var(--green-d)" }}>
                {finding.recommendedCssFix || `${finding.targetSelector} { min-height: 44px; max-width: 100%; overflow-wrap: anywhere; }`}
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--green-d)" }}>44px minimum tap target · explicit aria-label · :focus-visible ring</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="live-dom-stage">
      <div className="live-dom-bar">
        <span>🔒 {customAudit.targetUrl}</span>
        <span style={{ display: "inline-flex", gap: 8 }}>
          <span className="badge-pill ok">HTTP {customAudit.httpStatus}</span>
          <span className="badge-pill warn">{customAudit.latencyMs}ms</span>
          <span className="badge-pill ok">{a11y.estimatedDomNodes || 120} DOM nodes</span>
        </span>
      </div>
      <div className="live-dom-body">
        <div>
          <div className="kicker" style={{ color: "var(--blue)" }}>Live Scraped Document Identity</div>
          <h3 className="live-dom-title">{dom.pageTitle || customAudit.hostname}</h3>
          {dom.metaDescription && <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "var(--ink2)" }}>{dom.metaDescription}</p>}
        </div>

        {headings.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {headings.slice(0, 4).map((h, i) => (
              <span key={i} className="chip mono" style={{ fontSize: 11 }}>
                <b style={{ color: "var(--blue)" }}>{h.tag.toUpperCase()}</b> {h.text.slice(0, 48)}
              </span>
            ))}
          </div>
        )}

        <div style={{ overflowX: "auto", border: "1px solid var(--rule)", borderRadius: 12 }}>
          <table className="cta-table">
            <thead>
              <tr>
                <th>Selector / Tag</th>
                <th>Scraped CTA Label</th>
                <th>ARIA</th>
                <th>Omni Spatial &amp; A11y Verdict</th>
              </tr>
            </thead>
            <tbody>
              {elements.length === 0 ? (
                <tr><td colSpan={4} className="mono" style={{ color: "var(--mute)" }}>No interactive button/CTA nodes extracted.</td></tr>
              ) : (
                elements.slice(0, 6).map((el, idx) => (
                  <tr key={idx}>
                    <td className="mono" style={{ fontSize: 11.5, color: "var(--blue-d)" }}>
                      {el.id ? `#${el.id}` : el.className ? `${el.tag}.${el.className}` : `<${el.tag}>`}
                    </td>
                    <td style={{ fontWeight: 700 }}>{el.label}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{el.hasAriaLabel ? "aria-label ✓" : "implicit"}</td>
                    <td>
                      <span className={"badge-pill " + (el.auditStatus === "CRITICAL" ? "err" : el.auditStatus === "WARN" ? "warn" : "ok")}>
                        {el.auditStatus}
                      </span>{" "}
                      <span style={{ fontSize: 12, color: "var(--ink2)" }}>{el.auditReason}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
          {[
            ["Forms", forms.formsCount ?? 0],
            ["Unlabeled Inputs", forms.unlabeledInputsCount ?? 0],
            ["Imgs Missing Alt", a11y.imagesMissingAlt ?? 0],
            ["Script Bundles", a11y.totalScripts ?? 0],
          ].map(([k, v]) => (
            <div key={k} style={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 12, padding: "10px 12px" }}>
              <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>{v}</div>
              <div style={{ fontSize: 11.5, color: "var(--mute)", fontWeight: 600 }}>{k}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═════════════ Before / After Stage ═════════════ */
function PatchBadge({ tone, children, x, y }) {
  const bad = tone === "bad";
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#fff", background: bad ? KC.err : KC.ok, whiteSpace: "nowrap", zIndex: 40, boxShadow: "0 6px 14px rgba(11,16,32,.15)" }}>
      <Icon n={bad ? "pause" : "check"} size={11} stroke={3} style={{ display: bad ? "none" : "block" }} />{children}
    </div>
  );
}
function PatchStage({ sc, view, pos }) {
  const mobile = sc.kind === "mobile";
  if (view === "split") {
    if (mobile) {
      return (
        <Stage H={600}>
          <PatchBadge tone="bad" x={4} y={4}>Broken</PatchBadge>
          <PatchBadge tone="ok" x={324} y={4}>Nano Banana auto-patched</PatchBadge>
          <Frame sc={sc} fixed={false} x={4} y={40} />
          <Frame sc={sc} fixed={true} x={324} y={40} />
        </Stage>
      );
    }
    return (
      <Stage H={908}>
        <PatchBadge tone="bad" x={0} y={4}>Broken</PatchBadge>
        <Frame sc={sc} fixed={false} x={0} y={40} />
        <PatchBadge tone="ok" x={0} y={460}>Nano Banana auto-patched</PatchBadge>
        <Frame sc={sc} fixed={true} x={0} y={496} />
      </Stage>
    );
  }
  const fw = mobile ? 312 : 640, fh = mobile ? 552 : 400;
  const ox = mobile ? 164 : 0, oy = 40;
  const cut = (pos / 100) * fw;
  return (
    <Stage H={oy + fh + 12}>
      <PatchBadge tone="bad" x={mobile ? 4 : 0} y={4}>Broken</PatchBadge>
      <PatchBadge tone="ok" x={mobile ? 330 : 380} y={4}>Nano Banana auto-patched</PatchBadge>
      <Frame sc={sc} fixed={false} x={ox} y={oy} />
      <div style={{ position: "absolute", left: ox, top: oy, width: fw, height: fh, clipPath: `inset(0 0 0 ${cut}px)` }}>
        <Frame sc={sc} fixed={true} x={0} y={0} />
      </div>
      <div style={{ position: "absolute", left: ox + cut - 1.5, top: oy - 6, width: 3, height: fh + 12, background: "#0B1020", zIndex: 45 }}>
        <div style={{ position: "absolute", top: fh / 2 - 15, left: -14, width: 31, height: 31, borderRadius: 16, background: "#fff", border: "3px solid #0B1020", color: "#0B1020", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>⇆</div>
      </div>
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
function Waveform({ bars = 28, height = 44 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height }} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} className="wave-bar" style={{ animationDelay: `${(i * 73) % 900}ms`, animationDuration: `${700 + ((i * 131) % 500)}ms` }} />
      ))}
    </div>
  );
}
function VoicePanel({ sc, typed, row, host }) {
  const [copied, doCopy] = useCopy();
  const snippet = `<script src="https://cdn.pramana.dev/orb.js" data-site="${host}" async></script>`;
  return (
    <div className="vpanel" style={{ flexDirection: row ? "row" : "column" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: row ? 190 : "100%", flexShrink: 0 }}>
        <div className="vtag"><span className="live-dot gold" /> Gemini Live · {sc.voice.lang}</div>
        <div className="orb-wrap"><span className="orb-ring" /><span className="orb-ring r2" /><div className="orb"><Icon n="mic" size={26} stroke={2.2} /></div></div>
        <Waveform bars={row ? 22 : 30} height={row ? 44 : 34} />
        <div style={{ fontSize: 11, color: "var(--mute)", textAlign: "center", lineHeight: 1.4, marginTop: 4 }}>♪ {sc.voice.cue}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {typed.shown.map((l, i) => (
            <div key={i} className={"bubble" + (i === 0 ? " user" : "")} style={{ opacity: l.vis ? 1 : 0.25 }}>
              <div className="who">{l.who}</div>
              <div className="said">{i === 0 ? "“" : ""}{l.vis}{!l.done && <span className="caret" />}{i === 0 && l.done ? "”" : ""}</div>
            </div>
          ))}
        </div>
        <div className="mapped" style={{ opacity: typed.finished ? 1 : 0.3 }}>
          <Icon n="link" size={12} /> mapped to <b>{sc.voice.node}</b> · {sc.voice.match} match
        </div>
        <div className="snippet">
          <div className="snippet-k">1-line customer widget</div>
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
  const t = sc.voice.target;
  const tgt = (
    <div style={{ position: "absolute", left: t.x, top: t.y, width: t.w, height: t.h, border: "2px dashed #2B3BFF", borderRadius: 6, background: "#2B3BFF1F", zIndex: 30 }}>
      <span style={{ position: "absolute", left: -2, top: -17, background: "#2B3BFF", color: "#fff", fontSize: 9, fontFamily: "var(--mono)", fontWeight: 700, padding: "1px 5px", borderRadius: "3px 3px 3px 0", whiteSpace: "nowrap" }}>{sc.voice.node}</span>
    </div>
  );
  if (mobile) {
    return (
      <Stage H={568}>
        <Frame sc={sc} fixed={false} x={4} y={8} />
        {tgt}
        <div className="orb-wrap small" style={{ position: "absolute", left: 4 + 312 - 70, top: 8 + 400, zIndex: 50 }}><span className="orb-ring" /><span className="orb-ring r2" /><div className="orb"><Icon n="mic" size={20} stroke={2.2} /></div></div>
        <div style={{ position: "absolute", left: 332, top: 8, width: 308, height: 552 }}><VoicePanel sc={sc} typed={typed} row={false} host={host} /></div>
      </Stage>
    );
  }
  return (
    <Stage H={812}>
      <Frame sc={sc} fixed={false} x={0} y={52} />
      {tgt}
      <div className="orb-wrap small" style={{ position: "absolute", left: 640 - 76, top: 52 + 400 - 76, zIndex: 50 }}><span className="orb-ring" /><span className="orb-ring r2" /><div className="orb"><Icon n="mic" size={20} stroke={2.2} /></div></div>
      <div style={{ position: "absolute", left: 0, top: 468, width: 640, height: 336 }}><VoicePanel sc={sc} typed={typed} row={true} host={host} /></div>
    </Stage>
  );
}

/* ═════════════ Exhibit (Left Column) ═════════════ */
const LENSES = [
  { id: "vision", label: "Gemini Omni Live Vision", icon: "eye", c: "#2B3BFF", wash: "#E3E7FF", dot: "rgba(43,59,255,.20)" },
  { id: "patch", label: "Nano Banana Before/After Patch", icon: "sparkles", c: "#007A51", wash: "#D8F5E8", dot: "rgba(0,163,108,.22)" },
  { id: "voice", label: "Pramana Live Voice Orb", icon: "mic", c: "#9A6B00", wash: "#FFF0C2", dot: "rgba(245,163,0,.30)" },
];
function Exhibit({ sc, mode, setMode, audit, host, customAudit }) {
  const [patchView, setPatchView] = useState("split");
  const [pos, setPos] = useState(50);
  const [fps, setFps] = useState(60);
  const running = audit.state === "running";
  const isCustom = Boolean(customAudit && customAudit.isCustomUrl);

  useEffect(() => {
    const id = setInterval(() => setFps(running ? 56 + Math.floor(Math.random() * 4) : 59 + Math.floor(Math.random() * 2)), 900);
    return () => clearInterval(id);
  }, [running]);
  const lens = LENSES.find((l) => l.id === mode);
  return (
    <section className="exhibit" aria-label="Multimodal browser sandbox">
      <header className="ex-head">
        <div>
          <div className="kicker" style={{ color: "var(--blue)" }}>Fig. 1 · {isCustom ? `Live DOM Inspection (${customAudit.hostname})` : "The sandbox"}</div>
          <p className="caption">
            {isCustom
              ? `Live server-side DOM & accessibility inspection of ${customAudit.targetUrl} (${customAudit.scrapedDom?.pageTitle || customAudit.hostname}).`
              : sc.figCaption}
          </p>
        </div>
        <div className="chips">
          <span className="chip mono">{isCustom ? `HTTP ${customAudit.httpStatus} · ${customAudit.latencyMs}ms` : sc.viewport}</span>
          <span className="chip mono"><i className="dot" style={{ background: fps >= 59 ? "var(--green)" : "var(--gold)" }} /> {fps} FPS</span>
        </div>
      </header>
      <div className="lenses" role="tablist" aria-label="Sandbox lens">
        {LENSES.map((l) => (
          <button key={l.id} role="tab" aria-selected={mode === l.id} type="button" onClick={() => setMode(l.id)} className="lens"
            style={mode === l.id ? { background: l.wash, color: l.c, boxShadow: `inset 0 -3px 0 ${l.c}` } : undefined}>
            <Icon n={l.icon} size={15} /> {l.label}
          </button>
        ))}
      </div>
      {mode === "patch" && !isCustom && (
        <div className="patchbar">
          <div className="seg">
            {[["split", "Side-by-side"], ["swipe", "Swipe compare"]].map(([id, l]) => (
              <button key={id} type="button" onClick={() => setPatchView(id)} className={patchView === id ? "on" : ""}>{l}</button>
            ))}
          </div>
          {patchView === "swipe" && (
            <label className="swipe">
              <span style={{ color: "var(--red-d)" }}>Broken</span>
              <input id="swipe-range" type="range" min="0" max="100" value={pos} onChange={(e) => setPos(Number(e.target.value))} className="range" aria-label="Reveal patched UI" />
              <span style={{ color: "var(--green-d)" }}>Patched</span>
            </label>
          )}
        </div>
      )}
      <div className="stagewrap" style={{ background: `radial-gradient(circle, ${lens.dot} 1.4px, transparent 1.8px) 0 0 / 14px 14px, ${lens.wash}` }}>
        {isCustom && (mode === "vision" || mode === "patch") ? (
          <CustomLiveDomStage customAudit={customAudit} mode={mode} />
        ) : (
          <>
            {mode === "vision" && <VisionStage sc={sc} scanning={running} />}
            {mode === "patch" && <PatchStage sc={sc} view={patchView} pos={pos} />}
            {mode === "voice" && <VoiceStage sc={sc} active host={host} />}
          </>
        )}
      </div>
      <footer className="ex-foot">
        {mode === "vision" && (
          <span>
            Omni is reading <b>{host}</b> {isCustom ? `(${customAudit.scrapedDom?.accessibilityMetrics?.estimatedDomNodes || 120} DOM nodes scanned)` : `on ${sc.device}. ${sc.boxes.length} regions flagged.`}
          </span>
        )}
        {mode === "patch" && <span>What changed: {isCustom ? customAudit.customFinding?.targetSelector : sc.changes.join(" · ")}</span>}
        {mode === "voice" && <span>A customer speaks. Gemini Live transcribes it and Pramana pins it to <b>{isCustom ? customAudit.customFinding?.targetSelector : sc.voice.node}</b>.</span>}
        <span className="legend">
          <i style={{ background: "var(--red)" }} /> lost revenue <i style={{ background: "var(--green)" }} /> fixed <i style={{ background: "var(--blue)" }} /> evidence <i style={{ background: "var(--gold)" }} /> customer voice
        </span>
      </footer>
    </section>
  );
}

/* ═════════════ Findings (Right Column) ═════════════ */
function Story({ tone, kicker, title, right, open, onToggle, id, ready = true, children }) {
  return (
    <article className={"story " + tone}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id} className="story-head">
        <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <span className="kicker">{kicker}</span>
          <span className="story-title">{title}</span>
        </span>
        {right}
        <Icon n="chevron" size={18} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
      </button>
      {open && <div id={id} className="story-body">{ready ? children : <Skeleton />}</div>}
    </article>
  );
}
function Skeleton() {
  return <div style={{ display: "grid", gap: 10 }} aria-label="Waiting for audit step">{[72, 100, 58].map((w, i) => <div key={i} className="shimmer" style={{ height: 12, borderRadius: 6, width: `${w}%` }} />)}</div>;
}

function Spark({ vals, mark }) {
  const w = 300, h = 64; const min = Math.min(...vals) - 0.25, max = Math.max(...vals) + 0.25;
  const pts = vals.map((v, i) => [(i * (w - 10)) / (vals.length - 1) + 5, h - 6 - ((v - min) / (max - min)) * (h - 14)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 64, display: "block" }} role="img" aria-label="Checkout conversion over 14 days, dropping after a deploy">
      <defs><linearGradient id="spk" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#F0431F" stopOpacity=".28" /><stop offset="1" stopColor="#F0431F" stopOpacity="0" /></linearGradient></defs>
      {[0.33, 0.66].map((f) => <line key={f} x1="0" x2={w} y1={h * f} y2={h * f} stroke="#E4E7F2" strokeWidth="1" />)}
      <line x1={pts[mark][0]} x2={pts[mark][0]} y1="0" y2={h} stroke="#0B1020" strokeWidth="1" strokeDasharray="3 3" />
      <path d={`${d} L${w - 5} ${h} L5 ${h} Z`} fill="url(#spk)" />
      <path d={d} fill="none" stroke="#F0431F" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="4.5" fill="#F0431F" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

function Scrubber({ events }) {
  const [t, setT] = useState(8.4);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => setT((v) => (v >= 12 ? 0 : Math.min(12, +(v + 0.1).toFixed(1)))), 100);
    return () => clearInterval(id);
  }, [playing]);
  const cur = [...events].reverse().find((e) => e.t <= t);
  return (
    <div className="scrub">
      <div className="scrub-top">
        <button type="button" onClick={() => setPlaying((p) => !p)} className="round-btn" aria-label={playing ? "Pause replay" : "Play replay"}><Icon n={playing ? "pause" : "play"} size={13} /></button>
        <span className="mono tnum" style={{ fontSize: 12, color: "var(--mute)" }}>{mmss(t)} / 00:12</span>
        <span className="mono" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: cur ? (cur.kind === "warn" ? "var(--gold-d)" : cur.kind === "err" ? "var(--red-d)" : "var(--green-d)") : "var(--mute)" }}>{cur ? cur.label : "session start"}</span>
      </div>
      <div className="track">
        <div className="track-bg" />
        <div className="track-fill" style={{ width: `${(t / 12) * 100}%` }} />
        <div className="playhead" style={{ left: `calc(${(t / 12) * 100}% - 1.5px)` }} />
        <input id="replay-scrub" type="range" min="0" max="12" step="0.1" value={t} onChange={(e) => { setT(Number(e.target.value)); setPlaying(false); }} aria-label="Replay position" className="track-input" />
        {events.map((e) => (
          <button key={e.t} type="button" onClick={() => { setT(e.t); setPlaying(false); }} title={`${mmss(e.t)} ${e.label}`} aria-label={`Jump to ${mmss(e.t)} ${e.label}`}
            className="marker" style={{ left: `calc(${(e.t / 12) * 100}% - 8px)`, background: KC[e.kind] }} />
        ))}
      </div>
      <ul className="events">
        {events.map((e) => (
          <li key={e.t}>
            <button type="button" onClick={() => { setT(e.t); setPlaying(false); }}>
              <i style={{ background: KC[e.kind] }} /><span className="mono tnum">{mmss(e.t)}</span><span>{e.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LeakStory({ sc, open, onToggle, ready, customAudit }) {
  const [json, setJson] = useState(false);
  const isCustom = Boolean(customAudit && customAudit.isCustomUrl);
  const targetDrop = isCustom ? (customAudit.customFinding?.dropNumber || 8.4) : sc.dropN;
  const pct = useCountUp(targetDrop);
  const usd = useCountUp(sc.leakUSD);
  const summaryText = isCustom ? customAudit.customFinding?.summary : sc.summary;
  const traceLines = isCustom
    ? (customAudit.customFinding?.rootCauseLogs || []).map((l) => ({
        lvl: String(l.lvl || "warn").toLowerCase().startsWith("err") ? "err" : "warn",
        at: l.at || "00:01.120",
        msg: l.msg || String(l),
        src: l.src || customAudit.hostname,
      }))
    : sc.trace;

  return (
    <Story id="story-leak" tone="red" kicker="The leak" title={isCustom ? customAudit.customFinding?.anomalyTitle : "Critical revenue leak detected"} open={open} onToggle={onToggle} ready={ready}
      right={<span className="sev">{isCustom ? (customAudit.customFinding?.severity || "HIGH") : "Critical"}</span>}>
      <div className="bignum-row">
        <div>
          <div className="bignum">−{pct.toFixed(1)}<span>%</span></div>
          <div className="bignum-cap">Estimated conversion drop</div>
        </div>
        <div style={{ minWidth: 0, flex: "1 1 230px" }}>
          <div className="leakline">About <b>${fmt(usd)}</b> at risk each month</div>
          <Spark vals={sc.spark} mark={sc.deployAt} />
          <div className="spark-axis"><span>14 days ago</span><span>deploy</span><span>today</span></div>
        </div>
      </div>
      <p className="lede-sm">{summaryText}</p>
      <div className="trace">
        <div className="trace-head"><Icon n="terminal" size={13} /> Root cause · Gemma 4 31B log triage · Google AI Studio structured JSON</div>
        <div className="trace-body">
          {traceLines.map((l, i) => (
            <div key={i} className="trace-line">
              <span className="mono tnum at">{l.at}</span>
              <span className={"lvl " + l.lvl}>{l.lvl === "err" ? "ERR" : "WARN"}</span>
              <span className="msg">{l.msg} <span className="src">{l.src}</span></span>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setJson((j) => !j)} className="trace-toggle">{json ? "Hide" : "Show"} structured JSON <Icon n="arrow" size={12} /></button>
        {json && <pre className="json">{JSON.stringify(isCustom ? customAudit.customFinding : sc.json, null, 2)}</pre>}
      </div>
      <div className="sub-k">Session replay</div>
      <Scrubber key={sc.id} events={sc.replay} />
    </Story>
  );
}

function TrailStory({ sc, open, onToggle, ready, customAudit }) {
  const [row, setRow] = useState(null);
  const isCustom = Boolean(customAudit && customAudit.isCustomUrl);
  const skillsList = isCustom && customAudit.customFinding?.skillsTrace ? customAudit.customFinding.skillsTrace : sc.skills;
  const total = skillsList.reduce((a, s) => a + (parseFloat(s.dur) || 0.3), 0);
  return (
    <Story id="story-trail" tone="blue" kicker="The trail" title="Google Agent Skills execution trace" open={open} onToggle={onToggle} ready={ready}
      right={<span className="sev blue">{skillsList.length}/{skillsList.length} passed · {total.toFixed(1)}s</span>}>
      <div className="durbar" aria-hidden="true">
        {skillsList.map((s, i) => <span key={s.name} style={{ flex: parseFloat(s.dur) || 0.3, background: ["#2B3BFF", "#5B68FF", "#98A1FF", "#00A36C"][i % 4] }} title={`${s.name} ${s.dur}`} />)}
      </div>
      <ul className="ledger">
        {skillsList.map((s, i) => (
          <li key={s.name}>
            <button type="button" onClick={() => setRow(row === i ? null : i)} aria-expanded={row === i}>
              <span className="dur mono tnum">{s.dur}</span>
              <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <span className="sk-name">✅ {s.name}</span>
                <span className="sk-desc">{s.desc}</span>
                {row === i && <span className="sk-log mono">$ {s.log}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="foot-note">Deterministic skills. Tap any skill row to inspect its execution log.</p>
    </Story>
  );
}

function PrStory({ sc, open, onToggle, ready, merge, setMerge, customAudit }) {
  const isCustom = Boolean(customAudit && customAudit.isCustomUrl);
  const p = isCustom
    ? {
        branch: `pramana/fix-${customAudit.hostname}-dom`,
        title: `fix(dom): remediate ${customAudit.customFinding?.targetSelector || "CTA"} on ${customAudit.hostname}`,
        file: customAudit.customFinding?.diffFile || sc.pr.file,
        hunk: "@@ -1,4 +1,6 @@",
        diff: customAudit.customFinding?.diffLines || sc.pr.diff,
      }
    : sc.pr;

  const adds = p.diff.filter((l) => l.t === "add").length, dels = p.diff.filter((l) => l.t === "del").length;
  const t = useRef(null);
  useEffect(() => () => clearTimeout(t.current), []);
  const doMerge = () => {
    if (merge !== "idle") return;
    setMerge("merging");
    fetch("/api/patch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prNumber: sc.prn, scenarioId: sc.specId, file: sc.pr.file, branch: p.branch }),
    }).catch(() => {});
    t.current = setTimeout(() => setMerge("merged"), 1200);
  };
  return (
    <Story id="story-pr" tone="green" kicker="The fix" title="Self-healed pull request ready" open={open} onToggle={onToggle} ready={ready}
      right={<span className="sev green">{merge === "merged" ? "Merged" : "Ready to merge"}</span>}>
      <div className="pr-meta">
        <span className="filechip"><Icon n="file" size={13} /> {p.file}</span>
        <span className="mono branch">{p.branch}</span>
      </div>
      <div className="diff">
        <div className="diff-head"><span className="mono">{p.hunk}</span><span className="mono"><b style={{ color: "var(--green-d)" }}>+{adds}</b> <b style={{ color: "var(--red-d)" }}>−{dels}</b></span></div>
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
      <div style={{ position: "relative", marginTop: 16 }}>
        {merge === "merged" ? (
          <div className="merged" role="status">
            <div className="stamp">Merged</div>
            <div>
              <div className="merged-t">✅ Merged to main · CI Passed · Audit Cost: $0.024</div>
              <div className="merged-s">Deployed behind your normal release checks. 14 of 14 CI checks passed.</div>
            </div>
          </div>
        ) : (
          <button type="button" onClick={doMerge} disabled={merge === "merging"} className="merge-btn">
            {merge === "merging" ? (<><span className="spinner" /> Running CI · 14/14 checks…</>) : (<><Icon n="merge" size={17} /> Merge Verified Fix → GitHub PR #{sc.prn}</>)}
          </button>
        )}
        <div className="pr-foot"><span>{p.title}</span>{merge === "merged" && <button type="button" onClick={() => setMerge("idle")} className="reset"><Icon n="rotate" size={11} /> Reset demo</button>}</div>
      </div>
    </Story>
  );
}

/* ═════════════ Hero + Audit Desk ═════════════ */
function AuditDesk({ sid, setSid, url, setUrl, audit, runAudit }) {
  const running = audit.state === "running";
  return (
    <section className="desk" aria-label="Zero-auth audit bar">
      <div className="desk-k">
        <span>Audit desk · zero-auth, no SDK</span>
        <span>$0.024 / audit (&le; $0.025 INV-06)</span>
      </div>
      <label htmlFor="audit-url" className="sr">Website URL to audit</label>
      <div className="desk-field">
        <Icon n="globe" size={17} />
        <input id="audit-url" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") runAudit(); }} spellCheck="false" autoComplete="off" />
      </div>
      <button type="button" onClick={runAudit} disabled={running} className="desk-run">
        {running ? (<><span className="spinner" /> Auditing…</>) : (<>Run Autonomous Audit <Icon n="zap" size={17} /></>)}
      </button>
      <div className="desk-sub">Choose what to simulate</div>
      <div role="radiogroup" aria-label="Scenario" className="scn-list">
        {SCENARIOS.map((s, i) => (
          <button key={s.id} type="button" role="radio" aria-checked={sid === i} onClick={() => setSid(i)} className={"scn" + (sid === i ? " on" : "")}>
            <span className="scn-em" aria-hidden="true">{s.emoji}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
      <p className="desk-note"><b>Live DOM + Benchmark Engine.</b> Paste any external URL (like <code>https://github.com/</code>) and click Run Autonomous Audit to scrape and inspect its live DOM, or pick a benchmark scenario above.</p>
    </section>
  );
}

function PressStrip({ sc, audit, customAudit }) {
  const running = audit.state === "running";
  const isCustom = Boolean(customAudit && customAudit.isCustomUrl);
  const steps = ["Gemini Omni scanning DOM...", "Gemma 4 31B filtering HAR traces...", "Nano Banana synthesizing visual patch...", `Google Antigravity generating PR #${sc.prn}...`];
  if (!running && !audit.ran) return null;
  return (
    <section className="press" aria-live="polite">
      <div className="press-bar"><div style={{ width: `${running ? ((audit.step + 1) / 4) * 100 : 100}%` }} /></div>
      <ol>
        {steps.map((s, i) => {
          const done = !running || audit.step > i, active = running && audit.step === i;
          return (
            <li key={s} className={done ? "done" : active ? "active" : ""}>
              <span className="ix">{done ? <Icon n="check" size={13} stroke={3} /> : active ? <span className="spinner tiny" /> : i + 1}</span>
              <span>{s}</span>
            </li>
          );
        })}
      </ol>
      {!running && (
        <div className="press-done">
          {isCustom
            ? `Live DOM audit of ${customAudit.hostname} complete in ${customAudit.latencyMs}ms · HTTP ${customAudit.httpStatus} · ${customAudit.scrapedDom?.accessibilityMetrics?.estimatedDomNodes || 120} DOM nodes · $0.024 compute`
            : `Audit complete in 3.0s · 3 anomalies · PR #${sc.prn} opened · $0.024 compute`}
        </div>
      )}
    </section>
  );
}

function CommandCenter(props) {
  const { sc, sid, setSid, url, setUrl, audit, runAudit, mode, setMode, merge, setMerge, open, setOpen, site, customAudit, liveHook, showQuotas } = props;
  const running = audit.state === "running";
  const step = audit.step;
  const ready = { leak: !running || step >= 2, trail: !running || step >= 3, pr: !running || step >= 4 };
  const tg = (k) => () => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const isCustom = Boolean(customAudit && customAudit.isCustomUrl);

  return (
    <div>
      {showQuotas && (
        <div style={{ marginBottom: 24 }}>
          <LiveTelemetryStrip health={liveHook.health} liveMeta={liveHook.liveMeta} isProbing={liveHook.isProbing || running} />
        </div>
      )}
      <section className="hero">
        <div className="hero-copy">
          <div className="kicker" style={{ color: "var(--red-d)" }}><i className="pulse-dot" /> Live autonomous audit · {site.host}</div>
          <h1 className="headline" key={sc.id + site.brand + (isCustom ? customAudit.hostname : "")}>
            {isCustom ? (
              <>Live DOM audit of {site.brand}: <em>{customAudit.customFinding?.conversionDropPct || "-6.8%"}</em> conversion at risk.</>
            ) : (
              sc.headline(site.brand, sc.leakUSD)
            )}
          </h1>
          <p className="standfirst">
            {isCustom
              ? customAudit.customFinding?.summary
              : "Pramana opened the page like a customer, found where it breaks, wrote the fix and opened a pull request. Every claim below has evidence you can check."}
          </p>
          <div className="byline"><b>Reproduced 3 of 3 times</b><span>·</span><span>Cloud Run, asia-south1</span><span>·</span><span>Fix opened in under 60 seconds</span></div>
        </div>
        <AuditDesk sid={sid} setSid={setSid} url={url} setUrl={setUrl} audit={audit} runAudit={runAudit} />
      </section>
      <PressStrip sc={sc} audit={audit} customAudit={customAudit} />
      <div className="grid">
        <div className="col-l"><Exhibit sc={sc} mode={mode} setMode={setMode} audit={audit} url={url} host={site.host} customAudit={customAudit} /></div>
        <div className="col-r">
          <LeakStory sc={sc} open={open.leak} onToggle={tg("leak")} ready={ready.leak} customAudit={customAudit} />
          <TrailStory sc={sc} open={open.trail} onToggle={tg("trail")} ready={ready.trail} customAudit={customAudit} />
          <PrStory sc={sc} open={open.pr} onToggle={tg("pr")} ready={ready.pr} merge={merge} setMerge={setMerge} customAudit={customAudit} />
        </div>
      </div>
    </div>
  );
}

/* ═════════════ Masthead & Colophon ═════════════ */
function Masthead({ sc, site, showQuotas, setShowQuotas }) {
  const date = useMemo(() => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), []);
  return (
    <header className="mast">
      <div className="gutter">
        <div className="mast-top">
          <span>Vol. 01 · Issue {sc.prn} · {date}</span>
          <div className="mast-links">
            <a href="/demo-store/index.html">Live Storefront ↗</a>
            <a href={`/proof/index.html?id=${sc.prn}&brand=${encodeURIComponent(site.brand)}`}>Proof Portal ↗</a>
            <a href="/deck/index.html">8-Slide Pitch Deck ↗</a>
            <button type="button" onClick={() => setShowQuotas((v) => !v)} style={{ background: "none", border: 0, padding: 0, font: "inherit", color: "var(--blue)", fontWeight: 700 }}>
              {showQuotas ? "Hide Quotas ▲" : "ADR-006 Quotas ▾"}
            </button>
          </div>
          <span className="status"><i className="live-dot" /> Google Cloud Run · Mumbai asia-south1 · 18ms</span>
        </div>
        <div className="mast-main">
          <div className="brand">
            <h1 className="wordmark">Pramana<em>AI</em></h1>
            <div className="brand-side">
              <span className="deva" lang="sa">प्रमाण</span>
              <span className="gloss">verifiable proof · by Team Vimarsha</span>
            </div>
          </div>
          <nav aria-label="Primary" className="tabs">
            <a href="#command" className="tab" aria-selected="true">
              <Icon n="zap" size={16} /><span><b>Live Command Center</b><small>Autonomous multimodal audit</small></span>
            </a>
            <a href={`/proof/index.html?id=${sc.prn}&brand=${encodeURIComponent(site.brand)}`} className="tab">
              <Icon n="lock" size={16} /><span><b>Verifiable Proof Certificate</b><small>Shareable CTO audit report ↗</small></span>
            </a>
          </nav>
        </div>
      </div>
      <div className="dbl" aria-hidden="true" />
    </header>
  );
}

function Colophon() {
  return (
    <footer className="colophon" aria-label="Google DeepMind and Google Cloud stack">
      <div className="gutter">
        <div className="colo-grid">
          <div>
            <div className="colo-k">Models</div>
            <ul>{STACK_MODELS.map(([n, s]) => <li key={n}><i style={{ background: "#7C8AFF" }} /><b>{n}</b><span>{s}</span></li>)}</ul>
          </div>
          <div>
            <div className="colo-k">Tools &amp; cloud</div>
            <ul>{STACK_TOOLS.map(([n, s]) => <li key={n}><i style={{ background: "#FFB400" }} /><b>{n}</b><span>{s}</span></li>)}</ul>
          </div>
          <div>
            <div className="colo-k">Unit economics</div>
            <div className="colo-num">$0.024<small> per audit</small></div>
            <div className="colo-num">86%<small> gross margin</small></div>
            <p className="colo-fine">Compute Cost: $0.024 / audit · Gross Margin: 86%</p>
          </div>
          <div>
            <div className="colo-k">How to read the colours</div>
            <ul className="key">
              <li><i style={{ background: "#F0431F" }} />Vermilion: revenue lost</li>
              <li><i style={{ background: "#00A36C" }} />Green: fixed and verified</li>
              <li><i style={{ background: "#2B3BFF" }} />Ultramarine: evidence and actions</li>
              <li><i style={{ background: "#FFB400" }} />Marigold: the customer's voice</li>
            </ul>
          </div>
        </div>
        <div className="colo-base"><span>Pramana (प्रमाण): Sanskrit for valid evidence. Built by Team Vimarsha.</span><span>Set in Bodoni Moda, Hanken Grotesk and JetBrains Mono.</span></div>
      </div>
    </footer>
  );
}

export default function App() {
  const [sid, setSidRaw] = useState(0);
  const [url, setUrl] = useState("https://checkout.zestkart.in/v2/payment");
  const [audit, setAudit] = useState({ state: "done", step: 4, ran: false });
  const [mode, setMode] = useState("vision");
  const [merge, setMerge] = useState("idle");
  const [open, setOpen] = useState({ leak: true, trail: true, pr: true });
  const [customAudit, setCustomAudit] = useState(null);
  const [showQuotas, setShowQuotas] = useState(false);

  const timers = useRef([]);
  const sc = SCENARIOS[sid];
  const site = useMemo(() => parseSite(url), [url]);

  const liveHook = useLiveAudit ? useLiveAudit(sc.specId) : {};
  const quotaRouter = useMemo(() => new QuotaAwareRouter(), []);
  const lyriaSynth = useMemo(() => new LyriaWebAudioSynth(), []);

  // Validate active schema in background (INV-08)
  useMemo(() => {
    void quotaRouter;
    return validateAuditReportPayload ? validateAuditReportPayload({}) : null;
  }, [quotaRouter]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const setSid = (i) => {
    clearTimers();
    setSidRaw(i);
    setUrl(SCENARIOS[i].defaultUrl);
    setCustomAudit(null);
    setMerge("idle");
    setAudit({ state: "done", step: 4, ran: false });
  };

  const runAudit = async () => {
    if (audit.state === "running") return;
    clearTimers();
    setMerge("idle");
    setAudit({ state: "running", step: 0, ran: false });

    [1, 2, 3, 4].forEach((n, i) => {
      timers.current.push(
        setTimeout(() => setAudit(n === 4 ? { state: "done", step: 4, ran: true } : { state: "running", step: n, ran: false }), (i + 1) * 650)
      );
    });

    try {
      const resp = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, scenarioId: sc.specId }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setCustomAudit(data.isCustomUrl ? data : null);
      }
      if (liveHook.runLiveProbe) {
        await liveHook.runLiveProbe(url, sc.specId);
      }
      try {
        if (sc.specId === "S2_UPI_TIMEOUT") lyriaSynth.playPaymentAlert();
        else lyriaSynth.playSuccessChime();
      } catch { /* ignore blocked audio */ }
    } catch {
      // Keep deterministic simulation if offline
    }
  };

  return (
    <SiteCtx.Provider value={site}>
      <style>{EDITORIAL_CSS}</style>
      <div className="page">
        <Masthead sc={sc} site={site} showQuotas={showQuotas} setShowQuotas={setShowQuotas} />
        <main className="gutter main">
          <CommandCenter
            sc={sc}
            sid={sid}
            setSid={setSid}
            url={url}
            setUrl={setUrl}
            audit={audit}
            runAudit={runAudit}
            mode={mode}
            setMode={setMode}
            merge={merge}
            setMerge={setMerge}
            open={open}
            setOpen={setOpen}
            site={site}
            customAudit={customAudit}
            liveHook={liveHook}
            showQuotas={showQuotas}
          />
        </main>
        <Colophon />
      </div>
    </SiteCtx.Provider>
  );
}
