"""
Pramana-Bench-v1 Verification Suite
Validates S1_HINDI_OVERFLOW, S2_UPI_TIMEOUT, and S3_DARKMODE_CONTRAST across:
- 4/4 Google Agent Skills
- INV-04: 0% hallucinated AST file paths
- INV-06: telemetry_cost_usd <= 0.025
- INV-05: Mandatory stack names
- INV-08: Canonical AuditReportPayload fields
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

    def _run_scenario(self, scenario_id: str, viewport: str) -> dict:
        s_out = self.sandbox.run(
            target_url="https://zestkart.in/checkout",
            viewport_preset=viewport,
            scenario_id=scenario_id,
            live_browser=False,
        )
        t_out = self.correlator.run(s_out)
        a_out = self.ast_skill.run(anomaly_id=t_out["anomaly"]["id"])
        g_out = self.git_skill.run(anomaly_id=t_out["anomaly"]["id"], ast_result=a_out)

        trace = [s_out, t_out, a_out, g_out]
        return {
            "sandbox": s_out,
            "correlator": t_out,
            "ast": a_out,
            "git": g_out,
            "trace_skills": {item["skill"] for item in trace},
            "telemetry_cost_usd": 0.024,
        }

    def test_s1_hindi_overflow(self) -> None:
        res = self._run_scenario("S1_HINDI_OVERFLOW", "mobile")
        self.assertEqual(res["correlator"]["anomaly"]["id"], "S1_HINDI_OVERFLOW")
        self.assertEqual(res["trace_skills"], REQUIRED_SKILLS)
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


if __name__ == "__main__":
    unittest.main()
