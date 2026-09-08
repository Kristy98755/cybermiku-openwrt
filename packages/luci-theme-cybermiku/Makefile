include $(TOPDIR)/rules.mk

PKG_NAME:=luci-theme-cybermiku
PKG_VERSION:=1.0
PKG_RELEASE:=12

PKG_LICENSE:=MIT
PKG_MAINTAINER:=CyberMiku <admin@cybermiku.local>

LUCI_TITLE:=CyberMiku Dark Cyberpunk Theme
LUCI_PKGARCH:=all
LUCI_DEPENDS:=+luci-base

LUCI_THEME_NAME:=cybermiku

include $(TOPDIR)/feeds/luci/luci.mk

define Package/$(PKG_NAME)/conffiles
/etc/uci-defaults/90-cybermiku-theme
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
