#!/usr/bin/env bash
# usage: ./setup.sh <openwrt-tree>
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 "$here/apply.py" "${1:?openwrt tree dir}"
