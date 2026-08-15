import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildOcrOptions, cleanOcrText, extractText } from '../lib/ocr.js'

test('buildOcrOptions 默认 eng', () => {
  const o = buildOcrOptions({})
  assert.equal(o.lang, 'eng')
  assert.equal(o.maxDimension, 2048)
})

test('buildOcrOptions 支持自定义语言与离线路径', () => {
  const o = buildOcrOptions({ lang: 'chi_sim', langPath: 'C:/tessdata', maxDimension: 1024 })
  assert.equal(o.lang, 'chi_sim')
  assert.equal(o.langPath, 'C:/tessdata')
  assert.equal(o.maxDimension, 1024)
})

test('buildOcrOptions 忽略非法值', () => {
  const o = buildOcrOptions({ maxDimension: -5, timeoutMs: 0 })
  assert.equal(o.maxDimension, 2048)
  assert.equal(o.timeoutMs, 120000)
})

test('cleanOcrText 去控制字符并压缩空白', () => {
  assert.equal(cleanOcrText('  Hello\u0000  World \t test  \n\n  line2  \n'), 'Hello World test\nline2')
})

test('extractText 提取并清洗识别结果', () => {
  assert.equal(extractText({ data: { text: '  Foo \n  \n Bar  ' } }), 'Foo\nBar')
  assert.equal(extractText({ data: {} }), '')
  assert.equal(extractText({}), '')
})
