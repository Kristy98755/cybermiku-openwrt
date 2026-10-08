#!/usr/bin/env bash
# Build a cybermiku image for TP-Link TL-WR840N v6.2 (ramips/mt76x8, 4 MB).
# usage: build.sh [config-file]   (runs inside the OpenWrt build tree)
set -euo pipefail
# WSL launches this from Windows: Windows PATH entries (e.g. "Program Files")
# break find -execdir during package/install, so keep a clean Linux PATH.
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/lib/wsl/lib
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
tree="${OPENWRT_TREE:-$HOME/openwrt-build}"
cfg="${1:-$repo/config/wr840n-v6.config}"

cd "$tree"

mkdir -p package/custom
rm -rf package/custom/luci-app-cybermiku package/custom/luci-theme-cybermiku
cp -r "$repo/packages/luci-app-cybermiku" "$repo/packages/luci-theme-cybermiku" package/custom/

"$here/setup.sh" "$tree"

cp "$cfg" .config
make defconfig

echo "== device =="
grep -E '^CONFIG_TARGET_ramips_mt76x8_DEVICE' .config || true
echo "== packages =="
grep -E '^CONFIG_PACKAGE_[a-z0-9_.+-]+=y' .config | wc -l
echo "== diffconfig =="
./scripts/diffconfig.sh || true

make -j"$(nproc)"
