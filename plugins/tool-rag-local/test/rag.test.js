import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chunkText, isIndexableFile, normalizeRel } from '../lib/chunk.js'
import { cosineSimilarity, topK, formatResults } from '../lib/search.js'

// —— chunk ——
test('chunkText 分块并保留来源与序号', () => {
  const text = ['p1 '.repeat(50), 'p2 '.repeat(50), 'p3 '.repeat(50)].join('\n\n')
  const chunks = chunkText(text, 'a.md')
  assert.ok(chunks.length >= 1)
  assert.equal(chunks[0].source, 'a.md')
  assert.equal(chunks[0].index, 0)
  for (let i = 1; i < chunks.length; i++) assert.equal(chunks[i].index, i)
})

test('chunkText 超长段落硬切', () => {
  const long = 'x'.repeat(3000)
  const chunks = chunkText(long, 'b.txt', 800, 100)
  assert.ok(chunks.length >= 4)
  for (const c of chunks) assert.ok(c.text.length <= 800)
})

test('isIndexableFile 识别文档与代码', () => {
  assert.equal(isIndexableFile('readme.md'), true)
  assert.equal(isIndexableFile('main.py'), true)
  assert.equal(isIndexableFile('package.json'), true)
  assert.equal(isIndexableFile('photo.png'), false)
  assert.equal(isIndexableFile('app.exe'), false)
})

test('normalizeRel 统一正斜杠', () => {
  assert.equal(normalizeRel('a\\b\\c.md'), 'a/b/c.md')
})

// —— search ——
test('cosineSimilarity 相同向量为 1', () => {
  assert.ok(Math.abs(cosineSimilarity([1, 0, 0], [1, 0, 0]) - 1) < 1e-9)
})

test('cosineSimilarity 正交为 0', () => {
  assert.ok(Math.abs(cosineSimilarity([1, 0], [0, 1])) < 1e-9)
})

test('topK 返回按相似度排序的 Top-K', () => {
  const items = [
    { vector: [1, 0], text: 'best', source: 'a.md', index: 0 },
    { vector: [0, 1], text: 'worst', source: 'b.md', index: 1 },
    { vector: [0.9, 0.1], text: 'second', source: 'c.md', index: 2 },
  ]
  const res = topK([1, 0], items, 2)
  assert.equal(res.length, 2)
  assert.equal(res[0].text, 'best')
  assert.equal(res[1].text, 'second')
})

test('formatResults 空结果有提示', () => {
  assert.ok(formatResults([], 'q').includes('未检索到'))
})

test('formatResults 含来源与相似度', () => {
  const out = formatResults([{ text: 'hello', source: 'a.md', index: 3, score: 0.95 }], 'q')
  assert.ok(out.includes('a.md'))
  assert.ok(out.includes('0.95'))
})
