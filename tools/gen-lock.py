#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen-lock.py — 生成/校验 packages.lock.json（每个 vendored 包的上游来源快照）

仓库里 40+ 个包都是从各上游项目抄进来的，时间一长没人记得某个包对应上游哪个
commit。本脚本扫每个包目录的 Makefile，抽出 PKG_* 元数据写成 lock 文件，方便：

  - 回答"这个包是哪一版 / 从哪个上游来的"
  - 升级时知道要对比哪个上游
  - CI 里 `--check` 保证 lock 和 Makefile 同步（改了版本忘了更新 lock 会红）

用法:
  python3 tools/gen-lock.py            # 写 packages.lock.json
  python3 tools/gen-lock.py --check    # 只校验，不一致时非零退出（CI 用）
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCK = os.path.join(ROOT, "packages.lock.json")

FIELDS = ["PKG_NAME", "PKG_VERSION", "PKG_SOURCE", "PKG_SOURCE_URL",
          "PKG_SOURCE_VERSION", "PKG_HASH", "PKG_LICENSE"]

RE_FIELD = re.compile(r"^\s*(%s)\s*:?=\s*(.+?)\s*$" % "|".join(FIELDS))


def scan():
    packages = {}
    for name in sorted(os.listdir(ROOT)):
        mk = os.path.join(ROOT, name, "Makefile")
        if not os.path.isfile(mk):
            continue
        info = {}
        with open(mk, encoding="utf-8", errors="replace") as fh:
            for line in fh:
                m = RE_FIELD.match(line)
                if not m:
                    continue
                key, val = m.group(1), m.group(2).strip().strip('"').strip("'")
                # 只记第一次出现的值（避免 Build/Install 段里的同名变量覆盖）
                info.setdefault(key, val)
        info.setdefault("PKG_NAME", name)
        packages[name] = {k: info[k] for k in FIELDS if k in info}
    return packages


def main():
    check = "--check" in sys.argv
    packages = scan()
    doc = {
        "version": 1,
        "note": "由 tools/gen-lock.py 生成，勿手改。改包版本后跑一次 python3 tools/gen-lock.py",
        "count": len(packages),
        "packages": packages,
    }
    text = json.dumps(doc, indent=2, ensure_ascii=False, sort_keys=False) + "\n"

    if check:
        if not os.path.exists(LOCK):
            print("::error::缺少 packages.lock.json，请运行 python3 tools/gen-lock.py")
            return 1
        old = open(LOCK, encoding="utf-8").read()
        if old != text:
            print("::error::packages.lock.json 与当前 Makefile 不一致，请重新生成：")
            old_doc = json.loads(old)
            op, np_ = old_doc.get("packages", {}), packages
            for name in sorted(set(op) | set(np_)):
                if op.get(name) != np_.get(name):
                    print(f"  - {name}: {op.get(name)} -> {np_.get(name)}")
            return 1
        print(f"packages.lock.json 一致（{len(packages)} 个包）")
        return 0

    with open(LOCK, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
    print(f"已写入 {LOCK}（{len(packages)} 个包）")
    for name, info in packages.items():
        ver = info.get("PKG_VERSION", "-")
        src = info.get("PKG_SOURCE_URL", "-")
        print(f"  {name:28s} {ver:22s} {src}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
