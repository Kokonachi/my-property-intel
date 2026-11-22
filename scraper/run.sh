#!/usr/bin/env bash
# One-command re-run of the real-data pilot. Usage: scraper/run.sh [--areas mont-kiara,klcc,bangsar] [--max-projects 10]
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -x .venv/bin/python ]; then python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt; fi
.venv/bin/python scrape.py "$@"
