<div align="center">

# 📦 OpenWrt Package

### 科学上网插件与 LuCI 主题备份仓库 · 防上游炸源 · 开箱即用

![License](https://img.shields.io/badge/License-MIT-0d1117?style=for-the-badge&labelColor=161b22&color=30363d)
![Packages](https://img.shields.io/badge/包数量-54-56d4dd?style=for-the-badge&labelColor=161b22&color=30363d)
![OpenWrt](https://img.shields.io/badge/OpenWrt-24.10%20%7C%2025.12-00A98F?style=for-the-badge&logo=openwrt&logoColor=white&labelColor=161b22&color=30363d)
![Platform](https://img.shields.io/badge/架构-全平台-ff7b72?style=for-the-badge&labelColor=161b22&color=30363d)

**防止插件上游激进改动导致编译失败 —— 备份并按需同步，确保插件始终可用**

</div>

---

## ✨ 特性

| | | |
| :--- | :--- | :--- |
| 🛡️ **防炸备份** | 📦 **54 个包** | 🎨 **6 套 LuCI 主题** |
| 锁定稳定版本，上游改动不影响编译 | 科学上网全家桶 + 实用工具 | Argon / Vantage / Aurora / Design / Shadcn / Fluent |
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

> 下表的版本号由 [`packages.lock.json`](packages.lock.json) 对齐（该文件由 `tools/gen-lock.py`
> 从每个包的 Makefile 生成，CI 里 `python3 tools/gen-lock.py --check` 会校验它没过期）。
> 想知道某个包来自哪个上游，直接看 lock 文件里的 `PKG_SOURCE_URL` / `PKG_SOURCE_VERSION`。

### 🌐 代理内核

| 包 | 版本 | 说明 |
| :--- | :---: | :--- |
| `sing-box` | 1.14.3 | 通用代理内核（V2Ray / Hysteria2 / TUIC 等） |
| `sing-box-tiny` | 1.14.3 | sing-box 精简版（体积小、功能裁剪） |
| `xray-core` | 26.11.9 | Xray 内核 |
| `naiveproxy` | 154.0.8037.49 | NaiveProxy 客户端 |
| `hysteria` | 2.13.0 | Hysteria 2 协议客户端 |
| `shadowsocks-rust` | 1.25.0 | Shadowsocks Rust 实现 |
| `shadowsocksr-libev` | 2.5.6 | ShadowsocksR 客户端 |
| `shadow-tls` | 0.2.25 | Shadow-TLS 混淆 |
| `simple-obfs-client` / `-server` | 0.0.5 | 简单混淆插件 |
| `v2ray-plugin` | 5.49.0 | V2Ray 传输插件 |
| `xray-plugin` | 1.8.24 | Xray 传输插件 |
| `v2ray-geoip` / `v2ray-geosite` | - | GeoIP / GeoSite 数据 |

### 🧩 LuCI 应用

| 包 | 版本 | 说明 |
| :--- | :---: | :--- |
| `luci-app-openclash` | 0.48.002 | OpenClash |
| `luci-app-passwall` | 26.11.11 | PassWall 科学上网 |
| `luci-app-passwall2` | 26.11.11 | PassWall 2 |
| `luci-app-homeproxy` | - | HomeProxy |
| `luci-app-mosdns` | 1.7.15 | MosDNS 图形化 |
| `luci-app-adguardhome` | 1.1.1 | AdGuard Home 图形化 |
| `luci-app-openlist2` | 1.0.3 | OpenList2 网盘聚合 |
| `luci-app-quickfile` | 1.0.0 | 文件快速管理（需 nginx） |
| `luci-app-diskman` | 1.0.0 | 磁盘管理 |
| `luci-app-ramfree` | 1.0 | 内存清理 |
| `luci-app-socat` | 1.1 | socat 图形化 |
| `luci-app-mentohust` | 1.0.2 | 校园网锐捷认证 |
| `luci-app-airconnect` | 1.0.3 | AirConnect 图形化 |
| `luci-app-bandix-plus` | 0.1.3 | 流量监控 |

### 🔧 命令行工具

| 包 | 版本 | 说明 |
| :--- | :---: | :--- |
| `mosdns` | 5.3.4 | DNS 转发/分流 |
| `chinadns-ng` | 2025.08.09 | 中国 DNS 分流 |
| `dns2socks` | 2.1 | DNS 转 SOCKS |
| `ipt2socks` | 1.1.4 | iptables 转 SOCKS |
| `microsocks` | 1.0.5 | 轻量 SOCKS5 服务器 |
| `tcping` | 0.3 | TCP Ping 工具 |
| `openlist2` | 4.2.9 | OpenList2 核心 |
| `quickfile` | 2.0.9 | QuickFile 核心 |
| `mentohust` | 0.3.1 | 锐捷认证核心 |
| `airconnect` | 1.12.4 | AirPlay 接收（DLNA 投屏） |
| `bandix-plus` | 0.1.3 | 流量监控核心 |
| `geoview` | 0.2.9 | Geo 数据查看 |
| `geo2txt` | 1.0.0 | Geo 数据转文本 |
| `autocore-x86` / `autocore-arm` | 1.0.1 | 硬件信息页（non-shared，按架构） |

### 🎨 LuCI 主题

| 包 | 版本 | 说明 |
| :--- | :---: | :--- |
| `luci-theme-argon` + `luci-app-argon-config` | 3.1.3 | Argon 主题（最流行） |
| `luci-theme-vantage` + `luci-app-vantage` | 1.0.20 | Vantage 主题（自带 dashboard 应用） |
| `luci-theme-aurora` + `luci-app-aurora-config` | 1.4.3 / 1.2.5 | Aurora 主题 |
| `luci-theme-design` | 7.1 | Design 主题 |
| `luci-theme-shadcn` | 0.6.3 | Shadcn 主题 |
| `luci-theme-fluent` / `-lite` + `luci-mod-fluentdashboard` | 1.0.9 | Fluent 主题 |

> 这份清单和仓库实际内容一致（当前 50 个构建目标、共 54 个包）：`python3 tools/list-packages.py`
> 从各 Makefile 直接读出来，CI 的「全部」构建也用它生成，不会再出现列表里写着但仓库里
> 没有的包。注意一个目录可能编出多个包：`autocore` → autocore-x86/arm、
> `simple-obfs` → client/server、`v2ray-geodata` → geoip/geosite。

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
