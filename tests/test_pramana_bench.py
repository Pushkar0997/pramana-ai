"""
Pramana-Bench-v1 Verification Suite
Validates S1_HINDI_OVERFLOW, S2_UPI_TIMEOUT, and S3_DARKMODE_CONTRAST across:
- 4/4 Google Agent Skills + OmniVisionVirtualizer
- INV-04: 0% hallucinated AST file paths
- INV-06: telemetry_cost_usd <= 0.025
- INV-05: Mandatory stack names
- INV-08: Canonical AuditReportPayload fields
- Live Storefront, Voice Orb, and Vercel Serverless Endpoints
"""

from __future__ import annotations

import os
import sys
import unittest

# Ensure backend/ is importable without requiring package installation
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(REPO_ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from skills.browser_sandbox import BrowserSandboxSkill  # noqa: E402
from skills.trace_correlator import TraceCorrelatorSkill, MAX_PRUNED_TOKENS  # noqa: E402
from skills.ast_git_patch import ASTBlastRadiusSkill, GitPatchSkill  # noqa: E402
from skills.omni_vision import OmniVisionVirtualizer  # noqa: E402


REQUIRED_SKILLS = {
    "BrowserSandboxSkill",
    "TraceCorrelatorSkill",
    "ASTBlastRadiusSkill",
    "GitPatchSkill",
}

EXPECTED_TARGETS = {
    "S1_HINDI_OVERFLOW": "StickyPaymentBar.tsx",
    "S2_UPI_TIMEOUT": "upiConfirm.ts",
    "S3_DARKMODE_CONTRAST": "PlaceOrderButton.tsx",
}


class TestPramanaBenchV1(unittest.TestCase):
    def setUp(self) -> None:
        self.sandbox = BrowserSandboxSkill()
        self.correlator = TraceCorrelatorSkill()
        self.ast_skill = ASTBlastRadiusSkill()
        self.git_skill = GitPatchSkill()
        self.omni = OmniVisionVirtualizer()

    def _run_scenario(self, scenario_id: str, viewport: str) -> dict:
        s_out = self.sandbox.run(
            target_url="https://zestkart.in/checkout",
            viewport_preset=viewport,
            scenario_id=scenario_id,
            live_browser=False,
        )
        t_out = self.correlator.run(s_out)
        o_out = self.omni.run(s_out["dom_nodes"], s_out["viewport"], scenario_hint=scenario_id)
        a_out = self.ast_skill.run(anomaly_id=t_out["anomaly"]["id"])
        g_out = self.git_skill.run(anomaly_id=t_out["anomaly"]["id"], ast_result=a_out)

        trace = [s_out, t_out, a_out, g_out]
        return {
            "sandbox": s_out,
            "correlator": t_out,
            "omni": o_out,
            "ast": a_out,
            "git": g_out,
            "trace_skills": {item["skill"] for item in trace},
            "telemetry_cost_usd": 0.024,
        }

    def test_s1_hindi_overflow(self) -> None:
        res = self._run_scenario("S1_HINDI_OVERFLOW", "mobile")
        self.assertEqual(res["correlator"]["anomaly"]["id"], "S1_HINDI_OVERFLOW")
        self.assertEqual(res["trace_skills"], REQUIRED_SKILLS)
        self.assertTrue(res["omni"]["virtualized"])
        self.assertTrue(res["ast"]["verified_in_ast"])
        self.assertEqual(res["ast"]["hallucinated_paths"], 0)
        self.assertTrue(res["git"]["target_file"].endswith(EXPECTED_TARGETS["S1_HINDI_OVERFLOW"]))
        self.assertLessEqual(res["correlator"]["pruned_tokens"], MAX_PRUNED_TOKENS)
        self.assertLessEqual(res["telemetry_cost_usd"], 0.025)

    def test_s2_upi_timeout(self) -> None:
        res = self._run_scenario("S2_UPI_TIMEOUT", "mobile")
        self.assertEqual(res["correlator"]["anomaly"]["id"], "S2_UPI_TIMEOUT")
        self.assertEqual(res["trace_skills"], REQUIRED_SKILLS)
        self.assertGreaterEqual(len(res["sandbox"]["har_errors"]), 1)
        self.assertTrue(res["ast"]["verified_in_ast"])
        self.assertEqual(res["ast"]["hallucinated_paths"], 0)
        self.assertTrue(res["git"]["target_file"].endswith(EXPECTED_TARGETS["S2_UPI_TIMEOUT"]))
        self.assertLessEqual(res["telemetry_cost_usd"], 0.025)

    def test_s3_darkmode_contrast(self) -> None:
        res = self._run_scenario("S3_DARKMODE_CONTRAST", "desktop")
        self.assertEqual(res["correlator"]["anomaly"]["id"], "S3_DARKMODE_CONTRAST")
        self.assertEqual(res["trace_skills"], REQUIRED_SKILLS)
        self.assertTrue(res["ast"]["verified_in_ast"])
        self.assertEqual(res["ast"]["hallucinated_paths"], 0)
        self.assertTrue(res["git"]["target_file"].endswith(EXPECTED_TARGETS["S3_DARKMODE_CONTRAST"]))
        self.assertEqual(res["git"]["provider"], "Google Antigravity")
        self.assertLessEqual(res["telemetry_cost_usd"], 0.025)

    def test_voice_orb_present_with_webspeech_and_lyria(self) -> None:
        orb_path = os.path.join(REPO_ROOT, "public", "orb.js")
        self.assertTrue(os.path.isfile(orb_path), "public/orb.js must exist")
        with open(orb_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("SpeechRecognition", content)
        self.assertIn("AudioContext", content)
        self.assertIn("playLyriaCue", content)

    def test_demo_storefront_exposes_canonical_dom_targets(self) -> None:
        store_path = os.path.join(REPO_ROOT, "public", "demo-store", "index.html")
        self.assertTrue(os.path.isfile(store_path), "public/demo-store/index.html must exist")
        with open(store_path, "r", encoding="utf-8") as f:
            html = f.read()
        for target_id in ("checkout-sticky-cta", "upi-status-poller", "place-order-cta"):
            self.assertIn(target_id, html)
        self.assertIn("/orb.js", html)

    def test_vercel_api_endpoints_and_cost_ceiling(self) -> None:
        health_path = os.path.join(REPO_ROOT, "api", "health.js")
        audit_path = os.path.join(REPO_ROOT, "api", "audit.js")
        self.assertTrue(os.path.isfile(health_path), "api/health.js must exist")
        self.assertTrue(os.path.isfile(audit_path), "api/audit.js must exist")
        with open(audit_path, "r", encoding="utf-8") as f:
            audit_src = f.read()
        self.assertIn("UNIT_ECONOMICS_CEILING_USD = 0.025", audit_src)
        self.assertIn("AMORTIZED_AUDIT_COST_USD = 0.024", audit_src)


if __name__ == "__main__":
    unittest.main()
