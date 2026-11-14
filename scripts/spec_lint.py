import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
"""Validate the repository's spec-driven structure and core invariants."""

from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
REQUIRED_FILES = (
    "BRIEF.md",
    "CONTRACT.md",
    "AGENTS.md",
    "spec/product.md",
    "spec/architecture.md",
    "spec/tasks.md",
    "spec/smoke.md",
)


def main() -> int:
    missing = [path for path in REQUIRED_FILES if not (ROOT / path).is_file()]
    if missing:
        for path in missing:
            print(f"missing required file: {path}", file=sys.stderr)
        return 1

    contract = (ROOT / "CONTRACT.md").read_text(encoding="utf-8-sig")
    tasks = (ROOT / "spec" / "tasks.md").read_text(encoding="utf-8-sig")
    if "$0" not in contract or "Zero-Budget" not in contract:
        print("contract must declare the zero-budget invariant", file=sys.stderr)
        return 1
    if not re.search(r"T-\d+", tasks):
        print("spec/tasks.md must contain at least one task ID", file=sys.stderr)
        return 1

    print("spec lint passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
