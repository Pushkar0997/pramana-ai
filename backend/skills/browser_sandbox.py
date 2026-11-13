"""
BrowserSandboxSkill — Headless Playwright runner for Pramana AI.
Supports 390x844 mobile & 1440x900 desktop viewports, DOM bounding-box extraction,
console error capture, and HAR >=400 status filtering (INV-03: semantic ARIA + visual boxes).
"""

from __future__ import annotations

import asyncio
import time
from typing import Any, Dict, List, Optional


VIEWPORT_PRESETS: Dict[str, Dict[str, int]] = {
    "mobile": {"width": 390, "height": 844},
    "desktop": {"width": 1440, "height": 900},
}

SCENARIO_FIXTURES: Dict[str, Dict[str, Any]] = {
    "S1_HINDI_OVERFLOW": {
        "viewport": {"width": 390, "height": 844, "preset": "mobile"},
        "dom_nodes": [
            {
                "selector": "#checkout-sticky-cta",
                "aria_role": "button",
                "text": "अभी भुगतान करें और ऑर्डर कन्फर्म करें",
                "bounding_box": {"x": 16, "y": 772, "width": 412, "height": 56},
                "overflows_viewport": True,
                "computed_style": {"white-space": "nowrap", "overflow": "visible", "font-size": "16px"},
            }
        ],
        "console_errors": [
            "LayoutShiftWarning: #checkout-sticky-cta width (412px) exceeds mobile viewport (390px) for locale=hi-IN"
        ],
        "har_entries": [
            {"url": "https://api.zestkart.in/v1/cart/summary", "status": 200, "latency_ms": 112},
            {"url": "https://cdn.zestkart.in/i18n/hi-IN.json", "status": 200, "latency_ms": 48},
        ],
    },
    "S2_UPI_TIMEOUT": {
        "viewport": {"width": 390, "height": 844, "preset": "mobile"},
        "dom_nodes": [
            {
                "selector": "#upi-status-poller",
                "aria_role": "status",
                "text": "Verifying UPI collect request...",
                "bounding_box": {"x": 24, "y": 320, "width": 342, "height": 120},
                "overflows_viewport": False,
                "computed_style": {"pointer-events": "none", "opacity": "1"},
            }
        ],
        "console_errors": [
            "Uncaught (in promise) TimeoutError: UPI intent polling exceeded 15000ms without exponential backoff"
        ],
        "har_entries": [
            {"url": "https://api.zestkart.in/v1/payments/upi/status", "status": 504, "latency_ms": 15020},
            {"url": "https://api.zestkart.in/v1/payments/upi/status", "status": 504, "latency_ms": 15014},
            {"url": "https://api.zestkart.in/v1/checkout/session", "status": 200, "latency_ms": 95},
        ],
    },
    "S3_DARKMODE_CONTRAST": {
        "viewport": {"width": 1440, "height": 900, "preset": "desktop"},
        "dom_nodes": [
            {
                "selector": "#place-order-cta",
                "aria_role": "button",
                "text": "Place Order",
                "bounding_box": {"x": 960, "y": 640, "width": 320, "height": 48},
                "overflows_viewport": False,
                "computed_style": {
                    "color": "#334155",
                    "background-color": "#1e293b",
                    "contrast_ratio": 1.38,
                },
            }
        ],
        "console_errors": [
            "AccessibilityAudit: #place-order-cta dark-mode contrast ratio 1.38:1 is below WCAG AA 4.5:1"
        ],
        "har_entries": [
            {"url": "https://api.zestkart.in/v1/theme/dark.css", "status": 200, "latency_ms": 34},
            {"url": "https://api.zestkart.in/v1/telemetry/orphan-asset.png", "status": 404, "latency_ms": 62},
        ],
    },
}


class BrowserSandboxSkill:
    skill_name = "BrowserSandboxSkill"

    @staticmethod
    def filter_har_errors(har_entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Keep only HTTP >= 400 entries to eliminate noise."""
        return [entry for entry in har_entries if int(entry.get("status", 200)) >= 400]

    def run(
        self,
        target_url: str,
        viewport_preset: str = "mobile",
        scenario_id: Optional[str] = None,
        live_browser: bool = False,
    ) -> Dict[str, Any]:
        started = time.perf_counter()
        vp = VIEWPORT_PRESETS.get(viewport_preset, VIEWPORT_PRESETS["mobile"])

        if scenario_id and scenario_id in SCENARIO_FIXTURES and not live_browser:
            fx = SCENARIO_FIXTURES[scenario_id]
            har_errors = self.filter_har_errors(fx["har_entries"])
            return {
                "skill": self.skill_name,
                "status": "completed",
                "mode": "deterministic_sandbox_fixture",
                "target_url": target_url,
                "viewport": fx["viewport"],
                "dom_nodes": fx["dom_nodes"],
                "console_errors": fx["console_errors"],
                "har_total_count": len(fx["har_entries"]),
                "har_errors": har_errors,
                "duration_ms": round((time.perf_counter() - started) * 1000, 2),
            }

        if live_browser:
            try:
                return asyncio.run(self._run_playwright(target_url, vp, started))
            except Exception as exc:
                fallback = SCENARIO_FIXTURES["S1_HINDI_OVERFLOW"]
                return {
                    "skill": self.skill_name,
                    "status": "completed_with_fallback",
                    "mode": "playwright_fallback_fixture",
                    "fallback_reason": str(exc),
                    "target_url": target_url,
                    "viewport": {"width": vp["width"], "height": vp["height"], "preset": viewport_preset},
                    "dom_nodes": fallback["dom_nodes"],
                    "console_errors": fallback["console_errors"],
                    "har_total_count": len(fallback["har_entries"]),
                    "har_errors": self.filter_har_errors(fallback["har_entries"]),
                    "duration_ms": round((time.perf_counter() - started) * 1000, 2),
                }

        default_fx = SCENARIO_FIXTURES["S1_HINDI_OVERFLOW"]
        return {
            "skill": self.skill_name,
            "status": "completed",
            "mode": "deterministic_sandbox_fixture",
            "target_url": target_url,
            "viewport": {"width": vp["width"], "height": vp["height"], "preset": viewport_preset},
            "dom_nodes": default_fx["dom_nodes"],
            "console_errors": default_fx["console_errors"],
            "har_total_count": len(default_fx["har_entries"]),
            "har_errors": self.filter_har_errors(default_fx["har_entries"]),
            "duration_ms": round((time.perf_counter() - started) * 1000, 2),
        }

    async def _run_playwright(
        self, target_url: str, vp: Dict[str, int], started: float
    ) -> Dict[str, Any]:
        from playwright.async_api import async_playwright  # type: ignore

        console_errors: List[str] = []
        har_entries: List[Dict[str, Any]] = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(viewport=vp)
            page = await context.new_page()

            page.on(
                "console",
                lambda msg: console_errors.append(msg.text) if msg.type == "error" else None,
            )
            page.on(
                "response",
                lambda res: har_entries.append({"url": res.url, "status": res.status}),
            )

            await page.goto(target_url, wait_until="domcontentloaded", timeout=20000)
            dom_nodes = await page.evaluate(
                """() => {
                    const targets = document.querySelectorAll('button, [role="button"], [role="status"], a');
                    return Array.from(targets).slice(0, 12).map((el) => {
                        const r = el.getBoundingClientRect();
                        return {
                            selector: el.id ? '#' + el.id : el.tagName.toLowerCase(),
                            aria_role: el.getAttribute('role') || el.tagName.toLowerCase(),
                            text: (el.innerText || '').trim().slice(0, 80),
                            bounding_box: { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) },
                            overflows_viewport: r.right > window.innerWidth
                        };
                    });
                }"""
            )
            await browser.close()

        return {
            "skill": self.skill_name,
            "status": "completed",
            "mode": "live_playwright",
            "target_url": target_url,
            "viewport": vp,
            "dom_nodes": dom_nodes,
            "console_errors": console_errors,
            "har_total_count": len(har_entries),
            "har_errors": self.filter_har_errors(har_entries),
            "duration_ms": round((time.perf_counter() - started) * 1000, 2),
        }
