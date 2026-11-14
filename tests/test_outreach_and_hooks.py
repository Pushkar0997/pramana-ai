"""
Unit Verification Suite for PR #4 Additive Deliverables:
- src/hooks/useLiveAudit.js
- src/components/LiveTelemetryStrip.jsx
- public/proof/index.html
- scripts/generate_outreach_proof.py
- docs/JUDGE_FAQ_AND_ARCHITECTURE.md
"""

from __future__ import annotations

import os
import subprocess
import sys
import unittest


REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


class TestOutreachAndHooks(unittest.TestCase):
    def _read(self, rel_path: str) -> str:
        full_path = os.path.join(REPO_ROOT, rel_path)
        self.assertTrue(os.path.isfile(full_path), f"Missing required file: {rel_path}")
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertGreater(len(content.strip()), 0, f"File must be non-empty: {rel_path}")
        return content

    def test_use_live_audit_hook(self) -> None:
        src = self._read("src/hooks/useLiveAudit.js")
        self.assertIn("export function useLiveAudit", src)
        self.assertIn("/api/health", src)
        self.assertIn("/api/audit", src)

    def test_live_telemetry_strip_component(self) -> None:
        src = self._read("src/components/LiveTelemetryStrip.jsx")
        self.assertIn("export function LiveTelemetryStrip", src)
        self.assertIn("ADR-006", src)
        self.assertIn("Gemma 4 31B", src)

    def test_founder_proof_portal_html(self) -> None:
        html = self._read("public/proof/index.html")
        self.assertIn("/orb.js", html)
        self.assertIn("VERIFIED BY PRAMANA AI (TEAM VIMARSHA)", html)
        self.assertIn("Copy Git Patch (.diff)", html)

    def test_outreach_cli_generator_and_inv06(self) -> None:
        cli_src = self._read("scripts/generate_outreach_proof.py")
        self.assertIn("UNIT_ECONOMICS_CEILING_USD = 0.025", cli_src)
        self.assertIn("INV-04", cli_src)
        self.assertIn("INV-06", cli_src)

        proc = subprocess.run(
            [
                sys.executable,
                os.path.join(REPO_ROOT, "scripts", "generate_outreach_proof.py"),
                "--url",
                "https://checkout.zestkart.in/v2/payment",
                "--scenario",
                "S1_HINDI_OVERFLOW",
            ],
            capture_output=True,
            text=True,
            timeout=10,
            check=True,
        )
        self.assertIn("/proof/index.html?id=142&brand=Zestkart", proc.stdout)

    def test_judge_faq_doc_exists(self) -> None:
        doc = self._read("docs/JUDGE_FAQ_AND_ARCHITECTURE.md")
        self.assertIn("ADR-006", doc)
        self.assertIn("INV-04", doc)
        self.assertIn("$0.024", doc)


if __name__ == "__main__":
    unittest.main()
