"""
Storefront, Vercel Routing & HF Spaces Manifest Smoke Verification
Standard-library unittest suite (<2s, zero external pip dependencies).
"""

from __future__ import annotations

import json
import os
import unittest


REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


class TestStorefrontAndApiSmoke(unittest.TestCase):
    def test_demo_storefront_bug_modes_and_orb(self) -> None:
        store_path = os.path.join(REPO_ROOT, "public", "demo-store", "index.html")
        self.assertTrue(os.path.isfile(store_path), "public/demo-store/index.html must exist")
        with open(store_path, "r", encoding="utf-8") as f:
            html = f.read()

        for bug_mode in ("S1_HINDI_OVERFLOW", "S2_UPI_TIMEOUT", "S3_DARKMODE_CONTRAST"):
            self.assertIn(bug_mode, html)

        for target_id in ("checkout-sticky-cta", "upi-status-poller", "place-order-cta"):
            self.assertIn(target_id, html)

        self.assertIn('<script src="/orb.js"', html)

    def test_vercel_json_route_priority(self) -> None:
        vercel_path = os.path.join(REPO_ROOT, "vercel.json")
        self.assertTrue(os.path.isfile(vercel_path), "vercel.json must exist")
        with open(vercel_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)

        rewrites = cfg.get("rewrites", [])
        sources = [r.get("source", "") for r in rewrites]
        self.assertTrue(any("/api/" in s for s in sources), "vercel.json must route /api/*")
        self.assertTrue(any("/demo-store/" in s for s in sources), "vercel.json must route /demo-store/*")
        self.assertIn("/orb.js", sources)
        self.assertIn("/standalone-demo.html", sources)

    def test_backend_hf_spaces_manifest(self) -> None:
        readme_path = os.path.join(REPO_ROOT, "backend", "README.md")
        self.assertTrue(os.path.isfile(readme_path), "backend/README.md must exist")
        with open(readme_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("sdk: docker", content)
        self.assertIn("app_port: 7860", content)


if __name__ == "__main__":
    unittest.main()
