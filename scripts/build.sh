#!/usr/bin/env bash
# CyberMiku OpenWrt firmware build script.
# Builds the TL-WR841HP v3 image from pinned OpenWrt sources + CyberMiku packages.
# Usage:
#   OPENWRT_DIR=/work/openwrt bash scripts/build.sh      (from repo root)
#   OPENWRT_DIR=... JOBS=8 bash scripts/build.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

OPENWRT_DIR="${OPENWRT_DIR:?OPENWRT_DIR not set}"
JOBS="${JOBS:-$(nproc)}"

# shellcheck source=/dev/null
source "$REPO_DIR/config/refs.env"

echo "=== [cybermiku] cloning OpenWrt @ ${OPENWRT_SHA}"
git clone --no-checkout https://git.openwrt.org/openwrt/openwrt.git "$OPENWRT_DIR"
git -C "$OPENWRT_DIR" checkout --quiet "${OPENWRT_SHA}"

echo "=== [cybermiku] updating feeds"
cd "$OPENWRT_DIR"
./scripts/feeds update -a

echo "=== [cybermiku] pinning feed revisions"
git -C feeds/luci      checkout --quiet "${FEED_LUCI}"
git -C feeds/packages  checkout --quiet "${FEED_PACKAGES}"
git -C feeds/routing   checkout --quiet "${FEED_ROUTING}"
git -C feeds/telephony checkout --quiet "${FEED_TELEPHONY}"

echo "=== [cybermiku] applying feed patches (libwebsockets-mbedtls + ttyd)"
git -C feeds/packages apply --quiet "$REPO_DIR/patches/001-feeds-packages-lws-ttyd.patch"

echo "=== [cybermiku] installing custom packages"
mkdir -p package/custom
cp -a "$REPO_DIR/packages/"* package/custom/

echo "=== [cybermiku] applying configuration"
cp "$REPO_DIR/config/cybermiku.config" .config
make defconfig >/dev/null

echo "=== [cybermiku] full build (-j${JOBS})"
make -j"${JOBS}"

echo "=== [cybermiku] regenerating rootfs and images (serial, verbose)"
rm -rf build_dir/target-*/root-ath79 \
       build_dir/target-*/root.squashfs \
       build_dir/target-*/root.orig-ath79
make package/install
make V=s -j1 target/install

echo "=== [cybermiku] artifacts"
ls -la bin/targets/ath79/generic/