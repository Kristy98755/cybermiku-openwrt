#!/usr/bin/env python3
"""Add TP-Link TL-WR840N v6.2 support to an OpenWrt 24.10 source tree."""
import pathlib
import shutil
import sys

if len(sys.argv) != 2:
    sys.exit("usage: apply.py <openwrt-tree>")
TREE = pathlib.Path(sys.argv[1])
SRC = pathlib.Path(__file__).resolve().parent

# 1. DTS
dts_name = "mt7628an_tplink_tl-wr840n-v6.2.dts"
dst = TREE / "target/linux/ramips/dts" / dts_name
shutil.copyfile(SRC / dts_name, dst)
print(f"dts: {dst}")

# 2. device entry in mt76x8.mk
mk = TREE / "target/linux/ramips/image/mt76x8.mk"
text = mk.read_text()
if "Device/tplink_tl-wr840n-v6.2" in text:
    print("mk: already present")
else:
    anchor = "TARGET_DEVICES += tplink_tl-wr840n-v5\n"
    block = """
define Device/tplink_tl-wr840n-v6.2
  $(Device/tplink-v2)
  IMAGE_SIZE := 3968k
  DEVICE_MODEL := TL-WR840N
  DEVICE_VARIANT := v6.2
  TPLINK_FLASHLAYOUT := 4Mmtk
  TPLINK_HWID := 0x08400006
  TPLINK_HWREVADD := 0x7
  IMAGES := sysupgrade.bin
  SUPPORTED_DEVICES += tl-wr840n-v6.2 tplink,tl-wr840n-v6.2
  DEFAULT := n
endef
TARGET_DEVICES += tplink_tl-wr840n-v6.2
"""
    if anchor not in text:
        sys.exit("mk: anchor not found")
    mk.write_text(text.replace(anchor, anchor + block, 1))
    print("mk: device entry inserted")

# 3. board.d 02_network (switch layout + wan mac)
net = TREE / "target/linux/ramips/mt76x8/base-files/etc/board.d/02_network"
text = net.read_text()
if "tplink,tl-wr840n-v6.2" in text:
    print("02_network: already present")
else:
    anchor = "\ttplink,tl-wr840n-v5|\\\n"
    added = anchor + "\ttplink,tl-wr840n-v6.2|\\\n"
    n = text.count(anchor)
    if n == 0:
        sys.exit("02_network: anchor not found")
    net.write_text(text.replace(anchor, added))
    print(f"02_network: added to {n} group(s)")
