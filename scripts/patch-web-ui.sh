#!/usr/bin/env bash
# patch-web-ui.sh — 把玻璃态主题直接写入 dsh 原生前端（dsh-web-frontend/dist）。
# 方案（原生，非注入）：在 dsh 的 dist/assets/ 下新增 glass.css，并在 index.html
# 追加 <link> 引用。页面加载时天然生效，无需 executeJavaScript/insertCSS。
# 背景自定义：主进程重写 glass.css 中的 --user-bg-image 变量 + reload 页面即可。
# 用法: bash scripts/patch-web-ui.sh [webFrontendDir]
# 默认目录: runtime/node_modules/@deepseek-ai/dsh-web-frontend/dist
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="${1:-$ROOT/runtime/node_modules/@deepseek-ai/dsh-web-frontend/dist}"
ASSETS="$DIST/assets"

[ -d "$ASSETS" ] || { echo "[patch-web-ui] 未找到 dsh 前端 dist/assets：$ASSETS" >&2; exit 1; }

GLASS_FILE="$ASSETS/glass.css"
LINK_LINE='    <link rel="stylesheet" href="/assets/glass.css">'

cat > "$GLASS_FILE" <<'GLASS_EOF'
/* ===== dsh-desktop glassmorphism theme (native patch, generated) =====
 * 直接作用于 dsh 原生界面：body 渐变背景、玻璃卡片、霓虹 CTA、动效。
 * 背景图片变量 --user-bg-image 由主进程重写本文件后 reload 生效。 */
:root {
  --glass-grad: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%);
  --glass-bg: rgba(255, 255, 255, 0.06);
  --glass-bg-hover: rgba(255, 255, 255, 0.10);
  --glass-border: rgba(255, 255, 255, 0.14);
  --glass-border-highlight: rgba(255, 255, 255, 0.28);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  --glass-inner-glow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  --user-bg-image: none;
  --user-bg-opacity: 0.55;
  --accent-glow: 0 0 12px rgba(34, 211, 238, 0.45);
  --motion-fast: 150ms;
  --motion-base: 200ms;
  --ease-glass: cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
/* 原生背景：渐变打底 + 自定义图片层（带玻璃模糊） */
html, body {
  background-color: transparent !important;
}
body {
  background-image: var(--user-bg-image), var(--glass-grad) !important;
  background-position: center, center !important;
  background-size: cover, cover !important;
  background-repeat: no-repeat, no-repeat !important;
  background-attachment: fixed, fixed !important;
}
body::after {
  content: ''; position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background: var(--user-bg-image) center/cover no-repeat;
  filter: blur(24px) brightness(0.7);
  transform: scale(1.05);
  opacity: var(--user-bg-opacity);
}
/* 玻璃卡片：兼容 dsh 的 CSS Modules 哈希类名（_card_* 等）与常见容器 */
[class*='card'], [class*='panel'], [class*='surface'], [class*='message'] {
  background: var(--glass-bg) !important;
  backdrop-filter: blur(18px) saturate(1.4) !important;
  -webkit-backdrop-filter: blur(18px) saturate(1.4) !important;
  border: 1px solid var(--glass-border) !important;
  border-top-color: var(--glass-border-highlight) !important;
  box-shadow: var(--glass-shadow), var(--glass-inner-glow) !important;
  border-radius: 14px !important;
  transition: background var(--motion-base) var(--ease-glass),
              box-shadow var(--motion-base) var(--ease-glass),
              transform var(--motion-fast) var(--ease-glass) !important;
}
[class*='card']:hover, [class*='panel']:hover, [class*='surface']:hover, [class*='message']:hover {
  background: var(--glass-bg-hover) !important;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45), var(--glass-inner-glow) !important;
}
[class*='card']:active, [class*='panel']:active, [class*='surface']:active, [class*='message']:active {
  transform: scale(0.98) !important;
}
/* 文字层级 */
body, [class*='text'] { color: rgba(255, 255, 255, 0.94) !important; }
[class*='secondary'], [class*='muted'], [class*='hint'] { color: rgba(255, 255, 255, 0.62) !important; }
/* 主按钮/CTA：霓虹渐变 + hover 光晕 */
button, [class*='btn'], [class*='button'] {
  border-radius: 10px !important;
  transition: box-shadow var(--motion-base) var(--ease-glass),
              filter var(--motion-base) var(--ease-glass),
              transform var(--motion-fast) var(--ease-glass) !important;
}
button:hover, [class*='btn']:hover, [class*='button']:hover {
  box-shadow: var(--accent-glow) !important;
  filter: brightness(1.1) !important;
}
button:active, [class*='btn']:active, [class*='button']:active {
  transform: scale(0.98) !important;
}
GLASS_EOF

echo "[patch-web-ui] glass.css 已写入: $GLASS_FILE ($(wc -c < "$GLASS_FILE") bytes)"

# —— index.html 追加 <link>（幂等） ——
INDEX="$DIST/index.html"
if grep -q 'glass.css' "$INDEX"; then
  echo "[patch-web-ui] index.html 已包含 glass.css 引用，跳过"
else
  python - "$INDEX" "$LINK_LINE" <<'PY_EOF'
import sys
path, link = sys.argv[1], sys.argv[2]
html = open(path, encoding='utf-8').read()
marker = '<link rel="stylesheet" crossorigin href="/assets/index-'
idx = html.find(marker)
if idx < 0:
    print('[patch-web-ui] 未找到 index css 引用点，跳过', file=sys.stderr)
    sys.exit(1)
# 在 index css link 行末插入 glass.css link
end = html.find('>', idx) + 1
html = html[:end] + '\n' + link + html[end:]
open(path, 'w', encoding='utf-8').write(html)
print('[patch-web-ui] index.html 已插入 glass.css 引用')
PY_EOF
fi

echo "[patch-web-ui] 完成"
