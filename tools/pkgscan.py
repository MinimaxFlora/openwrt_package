#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""pkgscan.py — 扫描本仓库里能编出来的构建目标（供 gen-lock.py / list-packages.py 共用）

**关键点：SDK 编译时 `PACKAGES` 里要写的是「包目录名」，不是包装出来的包名。**
`make package/<名字>/compile` 是按目录解析的，所以：

  - `autocore`      一个目录编出 autocore-x86 / autocore-arm 两个包
  - `simple-obfs`   一个目录编出 simple-obfs-client / -server
  - `v2ray-geodata` 一个目录编出 v2ray-geoip / v2ray-geosite

把包名（autocore-x86 之类）写进 PACKAGES 会直接 `No rule to make target` 整轮失败。

判定一个目录是包：Makefile 里出现 `include $(TOPDIR)/rules.mk`；
排除 `src/`、`tests/`、`dev/` 这类源码/工具目录。
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SKIP_DIRS = {".git", ".github", "tools", "node_modules"}
SKIP_SEGMENTS = {"src", "tests", "test", "dev", "docs", "prototypes",
                 "security-tests", "scripts", "node_modules", ".git", ".github"}

RE_PKG_NAME = re.compile(r"^\s*PKG_NAME\s*:?=\s*(\S+)", re.M)
RE_DEFINE_PKG = re.compile(r"^[ \t]*define[ \t]+Package/([A-Za-z0-9._+][A-Za-z0-9._+-]*)[ \t]*$", re.M)
PKG_SUFFIXES = {"description", "install", "conffiles", "config", "preinst",
                "postinst", "prerm", "postrm", "default", "init"}
RE_RULES = re.compile(r"^include \$\(TOPDIR\)/rules\.mk", re.M)

FIELDS = ["PKG_NAME", "PKG_VERSION", "PKG_SOURCE", "PKG_SOURCE_URL",
          "PKG_SOURCE_VERSION", "PKG_HASH", "PKG_LICENSE"]
RE_FIELD = re.compile(r"^\s*(%s)\s*:?=\s*(.+?)\s*$" % "|".join(FIELDS), re.M)


def _makefiles(root=ROOT):
    for dirpath, dirnames, filenames in os.walk(root):
        rel = os.path.relpath(dirpath, root).replace(os.sep, "/")
        if rel != "." and set(rel.split("/")) & SKIP_SEGMENTS:
            dirnames[:] = []
            continue
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
        if "Makefile" in filenames:
            yield os.path.join(dirpath, "Makefile")


def _package_names(text):
    names = []
    for m in RE_DEFINE_PKG.finditer(text):
        name = m.group(1)
        if name.lower() in PKG_SUFFIXES or name in names:
            continue
        names.append(name)
    return names


def scan(root=ROOT):
    """返回 {构建目标(目录名): {PKG_* 字段, 'dir': 相对目录, 'packages': [包名…]}}，按目录名排序。"""
    targets = {}
    for mk in _makefiles(root):
        try:
            text = open(mk, encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        if not RE_RULES.search(text):
            continue
        target = os.path.basename(os.path.dirname(mk))
        if target in targets:       # 同名目录只保留第一个
            continue
        rel = os.path.relpath(os.path.dirname(mk), root).replace(os.sep, "/") or "."
        info = {"dir": rel, "packages": _package_names(text)}
        for fm in RE_FIELD.finditer(text):
            key, val = fm.group(1), fm.group(2).strip().strip('"').strip("'")
            info.setdefault(key, val)
        info.pop("PKG_NAME", None)
        targets[target] = info
    return dict(sorted(targets.items()))


if __name__ == "__main__":
    data = scan()
    for name, info in data.items():
        print(f"{name:34s} {(info.get('PKG_VERSION') or '-'):24s} "
              f"{info.get('dir', ''):48s} {' '.join(info['packages'])}")
    print(f"共 {len(data)} 个构建目标")
