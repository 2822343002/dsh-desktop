'use strict'

/**
 * bg-apply.js — 把背景自定义"原生地"应用到 dsh 前端。
 *
 * 机制（区别于 v2 的注入方案）：
 * - 玻璃态样式已由 scripts/patch-web-ui.sh 原生写入 dsh 的 dist/assets/glass.css，
 *   页面通过 index.html 的 <link> 加载，天然生效。
 * - 背景图应用：主进程把用户选择的图复制到 dsh dist/assets/bg-user.jpg（http 可访问），
 *   重写 glass.css 中的 --user-bg-image 变量，然后 reload 页面（原生刷新）。
 * - 无图时变量为 none，玻璃层只显示渐变。
 */
const fs = require('node:fs')
const path = require('node:path')
const { app } = require('electron')

const GLASS_FILENAME = 'glass.css'
const BG_IMAGE_FILENAME = 'bg-user.jpg'
const VAR_LINE_RE = /--user-bg-image:\s*[^;]+;/g

/** dsh 前端 dist 目录（打包后 process.resourcesPath/runtime/...；开发模式项目 runtime） */
function resolveWebDistDir() {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'runtime')
    : path.join(__dirname, '..', '..', '..', 'runtime')
  return path.join(base, 'node_modules', '@deepseek-ai', 'dsh-web-frontend', 'dist')
}

function glassCssPath() {
  return path.join(resolveWebDistDir(), 'assets', GLASS_FILENAME)
}

/** 读取当前背景配置（userData/bg-config.json） */
function readBgConfig() {
  try {
    const f = path.join(app.getPath('userData'), 'bg-config.json')
    if (!fs.existsSync(f)) return {}
    return JSON.parse(fs.readFileSync(f, 'utf8')) || {}
  } catch (_) {
    return {}
  }
}

/**
 * 把 glass.css 中的 --user-bg-image 变量替换为目标值。
 * @param {string} cssUrlValue 如 "url('/assets/bg-user.jpg')" 或 "none"
 */
function rewriteBgVariable(cssUrlValue) {
  const cssFile = glassCssPath()
  if (!fs.existsSync(cssFile)) return false
  let css = fs.readFileSync(cssFile, 'utf8')
  const newLine = `  --user-bg-image: ${cssUrlValue};`
  if (VAR_LINE_RE.test(css)) {
    css = css.replace(VAR_LINE_RE, () => newLine)
  } else {
    // 变量行缺失则追加到 :root 末尾（兜底）
    css = css.replace(/:root\s*\{/, (m) => `${m}\n${newLine}`)
  }
  fs.writeFileSync(cssFile, css)
  return true
}

/**
 * 应用背景（原生）：复制背景图到 dsh dist/assets/ 并重写 glass.css 变量。
 * @param {Electron.WebContents} [webContents] 提供则 reload 页面
 * @returns {{ok: boolean, error?: string}}
 */
function applyBackground(webContents) {
  try {
    const cfg = readBgConfig()
    const dist = resolveWebDistDir()
    if (!cfg.image) {
      rewriteBgVariable('none')
      if (webContents && !webContents.isDestroyed()) webContents.reload()
      return { ok: true }
    }
    const src = cfg.image
    if (!fs.existsSync(src)) {
      rewriteBgVariable('none')
      if (webContents && !webContents.isDestroyed()) webContents.reload()
      return { ok: true, error: '背景图缺失，已回退渐变' }
    }
    const target = path.join(dist, 'assets', BG_IMAGE_FILENAME)
    fs.copyFileSync(src, target)
    rewriteBgVariable(`url('/assets/${BG_IMAGE_FILENAME}')`)
    if (webContents && !webContents.isDestroyed()) webContents.reload()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) }
  }
}

module.exports = { resolveWebDistDir, glassCssPath, rewriteBgVariable, applyBackground, readBgConfig }
