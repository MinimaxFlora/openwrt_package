#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""list-packages.py — 打印本仓库真正能编出来的包名（空格分隔，供 CI 直接用）

    python3 tools/list-packages.py            # 全部包名
    python3 tools/list-packages.py --count    # 只打印数量

CI 里用它生成「全部」编译列表，避免手写列表和仓库脱节
（手写列表曾经包含已删除的 luci-theme-kucat、从未存在的 luci-app-nikki）。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pkgscan  # noqa: E402


def main():
    names = list(pkgscan.scan())
    if "--count" in sys.argv:
        print(len(names))
    else:
        print(" ".join(names))
    return 0


if __name__ == "__main__":
    sys.exit(main())
