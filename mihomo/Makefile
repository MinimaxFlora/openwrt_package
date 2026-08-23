include $(TOPDIR)/rules.mk

PKG_NAME:=mihomo
PKG_VERSION:=1.19.30
PKG_RELEASE:=1

PKG_SOURCE:=$(PKG_NAME)-$(PKG_VERSION).tar.gz
PKG_SOURCE_SUBDIR:=$(PKG_NAME)-$(PKG_VERSION)
PKG_SOURCE_PROTO:=git
PKG_SOURCE_URL:=https://github.com/MetaCubeX/mihomo.git
PKG_SOURCE_VERSION:=v1.19.30
# OpenWrt SDK (24.10+) enforces PKG_MIRROR_HASH for git sources; the
# multi-arch release workflow builds the Makefile as-is (no PKG_VERSION
# rewrite), so the archive name stays mihomo-1.19.30.tar.gz and the hash
# is stable across the gh-action-sdk images (as upstream nikki does).
PKG_MIRROR_HASH:=31caf16c4060193e817db55831058c83d7b3dcba490983d4da489dfed3973327

PKG_LICENSE:=GPL3.0+
PKG_MAINTAINER:=MinimaxFlora <265198154+MinimaxFlora@users.noreply.github.com>

PKG_BUILD_DEPENDS:=golang/host
PKG_BUILD_PARALLEL:=1
PKG_BUILD_FLAGS:=no-mips16

PKG_BUILD_VERSION:=v1.19.30
PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)-$(PKG_VERSION)
PKG_BUILD_TIME:=$(shell date -u -Iseconds)

GO_PKG:=github.com/metacubex/mihomo
GO_PKG_BUILD_PKG:=github.com/metacubex/mihomo
GO_PKG_LDFLAGS_X:=$(GO_PKG)/constant.Version=$(PKG_BUILD_VERSION) $(GO_PKG)/constant.BuildTime=$(PKG_BUILD_TIME)
GO_PKG_TAGS:=with_gvisor
GO_PKG_INSTALL_BIN_PATH:=/usr/libexec

include $(INCLUDE_DIR)/package.mk
include $(TOPDIR)/feeds/packages/lang/golang/golang-package.mk

define Package/mihomo
  SECTION:=net
  CATEGORY:=Network
  TITLE:=Transparent Proxy with Mihomo on OpenWrt.
  URL:=https://github.com/MinimaxFlora/luci-app-mihomo
  DEPENDS:=$(GO_ARCH_DEPENDS) +ca-bundle +curl +yq +firewall4 +ip-full +kmod-inet-diag +kmod-nft-socket +kmod-nft-tproxy +kmod-tun +kmod-dummy
  ALTERNATIVES:=\
    300:/usr/bin/mihomo:/usr/libexec/mihomo
endef

define Package/mihomo/conffiles
/etc/config/mihomo
/etc/mihomo/mixin.yaml
endef

define Package/mihomo/install
	$(INSTALL_DIR) $(1)/etc/mihomo
	$(INSTALL_DIR) $(1)/etc/mihomo/ucode
	$(INSTALL_DIR) $(1)/etc/mihomo/scripts
	$(INSTALL_DIR) $(1)/etc/mihomo/nftables
	$(INSTALL_DIR) $(1)/etc/mihomo/profiles
	$(INSTALL_DIR) $(1)/etc/mihomo/subscriptions
	$(INSTALL_DIR) $(1)/etc/mihomo/run
	$(INSTALL_DIR) $(1)/etc/mihomo/run/providers
	$(INSTALL_DIR) $(1)/etc/mihomo/run/providers/rule
	$(INSTALL_DIR) $(1)/etc/mihomo/run/providers/proxy

	$(INSTALL_DATA) $(CURDIR)/files/mixin.yaml $(1)/etc/mihomo/mixin.yaml

	$(INSTALL_BIN) $(CURDIR)/files/ucode/include.uc $(1)/etc/mihomo/ucode/include.uc
	$(INSTALL_BIN) $(CURDIR)/files/ucode/mixin.uc $(1)/etc/mihomo/ucode/mixin.uc
	$(INSTALL_BIN) $(CURDIR)/files/ucode/hijack.ut $(1)/etc/mihomo/ucode/hijack.ut

	$(INSTALL_BIN) $(CURDIR)/files/scripts/include.sh $(1)/etc/mihomo/scripts/include.sh
	$(INSTALL_BIN) $(CURDIR)/files/scripts/firewall_include.sh $(1)/etc/mihomo/scripts/firewall_include.sh
	$(INSTALL_BIN) $(CURDIR)/files/scripts/debug.sh $(1)/etc/mihomo/scripts/debug.sh

	$(INSTALL_BIN) $(CURDIR)/files/nftables/geoip_cn.nft $(1)/etc/mihomo/nftables/geoip_cn.nft
	$(INSTALL_BIN) $(CURDIR)/files/nftables/geoip6_cn.nft $(1)/etc/mihomo/nftables/geoip6_cn.nft

	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) $(CURDIR)/files/mihomo.conf $(1)/etc/config/mihomo

	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) $(CURDIR)/files/mihomo.init $(1)/etc/init.d/mihomo

	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) $(CURDIR)/files/uci-defaults/firewall.sh $(1)/etc/uci-defaults/99_firewall_mihomo
	$(INSTALL_BIN) $(CURDIR)/files/uci-defaults/init.sh $(1)/etc/uci-defaults/99_init_mihomo
	$(INSTALL_BIN) $(CURDIR)/files/uci-defaults/migrate.sh $(1)/etc/uci-defaults/99_migrate_mihomo

	$(INSTALL_DIR) $(1)/lib/upgrade/keep.d
	$(INSTALL_DATA) $(CURDIR)/files/mihomo.upgrade $(1)/lib/upgrade/keep.d/mihomo

	$(call GoPackage/Package/Install/Bin,$(1))
endef

define Package/mihomo/postrm
#!/bin/sh
if [ -z $${IPKG_INSTROOT} ]; then
	uci -q batch <<-EOF > /dev/null
		del firewall.mihomo
		commit firewall
	EOF
fi
endef

define Build/Prepare
	$(Build/Prepare/Default)
	$(RM) -r $(PKG_BUILD_DIR)/rules/logic_test
endef

$(eval $(call GoPackage,mihomo))
$(eval $(call BuildPackage,mihomo))
