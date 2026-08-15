#!/usr/bin/env bash
# prune-runtime.sh — 按目标平台裁剪 runtime/node_modules 中的跨平台原生二进制，
# 显著减小打包体积，缩短 portable 自解压与 NSIS 安装耗时。
# 用法: bash scripts/prune-runtime.sh [win|mac-arm64|mac-x64|linux-x64]
# 说明: 在打包前调用；会就地删除 runtime/node_modules 中非目标平台的原生模块。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME="$ROOT/runtime/node_modules"
TARGET="${1:-auto}"

case "$TARGET" in
  auto)
    case "$(uname -s)-$(uname -m)" in
      MINGW*|MSYS*|CYGWIN*)  KEEP="win32-x64" ;;
      Darwin-arm64)          KEEP="darwin-arm64" ;;
      Darwin-x86_64)         KEEP="darwin-x64" ;;
      Linux-x86_64)          KEEP="linux-x64" ;;
      *) echo "未知平台: $(uname -s)-$(uname -m)"; exit 1 ;;
    esac
    ;;
  win)        KEEP="win32-x64" ;;
  mac-arm64)  KEEP="darwin-arm64" ;;
  mac-x64)    KEEP="darwin-x64" ;;
  linux-x64)  KEEP="linux-x64" ;;
  *) echo "未知目标: $TARGET"; exit 1 ;;
esac
echo "[prune-runtime] 目标平台: $KEEP"

pruned_bytes=0

# —— 1. node-pty prebuilds：只保留当前平台 ——
NPTY_DIRS=$(find "$RUNTIME" -type d -path "*/node-pty/prebuilds" 2>/dev/null || true)
for d in $NPTY_DIRS; do
  echo "[prune-runtime] 裁剪 node-pty prebuilds: $d"
  for sub in "$d"/*/; do
    [ -d "$sub" ] || continue
    name=$(basename "$sub")
    if [ "$name" != "$KEEP" ]; then
      sz=$(du -sk "$sub" 2>/dev/null | cut -f1 || echo 0)
      rm -rf "$sub"
      pruned_bytes=$((pruned_bytes + sz))
      echo "  删除 $name ($((sz/1024))MB)"
    else
      echo "  保留 $name"
    fi
  done
done

# —— 2. 平台专属 npm 包：删除其他平台的 @img/sharp-* / @koromix/koffi-* / ripgrep 等 ——
# 保留形如 "<KEEP>" 或 "<KEEP>-..." 的包（如 win32-x64 → @img/sharp-win32-x64）
for pkgdir in "$RUNTIME/@img"/* "$RUNTIME/@koromix"/* "$RUNTIME"/node-*; do
  [ -e "$pkgdir" ] || continue
  name=$(basename "$pkgdir")
  # 只处理带平台后缀的包（sharp-win32-x64 / koffi-win32-x64 / ripgrep-win32-x64 / node-addon-require-builtin-win32-x64-msvc）
  case "$name" in
    *-win32-x64*|*-darwin-arm64*|*-darwin-x64*|*-linux-x64*)
      if [[ "$name" != *"$KEEP"* ]]; then
        sz=$(du -sk "$pkgdir" 2>/dev/null | cut -f1 || echo 0)
        rm -rf "$pkgdir"
        pruned_bytes=$((pruned_bytes + sz))
        echo "[prune-runtime] 删除平台包 $name ($((sz/1024))MB)"
      else
        echo "[prune-runtime] 保留平台包 $name"
      fi
      ;;
  esac
done

echo "[prune-runtime] 完成，共裁剪约 $((pruned_bytes/1024))MB"
