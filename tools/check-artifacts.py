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
import glob
import io
import os
import shutil
import subprocess
import sys
import tarfile

APK_ERR = ""


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
            with tarfile.open(fileobj=io.BytesIO(ctl_tar.read()), mode="r:*") as inner:
                for m in inner.getmembers():
                    if os.path.basename(m.name) != "control":
                        continue
                    text = inner.extractfile(m).read().decode("utf-8", "replace")
                    for line in text.splitlines():
                        if line.startswith("Source:"):
                            return line.split(":", 1)[1].strip()
    except Exception:
        return None
    return None


def find_apk():
    """找 apk 可执行：CI 里 SDK 不一定在 cwd，靠 STAGING_DIR 等线索兜住"""
    cands = []
    for env in ("STAGING_DIR_HOST", "STAGING_DIR"):
        d = os.environ.get(env)
        if not d:
            continue
        cands.append(os.path.join(d, "bin", "apk"))
        # STAGING_DIR=<sdk>/staging_dir/<target> → <sdk>/staging_dir/host/bin/apk
        sdk = os.path.dirname(os.path.dirname(d.rstrip("/")))
        cands.append(os.path.join(sdk, "staging_dir", "host", "bin", "apk"))
    cands += [
        "staging_dir/host/bin/apk",
        "staging_dir/host/bin/apk.static",
        os.path.join(os.getcwd(), "staging_dir", "host", "bin", "apk"),
    ]
    w = shutil.which("apk")
    if w:
        cands.append(w)
    for pat in ("*/staging_dir/host/bin/apk", "*/*/staging_dir/host/bin/apk",
                "*/staging_dir/host/bin/apk.static", "*/*/staging_dir/host/bin/apk.static"):
        cands += sorted(glob.glob(pat))
    for c in cands:
        if c and os.path.isfile(c) and os.access(c, os.X_OK):
            return c
    return None


def apk_origin(path, apk_bin):
    """从 .apk 的 adbdump 里取 origin:（apk-tools 3.x 输出在 stdout）"""
    global APK_ERR
    if not apk_bin:
        return None
    for argv in ([apk_bin, "--allow-untrusted", "adbdump", path],
                 [apk_bin, "adbdump", "--allow-untrusted", path],
                 [apk_bin, "adbdump", path]):
        try:
            r = subprocess.run(argv, capture_output=True, text=True, timeout=180)
        except Exception as e:
            APK_ERR = f"执行失败: {e}"
            continue
        out = (r.stdout or "") + "\n" + (r.stderr or "")
        for line in out.splitlines():
            s = line.strip()
            if s.startswith("origin:"):
                return s.split(":", 1)[1].strip()
        first = next((l for l in out.splitlines() if l.strip()), "")
        APK_ERR = (f"rc={r.returncode} {first[:160]}").strip()
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

    files = [n for n in sorted(os.listdir(release_dir))
             if os.path.isfile(os.path.join(release_dir, n))
             and (n.endswith(".ipk") or n.endswith(".apk"))]
    n_apk = sum(1 for n in files if n.endswith(".apk"))
    n_ipk = len(files) - n_apk

    if n_apk and not apk_bin:
        apk_bin = find_apk()
    if n_apk and not apk_bin:
        print(f"::error::release/ 里有 {n_apk} 个 .apk，但找不到 apk 可执行文件，无法判定它们的来源"
              f"（继续跑只会误报「没有产出」）。请确认 SDK 的 staging_dir/host/bin/apk 存在，"
              f"或用 --apk 指定，或导出 STAGING_DIR / STAGING_DIR_HOST。")
        return 3
    print(f"release/ 里 {len(files)} 个包（ipk {n_ipk} / apk {n_apk}），apk 工具: {apk_bin or '不需要'}")

    produced, unknown = {}, []
    for name in files:
        path = os.path.join(release_dir, name)
        d = dir_of(ipk_source(path)) if name.endswith(".ipk") else dir_of(apk_origin(path, apk_bin))
        if d:
            produced.setdefault(d, []).append(name)
        else:
            unknown.append(name)

    missing = [t for t in targets if t not in produced]
    print(f"产物 {sum(len(v) for v in produced.values())} 个，覆盖 {len(produced)} 个构建目标"
          f"（无法判定来源的 {len(unknown)} 个），选定 {len(targets)} 个目标")
    if unknown:
        print("::warning::读不出来源的包：" + ", ".join(unknown[:10]) + (" …" if len(unknown) > 10 else ""))
        if any(n.endswith(".apk") for n in unknown) and APK_ERR:
            print(f"::warning::apk adbdump 的诊断信息：{APK_ERR}")
    for t in missing:
        print(f"::error::构建目标 {t} 没有产出任何包")
    extra = sorted(set(produced) - set(targets))
    if extra:
        shown = ", ".join(extra[:10]) + (" …" if len(extra) > 10 else "")
        print(f"（另有 {len(extra)} 个不在选定列表里的目标也产出了包：{shown}）")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
