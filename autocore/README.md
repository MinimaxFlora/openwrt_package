# autocore

OpenWrt 硬件信息与性能增强包，适配 **OpenWrt 25.12**（ipk / apk 双格式）。

fork 自 [ImmortalWrt 官方 autocore](https://github.com/immortalwrt/autocore)，针对 25.12 的 LuCI / rpcd / ucode 环境适配，并增加实时网速显示等增强。

---

## ✨ 功能

### 🖥️ x86 / x64（`autocore-x86`）
- **RPS 多队列负载均衡**：开机自动按 CPU 线程数计算 rps_cpus 掩码，分摊网卡 RX 队列中断负载
- **硬件 offload**：自动开启网卡 `rx-checksum / tso / gso / ufo` 等硬件卸载，降低 CPU 占用
- **状态页硬件信息**：CPU 型号 / 频率 / 使用率、内存、负载、温度等

### 🤖 ARM / AArch64（`autocore-arm`）
- **CPU / WiFi 温度**：ucode 脚本读取 thermal zone 与 mt76 无线温度，LuCI 状态页直接显示
- 支持 ipq40xx / ipq806x 等平台（含 mt76 温度特殊处理）

### 📊 LuCI 状态页增强（通用）
- **系统信息**：替换默认 status 页系统信息模块（`10_system.js`）
- **端口信息**：网口 / 连接状态概览（`29_ports.js`）
- **实时网速**：接口 RX/TX 实时速率表，自动刷新（`35_network_speed.js`）
- **进程列表**：ucode 版进程列表，支持排序（`sys.uc`）
- **中文语言包**：内置 zh-cn 翻译（CPU usage / 帮助反馈等）

---

## 📦 使用方法

### 编译进固件（推荐）

```bash
# 将本仓库加入 feeds（以 openwrt-25.12 分支为例）
git clone -b openwrt-25.12 https://github.com/MinimaxFlora/autocore.git package/autocore
./scripts/feeds update -a
./scripts/feeds install -a

# menuconfig 选择：
#   Utilities → autocore-arm  （ARM 设备）
#   Utilities → autocore-x86  （x86/x64 设备）
```

### 单独编译 ipk / apk

使用 [gh-action-sdk](https://github.com/MinimaxFlora/gh-action-sdk) 或本地 SDK：

```bash
make package/autocore/compile V=s
# 产物: bin/packages/<arch>/packages_ci/autocore-*.ipk|apk
```

---

## 🔧 依赖

| 包 | 架构 | 依赖 |
| --- | --- | --- |
| `autocore-x86` | x86/x64 | `lm-sensors` `ethtool` `luci-base` + 中文语言 |
| `autocore-arm` | arm/aarch64 | `luci-base` + 中文语言（树莓派额外依赖 `bcm27xx-userland`，bcm53xx 额外依赖 `nvram`） |

> 需要 LuCI 启用 zh-cn 语言（`@LUCI_LANG_zh_Hans`），否则包内中文翻译不生效。

---

## 📁 文件结构

```
├── Makefile                     # 包定义（arm / x86 双变体）
├── files/
│   ├── arm/tempinfo             # ARM CPU/WiFi 温度读取（ucode）
│   ├── x86/autocore             # x86 RPS + offload 开机脚本
│   └── generic/
│       ├── 10_system.js         # 状态页系统信息
│       ├── 29_ports.js          # 状态页端口信息
│       ├── 35_network_speed.js  # 实时网速表
│       ├── sys.uc               # ucode 进程列表
│       ├── 090-autocore         # 首启部署脚本（uhttpd → rpcd）
│       └── luci-mod-status-autocore.json  # rpcd ACL
└── i18n/
    └── autocore.zh_Hans.po      # 中文翻译源
```

---

## ⚖️ 版权与致谢

- 原版 [Lean](https://github.com/coolsnowwolf)（Lean's OpenWrt）autocore
- [ImmortalWrt](https://github.com/immortalwrt) 官方 autocore
- 25.12 适配与增强：[sbwml](https://github.com/sbwml)

MIT / GPL-3.0 兼容（沿用上游许可）。
