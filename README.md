<div align="center">

# 📦 OpenWrt Package

### 科学上网插件与 LuCI 主题备份仓库 · 防上游炸源 · 开箱即用

![License](https://img.shields.io/badge/License-MIT-0d1117?style=for-the-badge&labelColor=161b22&color=30363d)
![Packages](https://img.shields.io/badge/包数量-45-56d4dd?style=for-the-badge&labelColor=161b22&color=30363d)
![OpenWrt](https://img.shields.io/badge/OpenWrt-24.10%20%7C%2025.12-00A98F?style=for-the-badge&logo=openwrt&logoColor=white&labelColor=161b22&color=30363d)
![Platform](https://img.shields.io/badge/架构-全平台-ff7b72?style=for-the-badge&labelColor=161b22&color=30363d)

**防止插件上游激进改动导致编译失败 —— 备份并按需同步，确保插件始终可用**

</div>

---

## ✨ 特性

| | | |
| :--- | :--- | :--- |
| 🛡️ **防炸备份** | 📦 **45 个常用包** | 🎨 **5 套 LuCI 主题** |
| 锁定稳定版本，上游改动不影响编译 | 科学上网全家桶 + 实用工具 | Argon / Kucat / Aurora / Design / Shadcn |
| 🔄 **按需同步** | 🖥️ **全架构支持** | ⚡ **即克隆即用** |
| 需要时手动更新，版本可控 | x86 / ARM / 全平台通用 | 直接加入 feeds 即可编译 |

---

## 📥 使用方法

将本仓库加入你的 OpenWrt 固件构建流程（配合 [gh-action-imagebuilder](https://github.com/MinimaxFlora/gh-action-imagebuilder) 或 ImmortalWrt 源码）：

```shell
# 1. 移除 openwrt feeds 自带的核心包（避免冲突）
rm -rf feeds/packages/net/{xray-core,v2ray-core,v2ray-geodata,sing-box}

# 2. 克隆本仓库为 helloworld 包源
git clone https://github.com/MinimaxFlora/openwrt_package package/helloworld

# 3. （可选）更新 golang 版本，避免版本过旧编译失败
rm -rf feeds/packages/lang/golang
git clone https://github.com/sbwml/packages_lang_golang -b 26.x feeds/packages/lang/golang
```

> 💡 配合 [Firmware-Build](https://github.com/MinimaxFlora/Firmware-Build) 一键构建工作流使用效果更佳，
> 插件会自动通过 Extras_Paclages 仓库导入。

---

## 📦 包列表

### 🌐 代理核心

| 包 | 版本 | 说明 |
| :--- | :---: | :--- |
| `mihomo-meta` | 1.19.29 | Mihomo (Clash Meta) 内核 |
| `sing-box` | 1.12.25 | 通用代理内核（V2Ray / Hysteria2 / TUIC 等） |
| `xray-core` | 26.7.28 | Xray 内核 |
| `naiveproxy` | 150.0.7871.63 | NaiveProxy 客户端 |
| `hysteria` | 2.12.1 | Hysteria 2 协议客户端 |
| `v2ray-geodata` | - | V2Ray GeoIP / GeoSite 数据 |

### 🧩 代理插件（LuCI 应用）

| 包 | 版本 | 说明 |
| :--- | :---: | :--- |
| `luci-app-openclash` | 0.47.133 | OpenClash（Mihomo 图形化） |
| `luci-app-passwall` | 26.8.1 | PassWall 科学上网 |
| `luci-app-passwall2` | 26.8.7 | PassWall 2 |
| `luci-app-homeproxy` | - | HomeProxy |
| `luci-app-nikki` | 1.26.1 | Nikki（Mihomo TUN 模式） |
| `luci-app-mosdns` | 1.7.4 | MosDNS 图形化 |
| `luci-app-openlist2` | 1.0.3 | OpenList2 |
| `luci-app-mentohust` | 1.0.2 | 校园网锐捷认证 |

### 🔧 代理工具

| 包 | 版本 | 说明 |
| :--- | :---: | :--- |
| `mosdns` | 5.3.4 | DNS 转发/分流 |
| `chinadns-ng` | 2025.08.09 | 中国 DNS 分流 |
| `dns2socks` | 2.1 | DNS 转 SOCKS |
| `shadowsocks-rust` | 1.24.0 | Shadowsocks Rust 实现 |
| `shadowsocksr-libev` | 2.5.6 | ShadowsocksR 客户端 |
| `v2ray-plugin` | 5.49.0 | V2Ray 传输插件 |
| `xray-plugin` | 1.8.24 | Xray 传输插件 |
| `shadow-tls` | 0.2.25 | Shadow-TLS 混淆 |
| `simple-obfs` | 0.0.5 | 简单混淆插件 |
| `ipt2socks` | 1.1.4 | iptables 转 SOCKS |
| `tcping` | 0.3 | TCP Ping 工具 |
| `microsocks` | 1.0.5 | 轻量 SOCKS5 服务器 |
| `nikki` | 2026.04.08 | Nikki 核心 |
| `openlist2` | 4.2.5 | OpenList2 核心 |
| `mentohust` | 0.3.1 | 锐捷认证核心 |
| `v2dat` | - | V2Ray dat 解析工具 |
| `geoview` | 0.2.6 | Geo 数据查看 |

### 🎵 多媒体

| 包 | 版本 | 说明 |
| :--- | :---: | :--- |
| `airconnect` | 1.11.2 | AirPlay 接收（DLNA 投屏） |
| `luci-app-airconnect` | 1.0.3 | AirConnect 图形化 |

### 🛠 系统工具

| 包 | 版本 | 说明 |
| :--- | :---: | :--- |
| `luci-app-diskman` | 1.0.0 | 磁盘管理 |
| `luci-app-quickfile` | 1.0.0 | 文件快速管理 |
| `luci-app-ramfree` | 1.0 | 内存清理 |
| `quickfile` | 1.0.25 | QuickFile 核心 |

### 🎨 LuCI 主题

| 包 | 版本 | 说明 |
| :--- | :---: | :--- |
| `luci-theme-argon` | 2.4.6 | Argon 主题（最流行） |
| `luci-theme-kucat` | 3.3.2 | Kucat 主题 |
| `luci-theme-aurora` | 1.2.0 | Aurora 主题 |
| `luci-theme-design` | 7.1 | Design 主题 |
| `luci-theme-shadcn` | 0.4.0 | Shadcn 主题 |
| `luci-app-argon-config` | 1.0 | Argon 主题配置 |
| `luci-app-aurora-config` | 1.2.0 | Aurora 主题配置 |
| `luci-app-kucat-config` | 2.2.1 | Kucat 主题配置 |

---

## 🧭 配合使用

| 仓库 | 用途 |
| :--- | :--- |
| [gh-action-imagebuilder](https://github.com/MinimaxFlora/gh-action-imagebuilder) | OpenWrt 固件构建 Action |
| [Extras_Paclages](https://github.com/MinimaxFlora/Extras_Paclages) | 编译好的 ipk/apk 插件包（按架构） |
| [Firmware-Build](https://github.com/MinimaxFlora/Firmware-Build) | 一键固件构建工作流 |

---

<div align="center">

**Made with ❤️ by [MinimaxFlora](https://github.com/MinimaxFlora)**

</div>
