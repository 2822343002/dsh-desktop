'use strict'

/**
 * glass-theme.js — 玻璃态 UI 主题注入模块。
 * 通过 webContents.insertCSS 在运行时注入玻璃态样式（不改 dsh 前端包，
 * 升级不覆盖）。支持默认渐变背景 + 用户自定义背景图（--user-bg-image）。
 */

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

/**
 * 生成玻璃态 CSS 模板（纯函数，可单测）。
 * @param {{preset?: string, image?: string, opacity?: number}} bg 背景配置
 */
function buildGlassCss(bg = {}) {
  const preset = GRADIENT_PRESETS[bg.preset] || GRADIENT_PRESETS.deepSpace
  const image = bg.image ? `url("file:///${bg.image.replace(/\\/g, '/')}")` : 'none'
  const opacity = typeof bg.opacity === 'number' ? bg.opacity : 0.55

  return `
/* ===== dsh-desktop glassmorphism theme (auto-injected) ===== */
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
/* 背景层：渐变底 + 自定义图片（玻璃模糊覆盖） */
body::before {
  content: ''; position: fixed; inset: 0; z-index: -2;
  background: var(--bg-grad);
}
body::after {
  content: ''; position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background: var(--user-bg-image) center/cover no-repeat;
  filter: blur(24px) brightness(0.7);
  transform: scale(1.05);
  opacity: var(--user-bg-opacity);
}
/* 玻璃卡片：对主要面板/消息容器统一覆盖 */
.glass-card,
[class*='message'], [class*='panel'], [class*='card'], [class*='surface'] {
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
[class*='message']:hover, [class*='panel']:hover, [class*='card']:hover, [class*='surface']:hover {
  background: var(--glass-bg-hover) !important;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45), var(--glass-inner-glow) !important;
}
[class*='message']:active, [class*='panel']:active, [class*='card']:active, [class*='surface']:active {
  transform: scale(0.98) !important;
}
/* 文字层级 */
body, [class*='text'] { color: var(--text-primary) !important; }
[class*='secondary'], [class*='muted'], [class*='hint'] { color: var(--text-secondary) !important; }
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
/* 悬浮背景设置按钮（上传接口入口） */
#dsh-bg-fab {
  position: fixed !important; right: 20px !important; bottom: 20px !important;
  z-index: 99999 !important; width: 44px !important; height: 44px !important;
  border-radius: 50% !important; border: 1px solid var(--glass-border-highlight) !important;
  background: var(--glass-bg-strong) !important;
  backdrop-filter: blur(12px) !important;
  box-shadow: var(--glass-shadow) !important;
  color: var(--text-primary) !important; font-size: 20px !important;
  cursor: pointer !important; line-height: 44px !important; text-align: center !important;
  user-select: none !important;
  transition: background var(--motion-base) var(--ease-glass),
              box-shadow var(--motion-base) var(--ease-glass) !important;
}
#dsh-bg-fab:hover { background: var(--glass-bg-hover) !important; box-shadow: var(--glass-shadow), var(--accent-glow) !important; }
#dsh-bg-fab:active { transform: scale(0.95) !important; }
`
}

/** 注入玻璃态主题到 webContents；返回注入的样式 id（可重复注入覆盖） */
function injectGlassTheme(webContents, bg = {}) {
  if (!webContents || typeof webContents.insertCSS !== 'function') return null
  const css = buildGlassCss(bg)
  try {
    return webContents.insertCSS(css)
  } catch (err) {
    return null
  }
}

/** 注入悬浮背景按钮（触发 bg:select IPC） */
function injectBgFab(webContents) {
  if (!webContents || typeof webContents.executeJavaScript !== 'function') return
  const script = `
    (function () {
      if (document.getElementById('dsh-bg-fab')) return;
      var fab = document.createElement('div');
      fab.id = 'dsh-bg-fab';
      fab.title = '自定义背景';
      fab.textContent = '🎨';
      fab.addEventListener('click', function () {
        if (window.dshBg && window.dshBg.select) window.dshBg.select();
      });
      document.body.appendChild(fab);
    })();
  `
  try {
    webContents.executeJavaScript(script, true)
  } catch (_) {
    /* ignore */
  }
}

module.exports = { GRADIENT_PRESETS, buildGlassCss, injectGlassTheme, injectBgFab }
