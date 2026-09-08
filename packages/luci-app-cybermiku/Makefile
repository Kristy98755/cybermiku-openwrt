include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-cybermiku
PKG_VERSION:=1.0
PKG_RELEASE:=11

PKG_LICENSE:=MIT
PKG_MAINTAINER:=CyberMiku <admin@cybermiku.local>

LUCI_TITLE:=CyberMiku Control Panel
LUCI_PKGARCH:=all
LUCI_DEPENDS:=+luci-base +uhttpd +rpcd

include $(TOPDIR)/feeds/luci/luci.mk

$(eval $(call BuildPackage,$(PKG_NAME)))
