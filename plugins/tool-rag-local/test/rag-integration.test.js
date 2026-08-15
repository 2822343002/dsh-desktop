import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chunkText } from '../lib/chunk.js'
import { cosineSimilarity } from '../lib/search.js'
import { JsonStore } from '../lib/store.js'

// 集成测试：用确定性 mock embedding（词袋哈希→向量）跑通 索引→检索 全流程，
// 不依赖真实模型下载，验证 store + indexer + search 链路。

function mockEmbed(text) {
  const v = new Array(16).fill(0)
  for (const ch of text) {
    v[(ch.codePointAt(0) || 0) % 16] += 1
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1
  return v.map((x) => x / norm)
}

test('JSON store 落盘与读取（可降级路径）', async () => {
  const file = new URL('./tmp-rag-store.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
  const fs = await import('node:fs')
  try { fs.rmSync(file, { force: true }) } catch { /* ignore */ }

  const store = new JsonStore(file)
  await store.upsert([{ vector: [1, 0], text: 'x', source: 'a.md', index: 0 }])
  assert.equal(await store.count(), 1)
  const items = await store.all()
  assert.equal(items[0].text, 'x')

  // 重新打开可读回
  const store2 = new JsonStore(file)
  assert.equal(await store2.count(), 1)
  try { fs.rmSync(file, { force: true }) } catch { /* ignore */ }
})

test('mock embedding 端到端：索引后能检索到相关块', async () => {
  const { indexDirectory } = await import('../lib/indexer.js')
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')

  const dir = path.join(os.tmpdir(), `rag-test-${Date.now()}`)
  fs.mkdirSync(dir, { recursive: true })
  // 每段足够长且语义独立；重复多份使总长超过 chunkSize(800)，确保产生多个块
  const agentDoc = Array(30)
    .fill([
      'DeepSeek Harness 是一个 Agent 运行框架，支持模型适配、工具注册、会话回放。',
      '它基于 Cordis 插件系统构建，一切皆插件，能力可自由组合替换。',
      'Agent 循环负责驱动模型请求与工具调用，处理上下文与结果。',
    ].join('\n\n'))
    .join('\n\n')
  const weatherDoc = Array(30)
    .fill([
      '今天天气晴朗，适合外出活动，气温二十摄氏度左右。',
      '明天可能下雨，建议携带雨伞出行。',
      '天气预报显示周末将转晴。',
    ].join('\n\n'))
    .join('\n\n')
  fs.writeFileSync(path.join(dir, 'guide.md'), agentDoc)
  fs.writeFileSync(path.join(dir, 'notes.txt'), weatherDoc)
  fs.writeFileSync(path.join(dir, 'image.png'), 'not text')

  const store = new JsonStore(path.join(os.tmpdir(), `rag-test-store-${Date.now()}.json`))
  const embed = { embed: mockEmbed, dims: () => 16 }
  const count = await indexDirectory({ rootDir: dir, embed, store })
  assert.ok(count >= 3, `应索引多个块，实际 ${count}`)

  const items = await store.all()
  // query 含足量 Agent 专属词（英文 token 在词袋哈希中与 Agent 块重叠）
  const q = mockEmbed('Agent Agent Agent 工具 调用 模型 框架 插件')
  const { topK } = await import('../lib/search.js')
  const res = topK(q, items.map((it) => ({ vector: it.vector, text: it.text, source: it.source, index: it.index })), 3)
  assert.ok(res.length >= 1)
  const best = res[0]
  assert.ok(best.text.includes('Agent'), '最高分块应为 Agent 相关，实际：' + best.source)

  fs.rmSync(dir, { recursive: true, force: true })
  try { fs.rmSync(store.file, { force: true }) } catch { /* ignore */ }
})
