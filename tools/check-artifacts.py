#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""check-artifacts.py — 断言每个选定的构建目标都产出了包

为什么不按文件名猜包名：一个目录编出的包名经常和目录名无关 ——

    shadowsocks-rust   → sslocal / ssserver / ssmanager / ssurl …
    shadowsocksr-libev → ssr-local / ssr-redir / ssr-check …
    autocore           → autocore-x86 / autocore-arm（按架构二选一）
    v2ray-geodata      → v2ray-geoip / v2ray-geosite
    simple-obfs        → simple-obfs-client / -server

而且前缀相同的名字会互相遮蔽（`release/sing-box-*` 也能匹配 `sing-box-tiny-…`）。
所以这里读每个包自带的来源字段，权威地还原它来自哪个目录：

    .ipk → control 里的 `Source: /feed/<dir>`
    .apk → adbdump 的 `origin: /feed/<dir>`

用法:
    python3 tools/check-artifacts.py <release_dir> "<target1 target2 …>" [--apk <apk 可执行>]
"""
import os
import re
import subprocess
import sys
import tarfile


def ipk_source(path):
    """从 .ipk 的 control 里取 Source:（形如 /feed/shadowsocks-rust）"""
    try:
        with tarfile.open(path, "r:gz") as outer:
            ctl_tar = None
            for m in outer.getmembers():
                if m.name in ("./control.tar.gz", "control.tar.gz"):
                    ctl_tar = outer.extractfile(m)
                    break
            if ctl_tar is None:
                return None
            import io
            with tarfile.open(fileobj=io.BytesIO(ctl_tar.read()), mode="r:gz") as inner:
                for m in inner.getmembers():
                    if m.name in ("./control", "control"):
                        text = inner.extractfile(m).read().decode("utf-8", "replace")
                        for line in text.splitlines():
                            if line.startswith("Source:"):
                                return line.split(":", 1)[1].strip()
            return None
    except Exception:
        return None


def apk_origin(path, apk_bin):
    """从 .apk 的 adbdump 里取 origin:"""
    if not apk_bin or not os.access(apk_bin, os.X_OK):
        return None
    try:
        out = subprocess.run([apk_bin, "--allow-untrusted", "adbdump", path],
                             capture_output=True, text=True, timeout=60).stdout
    except Exception:
        return None
    for line in out.splitlines():
        s = line.strip()
        if s.startswith("origin:"):
            return s.split(":", 1)[1].strip()
    return None


def dir_of(source):
    """'/feed/shadowsocks-rust' → 'shadowsocks-rust'；忽略官方 feed 的路径"""
    if not source:
        return None
    s = source.strip().rstrip("/")
    if s.endswith("Makefile"):
        s = os.path.dirname(s)
    return os.path.basename(s)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    apk_bin = None
    for i, a in enumerate(sys.argv):
        if a == "--apk" and i + 1 < len(sys.argv):
            apk_bin = sys.argv[i + 1]
    if len(args) < 2:
        print(__doc__)
        return 2
    release_dir, targets = args[0], args[1].split()

    produced, unknown = {}, 0
    for name in sorted(os.listdir(release_dir)):
        path = os.path.join(release_dir, name)
        if not os.path.isfile(path):
            continue
        if name.endswith(".ipk"):
            d = dir_of(ipk_source(path))
        elif name.endswith(".apk"):
            d = dir_of(apk_origin(path, apk_bin))
        else:
            continue
        if d:
            produced.setdefault(d, []).append(name)
        else:
            unknown += 1

    missing = [t for t in targets if t not in produced]
    print(f"产物 {sum(len(v) for v in produced.values())} 个，覆盖 {len(produced)} 个构建目标"
          f"（无法判定来源的 {unknown} 个），选定 {len(targets)} 个目标")
    for t in missing:
        print(f"::error::构建目标 {t} 没有产出任何包")
    extra = sorted(set(produced) - set(targets))
    if extra:
        shown = ", ".join(extra[:10]) + (" …" if len(extra) > 10 else "")
        print(f"（另有 {len(extra)} 个不在选定列表里的目标也产出了包：{shown}）")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
