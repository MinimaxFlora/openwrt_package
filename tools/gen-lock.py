#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen-lock.py — 生成/校验 packages.lock.json（每个包的来源快照）

仓库里 40+ 个包都是从各上游项目抄进来的，时间一长没人记得某个包对应上游哪个
commit。本脚本扫每个包的 Makefile（判定规则见 tools/pkgscan.py），抽出 PKG_*
元数据写成 lock 文件，方便：

  - 回答"这个包是哪一版 / 从哪个上游来的"
  - 升级时知道要对比哪个上游
  - CI 里 `--check` 保证 lock 和 Makefile 同步（改了版本忘了更新 lock 会红）

用法:
  python3 tools/gen-lock.py            # 写 packages.lock.json
  python3 tools/gen-lock.py --check    # 只校验，不一致时非零退出（CI 用）
  python3 tools/gen-lock.py --list     # 只打印包名列表（等价 tools/list-packages.py）
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pkgscan  # noqa: E402

ROOT = pkgscan.ROOT
LOCK = os.path.join(ROOT, "packages.lock.json")


def main():
    check = "--check" in sys.argv
    if "--list" in sys.argv:
        print(" ".join(pkgscan.scan()))
        return 0

    packages = pkgscan.scan()
    doc = {
        "version": 2,
        "note": "由 tools/gen-lock.py 生成，勿手改。改包版本后跑一次 python3 tools/gen-lock.py",
        "count": len(packages),
        "packages": packages,
    }
    text = json.dumps(doc, indent=2, ensure_ascii=False) + "\n"

    if check:
        if not os.path.exists(LOCK):
            print("::error::缺少 packages.lock.json，请运行 python3 tools/gen-lock.py")
            return 1
        # Windows 上 checkout 出来是 CRLF，比对前统一成 LF（否则本地永远"不一致"）
        old = open(LOCK, encoding="utf-8").read().replace(chr(13) + chr(10), chr(10))
        if old != text:
            print("::error::packages.lock.json 与当前 Makefile 不一致，请重新生成：")
            old_doc = json.loads(old)
            op, np_ = old_doc.get("packages", {}), packages
            for name in sorted(set(op) | set(np_)):
                if op.get(name) != np_.get(name):
                    print(f"  - {name}")
            return 1
        print(f"packages.lock.json 一致（{len(packages)} 个包）")
        return 0

    with open(LOCK, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
    print(f"已写入 {LOCK}（{len(packages)} 个包）")
    for name, info in packages.items():
        print(f"  {name:34s} {info.get('PKG_VERSION', '-') or '-':24s} {info.get('dir', '')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
