#!/usr/bin/env bash
# prepare-runtime.sh — 为当前平台准备内置运行时，输出到 dsh-desktop/node-runtime/
# 用法: bash scripts/prepare-runtime.sh [win|mac-arm64|mac-x64|linux-x64]
# 说明: 当前平台自动检测；也可显式指定目标平台（交叉准备运行时）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE_VERSION="v24.19.0"
OUT="$ROOT/dsh-desktop/node-runtime"
TOOLS="$ROOT/.tools"
mkdir -p "$OUT" "$TOOLS"

# —— 解析目标平台 ——
TARGET="${1:-auto}"
case "$TARGET" in
  auto)
    case "$(uname -s)-$(uname -m)" in
      MINGW*|MSYS*|CYGWIN*)  PLAT="win-x64" ;;
      Darwin-arm64)          PLAT="mac-arm64" ;;
      Darwin-x86_64)         PLAT="mac-x64" ;;
      Linux-x86_64)          PLAT="linux-x64" ;;
      *) echo "未知平台: $(uname -s)-$(uname -m)"; exit 1 ;;
    esac
    ;;
  win)        PLAT="win-x64" ;;
  mac-arm64)  PLAT="mac-arm64" ;;
  mac-x64)    PLAT="mac-x64" ;;
  linux-x64)  PLAT="linux-x64" ;;
  *) echo "未知目标: $TARGET"; exit 1 ;;
esac
echo "[prepare-runtime] 目标平台: $PLAT"

# —— 下载 Node 发行版 ——
case "$PLAT" in
  win-x64)
    FILE="node-$NODE_VERSION-win-x64.zip"
    URL="https://nodejs.org/dist/$NODE_VERSION/$FILE"
    DIR="node-$NODE_VERSION-win-x64"
    BIN_REL="node.exe"
    ;;
  mac-arm64|mac-x64)
    ARCH="${PLAT#mac-}"
    FILE="node-$NODE_VERSION-darwin-$ARCH.tar.gz"
    URL="https://nodejs.org/dist/$NODE_VERSION/$FILE"
    DIR="node-$NODE_VERSION-darwin-$ARCH"
    BIN_REL="bin/node"
    ;;
  linux-x64)
    FILE="node-$NODE_VERSION-linux-x64.tar.gz"
    URL="https://nodejs.org/dist/$NODE_VERSION/$FILE"
    DIR="node-$NODE_VERSION-linux-x64"
    BIN_REL="bin/node"
    ;;
esac

if [ ! -d "$TOOLS/$DIR" ] || [ ! -e "$TOOLS/$DIR/$BIN_REL" ]; then
  echo "[prepare-runtime] 下载 $URL"
  curl -fsSL --retry 3 --max-time 600 -o "$TOOLS/$FILE" "$URL" || { echo "[prepare-runtime] 下载失败"; exit 1; }
  mkdir -p "$TOOLS/$DIR"
  # 解压 zip/tar.gz：依次尝试 tar / unzip / PowerShell（GitHub Windows runner 的 tar 可能不支持 zip）
  case "$FILE" in
    *.zip)
      if ! (cd "$TOOLS" && tar -xf "$FILE" 2>/dev/null); then
        if command -v unzip >/dev/null 2>&1; then
          (cd "$TOOLS" && unzip -o -q "$FILE") || powershell -NoProfile -Command "Expand-Archive -Path '$TOOLS/$FILE' -DestinationPath '$TOOLS'" || { echo "[prepare-runtime] zip 解压失败"; exit 1; }
        else
          powershell -NoProfile -Command "Expand-Archive -Path '$TOOLS/$FILE' -DestinationPath '$TOOLS'" || { echo "[prepare-runtime] zip 解压失败"; exit 1; }
        fi
      fi
      ;;
    *.tar.gz)
      tar -xzf "$TOOLS/$FILE" -C "$TOOLS" || { echo "[prepare-runtime] tar.gz 解压失败"; exit 1; }
      ;;
  esac
else
  echo "[prepare-runtime] 已存在 $TOOLS/$DIR，跳过下载"
fi

# 校验解压产物
if [ ! -e "$TOOLS/$DIR/$BIN_REL" ]; then
  echo "[prepare-runtime] 错误：解压后未找到 $TOOLS/$DIR/$BIN_REL"
  ls "$TOOLS" 2>/dev/null | head -10
  exit 1
fi

# —— 复制 node 可执行文件到输出目录（仅可执行文件，控制体积）——
rm -rf "$OUT"
mkdir -p "$OUT"
cp "$TOOLS/$DIR/$BIN_REL" "$OUT/$(basename "$BIN_REL")"
echo "[prepare-runtime] 完成: $OUT/$(basename "$BIN_REL")"
ls -la "$OUT"
