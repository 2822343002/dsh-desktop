#!/usr/bin/env bash
# bundle-plugins.sh — 把 6 个 @dsh-desktop 插件以"生产依赖"形态打入 runtime。
# 对应 PERFORMANCE.md v2 的 A0（插件进包）+ A1（剔除 devDependencies）+ A2（删 onnxruntime-web）。
# 用法: bash scripts/bundle-plugins.sh
# 注意: 必须在打包前执行；执行后不要再在 runtime/ 运行 npm install（会清掉手动拷贝的插件）。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE="$ROOT/.tools/node-v24.19.0-win-x64/node.exe"
NPM="C:\Users\fresh_joker\Desktop\dsh\.tools\node-v24.19.0-win-x64\node_modules\npm\bin\npm-cli.js"
NPM_REGISTRY="https://registry.npmmirror.com"

PLUGINS=(tool-notify tool-clipboard hooks-desk tool-ocr tool-screenshot tool-rag-local)
DST="$ROOT/runtime/node_modules/@dsh-desktop"

echo "[bundle-plugins] 清空旧插件目录"
rm -rf "$DST"
mkdir -p "$DST"

for p in "${PLUGINS[@]}"; do
  SRC="$ROOT/plugins/$p"
  echo "[bundle-plugins] 处理 $p ..."

  # —— A1: 只保留生产依赖（npm prune --omit=dev 移除 typescript/@types 等 devDependencies） ——
  (cd "$SRC" && "$NODE" "$NPM" prune --omit=dev --no-audit --no-fund --registry="$NPM_REGISTRY" >/dev/null 2>&1 || true)

  # —— A2: 删除 onnxruntime-web（Node 环境只用 onnxruntime-node；仅 rag 插件包含） ——
  rm -rf "$SRC/node_modules/onnxruntime-web" "$SRC/node_modules/onnxruntime-web-dml" 2>/dev/null || true
  # 清理 @types 与多余 d.ts 无关文件不必要，保留 lib/ 即可

  # —— 拷入 runtime ——
  cp -r "$SRC" "$DST/$p"
  echo "    -> $DST/$p ($(du -sm "$DST/$p" | cut -f1)MB)"
done

# —— 清理 runtime 全树的 .d.ts / .d.ts.map（类型声明，运行时不需要；
#    useZip 模式下超长路径的类型文件会导致 NSIS zip 内嵌失败） ——
echo "[bundle-plugins] 清理 .d.ts / .d.ts.map（useZip 兼容 + 瘦身）"
find "$ROOT/runtime/node_modules" -type f \( -name "*.d.ts" -o -name "*.d.ts.map" -o -name "*.tsbuildinfo" \) -delete 2>/dev/null || true
# 清理空的 legacy/exports 深目录树（@smithy/core 的超长路径由 .d.ts 删除自然消失）

echo "[bundle-plugins] 完成。runtime 插件:"
du -sh "$DST" 2>/dev/null
echo "[bundle-plugins] runtime 总大小:"
du -sh "$ROOT/runtime/node_modules" 2>/dev/null
