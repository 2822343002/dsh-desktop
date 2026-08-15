#!/usr/bin/env bash
# patch-portable-nsi.sh — 构建前把自定义 portable.nsi 模板复制到
# electron-builder 的模板目录（electron-builder portable 目标不支持
# include/script 选项，只能替换模板实现缓存加速）。
# 用法: bash scripts/patch-portable-nsi.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/dsh-desktop/build/portable.nsi"
TEMPLATE="$ROOT/dsh-desktop/node_modules/app-builder-lib/templates/nsis/portable.nsi"

if [ ! -f "$SRC" ]; then
  echo "[patch-portable-nsi] 错误：未找到 $SRC"
  exit 1
fi
if [ ! -f "$TEMPLATE" ]; then
  echo "[patch-portable-nsi] 错误：未找到 electron-builder 模板 $TEMPLATE（请先 npm install）"
  exit 1
fi

cp "$SRC" "$TEMPLATE"
echo "[patch-portable-nsi] 已替换 portable.nsi 模板（$SRC -> $TEMPLATE）"
