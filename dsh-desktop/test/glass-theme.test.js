import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { GRADIENT_PRESETS, buildGlassCss } = require('../electron/lib/glass-theme.js')

test('GRADIENT_PRESETS 提供 3 档预设', () => {
  assert.equal(Object.keys(GRADIENT_PRESETS).length, 3)
  assert.ok(GRADIENT_PRESETS.deepSpace.css.includes('linear-gradient'))
  assert.ok(GRADIENT_PRESETS.emerald.css.includes('#022c22'))
  assert.ok(GRADIENT_PRESETS.warmGold.css.includes('linear-gradient'))
})

test('buildGlassCss 默认生成深空渐变与玻璃卡片', () => {
  const css = buildGlassCss()
  assert.ok(css.includes('backdrop-filter: blur(18px)'))
  assert.ok(css.includes('--bg-grad:'))
  assert.ok(css.includes('--user-bg-image: none'))
  assert.ok(css.includes('--motion-base: 200ms'))
  assert.ok(css.includes('scale(0.98)'))
})

test('buildGlassCss 自定义预设生效', () => {
  const css = buildGlassCss({ preset: 'emerald' })
  assert.ok(css.includes('#022c22'))
})

test('buildGlassCss 图片路径转 file:// URL', () => {
  const css = buildGlassCss({ image: 'C:\\Users\\x\\bg.png' })
  assert.ok(css.includes('url("file:///C:/Users/x/bg.png")'))
})

test('buildGlassCss 自定义透明度生效', () => {
  const css = buildGlassCss({ opacity: 0.8 })
  assert.ok(css.includes('--user-bg-opacity: 0.8'))
})

test('buildGlassCss 包含悬浮按钮样式与玻璃层', () => {
  const css = buildGlassCss()
  assert.ok(css.includes('#dsh-bg-fab'))
  assert.ok(css.includes('body::after'))
  assert.ok(css.includes('blur(24px)'))
})
