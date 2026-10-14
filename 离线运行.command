#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
node scripts/demo.mjs
open outputs/index.html
