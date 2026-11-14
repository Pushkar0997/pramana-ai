"""
Cross-Surface Integration & Invariant Suite (Pramana AI v1.0.0 Release Candidate)
Validates the unified main branch across all 5 merged PRs:
- 5 Serverless API Endpoints (api/)
- 4 Interactive Web Surfaces (index.html, demo-store, proof, deck)
- Frontend Integration Wiring (src/App.jsx)
- Vercel Multi-Route Integrity (vercel.json)
- Spec Gate Integrity (scripts/spec_lint.py)
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import unittest


REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


class TestEndToEndContracts(unittest.TestCase):
    def _read(self, rel_path: str) -> str:
        full_path = os.path.join(REPO_ROOT, rel_path)
        self.assertTrue(os.path.isfile(full_path), f"Missing required file: {rel_path}")
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertGreater(len(content.strip()), 0, f"File must be non-empty: {rel_path}")
        return content

    def test_all_5_serverless_api_endpoints_present_and_valid(self) -> None:
        endpoints = (
            "api/health.js",
            "api/audit.js",
            "api/upi/confirm.js",
            "api/telemetry.js",
            "api/patch.js",
        )
        for ep in endpoints:
            self._read(ep)

        audit_src = self._read("api/audit.js")
        self.assertIn("0.025", audit_src)
        self.assertIn("0.024", audit_src)

        patch_src = self._read("api/patch.js")
        self.assertIn("AST_WHITELIST", patch_src)
        self.assertIn("INV-04_VIOLATION", patch_src)

    def test_all_4_interactive_web_surfaces_present(self) -> None:
        surfaces = (
            "index.html",
            "public/demo-store/index.html",
            "public/proof/index.html",
            "public/deck/index.html",
        )
        for surface in surfaces:
            self._read(surface)

    def test_frontend_integration_wiring_in_app_jsx(self) -> None:
        app_src = self._read("src/App.jsx")
        for symbol in (
            "useLiveAudit",
            "LiveTelemetryStrip",
            "extractBrandFromUrl",
            "/demo-store/index.html",
            "/proof/index.html",
            "/deck/index.html",
        ):
            self.assertIn(symbol, app_src, f"src/App.jsx missing expected wiring: {symbol}")

    def test_vercel_multi_route_integrity(self) -> None:
        raw = self._read("vercel.json")
        cfg = json.loads(raw)
        rewrites = cfg.get("rewrites", [])
        sources = " ".join(r.get("source", "") for r in rewrites)
        for prefix in ("/api/", "/demo-store/", "/proof/", "/deck/", "/orb.js"):
            self.assertIn(prefix, sources, f"vercel.json missing rewrite rule for {prefix}")

    def test_spec_gate_integrity(self) -> None:
        lint_script = os.path.join(REPO_ROOT, "scripts", "spec_lint.py")
        self.assertTrue(os.path.isfile(lint_script), "scripts/spec_lint.py must exist")
        proc = subprocess.run(
            [sys.executable, lint_script],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            timeout=15,
        )
        self.assertEqual(proc.returncode, 0, f"spec_lint.py failed:\n{proc.stdout}\n{proc.stderr}")


if __name__ == "__main__":
    unittest.main()
