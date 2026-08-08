#!/usr/bin/env python3
"""Bring a database up to date, from empty or from an older deployment.

This is what the container runs before serving traffic. It is idempotent, so it
is safe on every deploy, and it fails loudly rather than starting an API on a
half-built schema.

Order matters:
  1. base schema + default restaurant/admin/settings  (schema_reference.init_db)
  2. incremental migrations                            (migrations/*.sql)
  3. optional menu seed                                (SEED_MENU=true)

Running the migrations first against an empty database fails with
"relation restaurants does not exist", which is exactly how a first deploy
breaks if the steps get reversed.
"""
import os
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))


def _run(label: str, args: list[str]) -> None:
    print(f"\n── {label} " + "─" * max(0, 60 - len(label)), flush=True)
    result = subprocess.run(args, cwd=str(BACKEND_DIR))
    if result.returncode != 0:
        print(f"\nBootstrap failed during: {label}", file=sys.stderr)
        sys.exit(result.returncode)


def main() -> int:
    if not os.getenv("DATABASE_URL"):
        print("DATABASE_URL is not set — refusing to start.", file=sys.stderr)
        return 2

    python = sys.executable
    _run("base schema and seed data", [python, "schema_reference.py"])
    _run("migrations", [python, "scripts/migrate.py"])

    if os.getenv("SEED_MENU", "").strip().lower() in {"1", "true", "yes", "on"}:
        _run("Six Seven menu seed", [python, "scripts/seed_six_seven.py"])
    else:
        print("\n(SEED_MENU not set — leaving menu and settings untouched)")

    print("\nBootstrap complete.\n", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
