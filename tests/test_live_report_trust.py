"""
Python unittest wrapper for the deterministic RFC-20261117 Live Report Trust suite
(T-305, T-306, T-307, T-308, T-309, T-310).
"""

from __future__ import annotations

import os
import subprocess
import unittest


REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


class TestLiveReportTrustSuite(unittest.TestCase):
    def test_node_live_report_trust_regressions(self) -> None:
        script = os.path.join(REPO_ROOT, "tests", "test_live_report_trust.mjs")
        self.assertTrue(os.path.isfile(script), "Missing tests/test_live_report_trust.mjs")
        proc = subprocess.run(
            ["node", "--test", script],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            timeout=20,
        )
        self.assertEqual(
            proc.returncode,
            0,
            f"Node live report trust suite failed:\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}",
        )


if __name__ == "__main__":
    unittest.main()
