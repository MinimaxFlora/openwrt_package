#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""list-packages.py — 打印本仓库能编的构建目标（空格分隔，供 CI 直接用）

    python3 tools/list-packages.py            # 全部构建目标
    python3 tools/list-packages.py --count    # 只打印数量
    python3 tools/list-packages.py --packages # 打印各目录能产出的包名（给人看）

注意：输出的是**包目录名**（SDK 的 `PACKAGES` 按 `make package/<目录名>/compile` 解析），
不是装出来的包名——`autocore` 编出 autocore-x86/arm、`simple-obfs` 编出 client/server。

CI 的「全部」构建用它生成列表，避免手写列表和仓库脱节
（手写列表曾经包含已删除的 luci-theme-kucat、从未存在的 luci-app-nikki / mihomo-meta，
还把包名当目录名写进去，导致整轮构建 No rule to make target）。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pkgscan  # noqa: E402


def main():
    data = pkgscan.scan()
    if "--count" in sys.argv:
        print(len(data))
    elif "--packages" in sys.argv:
        for target, info in data.items():
            print(f"{target:32s} -> {' '.join(info['packages']) or '-'}")
    else:
        print(" ".join(data))
    return 0


if __name__ == "__main__":
    sys.exit(main())
