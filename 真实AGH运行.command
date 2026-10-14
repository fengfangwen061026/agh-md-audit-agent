#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
if [ -z "${AGNES_API_KEY:-}" ]; then
  read -r -s -p "Agnes API key（仅在本次进程使用）: " AGNES_API_KEY
  printf "\n"
  export AGNES_API_KEY
fi
node scripts/run_agh_real.mjs "$@"
