"""
Unit Verification Suite for PR #5 Strictly Additive Deliverables:
- api/upi/confirm.js
- api/telemetry.js
- api/patch.js
- public/deck/index.html
- docs/ARCHITECTURE_AND_DEMO_PLAYBOOK.md
"""

from __future__ import annotations

import os
import unittest


REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


class TestServerlessAndDeck(unittest.TestCase):
    def _read(self, rel_path: str) -> str:
        full_path = os.path.join(REPO_ROOT, rel_path)
        self.assertTrue(os.path.isfile(full_path), f"Missing required file: {rel_path}")
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertGreater(len(content.strip()), 0, f"File must be non-empty: {rel_path}")
        return content

    def test_upi_confirm_race_simulator(self) -> None:
        src = self._read("api/upi/confirm.js")
        self.assertIn("504", src)
        self.assertIn("OrderNotFound", src)
        self.assertIn("PAID_RECONCILED", src)
        self.assertIn("ord_zest_4299", src)

    def test_telemetry_endpoint(self) -> None:
        src = self._read("api/telemetry.js")
        self.assertIn("#checkout-sticky-cta", src)
        self.assertIn("#upi-status-poller", src)
        self.assertIn("#place-order-cta", src)
        self.assertIn("PRM-ORB-142", src)

    def test_patch_endpoint_enforces_inv04_whitelist(self) -> None:
        src = self._read("api/patch.js")
        self.assertIn("AST_WHITELIST", src)
        self.assertIn("INV-04_VIOLATION", src)
        self.assertIn("src/components/checkout/StickyPaymentBar.tsx", src)
        self.assertIn("src/server/webhooks/upiConfirm.ts", src)
        self.assertIn("src/components/checkout/PlaceOrderButton.tsx", src)

    def test_pitch_deck_has_8_slides_print_and_inv05_stack(self) -> None:
        html = self._read("public/deck/index.html")
        for i in range(1, 9):
            self.assertIn(f"Slide {i}", html)
        self.assertIn("@media print", html)
        for model_or_tool in (
            "Gemini Omni",
            "Gemini Live",
            "Gemma 4 31B",
            "Nano Banana",
            "Lyria",
            "Google Antigravity",
            "Google Agent Skills",
            "Google AI Studio",
        ):
            self.assertIn(model_or_tool, html)

    def test_architecture_playbook_has_mermaid(self) -> None:
        doc = self._read("docs/ARCHITECTURE_AND_DEMO_PLAYBOOK.md")
        self.assertIn("```mermaid", doc)
        self.assertIn("sequenceDiagram", doc)
        self.assertIn("stateDiagram-v2", doc)


if __name__ == "__main__":
    unittest.main()
