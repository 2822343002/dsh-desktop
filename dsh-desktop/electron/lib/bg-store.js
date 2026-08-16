'use strict'

/**
 * bg-store.js — 背景图管理：选图 → 复制到 userData/backgrounds/ → 配置落盘。
 * 与 glass-theme.js 配合：配置写入后调用 injectGlassTheme 刷新 --user-bg-image。
 */
const fs = require('node:fs')
const path = require('node:path')
const { app, dialog } = require('electron')

const BG_CONFIG_FILE = 'bg-config.json'
const BG_DIR = 'backgrounds'
const MAX_BG_BYTES = 8 * 1024 * 1024 // 8MB 上限
const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.bmp']

function bgDir() {
  return path.join(app.getPath('userData'), BG_DIR)
}

function configPath() {
  return path.join(app.getPath('userData'), BG_CONFIG_FILE)
}

function readBgConfig() {
  try {
    if (!fs.existsSync(configPath())) return {}
    return JSON.parse(fs.readFileSync(configPath(), 'utf8')) || {}
  } catch (_) {
    return {}
  }
}

function writeBgConfig(cfg) {
  try {
    fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2))
    return true
  } catch (err) {
    console.error('[bg-store] 写入背景配置失败:', err && err.message)
    return false
  }
}

/**
 * 弹窗选图并落盘为 backgrounds/bg.<ext>，更新配置。
 * @returns {{ok: boolean, image?: string, canceled?: boolean, error?: string}}
 */
async function selectBackgroundImage(mainWindow) {
  try {
    const r = await dialog.showOpenDialog(mainWindow, {
      title: '选择背景图片',
      properties: ['openFile'],
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }],
    })
    if (r.canceled || r.filePaths.length === 0) return { ok: false, canceled: true }

    const src = r.filePaths[0]
    const stat = fs.statSync(src)
    if (stat.size > MAX_BG_BYTES) {
      return { ok: false, error: `图片过大（>8MB）：${(stat.size / 1048576).toFixed(1)}MB` }
    }
    const ext = path.extname(src).toLowerCase()
    if (!ALLOWED_EXT.includes(ext)) {
      return { ok: false, error: `不支持的图片格式：${ext || '(无扩展名)'}` }
    }

    fs.mkdirSync(bgDir(), { recursive: true })
    const target = path.join(bgDir(), `bg${ext}`)
    fs.copyFileSync(src, target)

    const cfg = { ...readBgConfig(), image: target }
    writeBgConfig(cfg)
    return { ok: true, image: target }
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) }
  }
}

/** 重置为纯渐变背景（清除自定义图） */
function resetBackground() {
  const cfg = readBgConfig()
  delete cfg.image
  writeBgConfig(cfg)
  return cfg
}

module.exports = {
  BG_CONFIG_FILE,
  bgDir,
  configPath,
  readBgConfig,
  writeBgConfig,
  selectBackgroundImage,
  resetBackground,
}
