#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""pkgscan.py — 扫描本仓库里真正能编出来的包（供 gen-lock.py / list-packages.py 共用）

判定标准：Makefile 里出现 `include $(TOPDIR)/rules.mk`（OpenWrt 包的特征），
并排除 `src/`、`tests/`、`dev/` 这类源码/工具目录里的 Makefile。

包名来源：
  1. 字面量 `define Package/<name>`（跳过 /description、/install 等子段）——
     一个 Makefile 可以定义多个包（autocore / autocore-x86 / autocore-arm、
     v2ray-geoip / v2ray-geosite、simple-obfs-client / -server …），全部收进来
  2. 没有字面量时用 `PKG_NAME`
  3. 再没有就用目录名（luci.mk 的包都是这种，包名 = 目录名）

注意：不能用 PKG_NAME 当包名——xray-core 的 PKG_NAME 是 `Xray-core`，
而装出来的包名是小写 `xray-core`。
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SKIP_DIRS = {".git", ".github", "tools", "node_modules"}
SKIP_SEGMENTS = {"src", "tests", "test", "dev", "docs", "prototypes",
                 "security-tests", "scripts", "node_modules", ".git", ".github"}

RE_PKG_NAME = re.compile(r"^\s*PKG_NAME\s*:?=\s*(\S+)", re.M)
# 结尾锚定：`define Package/shadowsocksr-libev-ssr-$(...)` 这类带变量的不匹配
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


def _package_names(text, mk):
    names = []
    for m in RE_DEFINE_PKG.finditer(text):
        name = m.group(1)
        if name.lower() in PKG_SUFFIXES:
            continue
        if name not in names:
            names.append(name)
    if names:
        return names
    m = RE_PKG_NAME.search(text)
    if m:
        return [m.group(1).strip('"').strip("'")]
    return [os.path.basename(os.path.dirname(mk))]


def scan(root=ROOT):
    """返回 {包名: {PKG_* 字段, 'dir': Makefile 所在目录}}，按包名排序。"""
    pkgs = {}
    for mk in _makefiles(root):
        try:
            text = open(mk, encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        if not RE_RULES.search(text):
            continue
        rel = os.path.relpath(mk, root).replace(os.sep, "/")
        base = {"dir": os.path.dirname(rel) or "."}
        for fm in RE_FIELD.finditer(text):
            key, val = fm.group(1), fm.group(2).strip().strip('"').strip("'")
            base.setdefault(key, val)
        for name in _package_names(text, mk):
            if name in pkgs:        # 同名只保留第一个
                continue
            info = dict(base)
            info.pop("PKG_NAME", None)
            pkgs[name] = info
    return dict(sorted(pkgs.items()))


if __name__ == "__main__":
    data = scan()
    for name, info in data.items():
        print(f"{name:34s} {(info.get('PKG_VERSION') or '-'):24s} {info.get('dir', '')}")
    print(f"共 {len(data)} 个包")
