'use strict'

/**
 * glass-theme.js — 玻璃态 UI 主题注入模块（v2）。
 *
 * 变更（修复"UI 没变 / 换背景没效果"）：
 * 1. 注入方式：executeJavaScript 注入带 id 的 <style>（幂等，可重复更新），
 *    替代 webContents.insertCSS（后者每次插入新 style，无法覆盖且会被 SPA 导航清掉）。
 * 2. 注入时机：main.js 在 did-finish-load / did-navigate / dom-ready 多处重注入，
 *    配合延时重试，确保 SPA 渲染完成后样式仍在。
 * 3. 背景层：html/body 置透明，渐变/图片用 fixed 层 z-index:-1（内容之下、背景之上）。
 * 4. 选择器：兼容 dsh 的 CSS Modules 哈希类名（如 _card_xxx），保留 [class*='card'] 等。
 */

const STYLE_ID = 'dsh-glass-theme'
const FAB_ID = 'dsh-bg-fab'

// —— 3 档渐变预设 ——
const GRADIENT_PRESETS = {
  deepSpace: {
    label: '深空蓝紫',
    css: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
  },
  emerald: {
    label: '墨绿',
    css: 'linear-gradient(135deg, #022c22 0%, #064e3b 55%, #134e4a 100%)',
  },
  warmGold: {
    label: '暖金',
    css: 'linear-gradient(135deg, #1c1917 0%, #292524 45%, #44403c 100%)',
  },
}

/** 把 Windows 路径转成 CSS url() 可用的 file:// URL */
function toFileUrl(image) {
  if (!image) return 'none'
  const p = image.replace(/\\/g, '/')
  return `url("file:///${p}")`
}

/**
 * 生成玻璃态 CSS（纯函数，可单测）。
 * @param {{preset?: string, image?: string, opacity?: number}} bg
 */
function buildGlassCss(bg = {}) {
  const preset = GRADIENT_PRESETS[bg.preset] || GRADIENT_PRESETS.deepSpace
  const image = toFileUrl(bg.image)
  const opacity = typeof bg.opacity === 'number' ? bg.opacity : 0.55

  return `
/* ===== dsh-desktop glassmorphism theme v2 (auto-injected) ===== */
:root {
  --glass-bg: rgba(255, 255, 255, 0.06);
  --glass-bg-strong: rgba(255, 255, 255, 0.12);
  --glass-bg-hover: rgba(255, 255, 255, 0.10);
  --glass-border: rgba(255, 255, 255, 0.14);
  --glass-border-highlight: rgba(255, 255, 255, 0.28);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  --glass-inner-glow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  --bg-grad: ${preset.css};
  --user-bg-image: ${image};
  --user-bg-opacity: ${opacity};
  --accent-1: #22d3ee;
  --accent-2: #a78bfa;
  --accent-glow: 0 0 12px rgba(34, 211, 238, 0.45);
  --text-primary: rgba(255, 255, 255, 0.94);
  --text-secondary: rgba(255, 255, 255, 0.62);
  --motion-fast: 150ms;
  --motion-base: 200ms;
  --ease-glass: cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
/* 关键：html/body 置透明，避免 dsh 自身背景盖住玻璃层 */
html, body {
  background-color: transparent !important;
}
/* 渐变背景层（fixed，内容之下） */
body::before {
  content: ''; position: fixed; inset: 0; z-index: -1;
  background: var(--bg-grad);
  pointer-events: none;
}
/* 自定义图片层（fixed，覆盖渐变之上、内容之下，带玻璃模糊） */
body::after {
  content: ''; position: fixed; inset: 0; z-index: -1;
  background: var(--user-bg-image) center/cover no-repeat;
  filter: blur(24px) brightness(0.7);
  transform: scale(1.05);
  opacity: var(--user-bg-opacity);
  pointer-events: none;
}
/* 玻璃卡片：兼容 dsh 哈希类名（_card_xxx 等）与常见面板容器 */
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
body, [class*='text'] { color: var(--text-primary) !important; }
[class*='secondary'], [class*='muted'], [class*='hint'] { color: var(--text-secondary) !important; }
/* 主按钮/CTA */
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
/* 悬浮背景设置按钮 */
#${FAB_ID} {
  position: fixed !important; right: 20px !important; bottom: 20px !important;
  z-index: 99999 !important; width: 44px !important; height: 44px !important;
  border-radius: 50% !important; border: 1px solid var(--glass-border-highlight) !important;
  background: var(--glass-bg-strong) !important;
  backdrop-filter: blur(12px) !important;
  box-shadow: var(--glass-shadow) !important;
  color: var(--text-primary) !important; font-size: 20px !important;
  cursor: pointer !important; line-height: 44px !important; text-align: center !important;
  user-select: none !important; font-family: sans-serif !important;
  transition: background var(--motion-base) var(--ease-glass),
              box-shadow var(--motion-base) var(--ease-glass) !important;
}
#${FAB_ID}:hover { background: var(--glass-bg-hover) !important; box-shadow: var(--glass-shadow), var(--accent-glow) !important; }
#${FAB_ID}:active { transform: scale(0.95) !important; }
`
}

/** 构建注入脚本（幂等：先删旧 style 再插新 style；含悬浮按钮） */
function buildInjectScript(bg = {}) {
  const css = buildGlassCss(bg)
  // CSS 字符串转义（防单引号/换行破坏 JS 字符串）
  const esc = css.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
  return `(function () {
    var old = document.getElementById('${STYLE_ID}');
    if (old) old.remove();
    var st = document.createElement('style');
    st.id = '${STYLE_ID}';
    st.textContent = '${esc}';
    document.head.appendChild(st);
    if (!document.getElementById('${FAB_ID}')) {
      var fab = document.createElement('div');
      fab.id = '${FAB_ID}';
      fab.title = '自定义背景';
      fab.textContent = '🎨';
      fab.addEventListener('click', function () {
        if (window.dshBg && window.dshBg.select) window.dshBg.select();
      });
      document.body.appendChild(fab);
    }
    return true;
  })()`
}

/** 注入玻璃态主题 + 悬浮按钮到 webContents（返回 Promise<boolean>） */
function injectGlassTheme(webContents, bg = {}) {
  if (!webContents || typeof webContents.executeJavaScript !== 'function') {
    return Promise.resolve(false)
  }
  const script = buildInjectScript(bg)
  return webContents
    .executeJavaScript(script, true)
    .then(() => true)
    .catch(() => false)
}

module.exports = { GRADIENT_PRESETS, buildGlassCss, buildInjectScript, injectGlassTheme, STYLE_ID, FAB_ID }
