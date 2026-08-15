import fs from 'node:fs'
import path from 'node:path'
import { chunkText, isIndexableFile, normalizeRel, type Chunk } from './chunk.js'
import type { EmbedProvider } from './embed.js'
import type { VectorStore } from './store.js'

export interface IndexOptions {
  rootDir: string
  embed: EmbedProvider
  store: VectorStore
  /** 是否跳过隐藏目录与 node_modules/.git 等 */
  skipHidden?: boolean
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.tools', '__pycache__'])

/** 递归收集可索引文件（纯逻辑，可单测） */
export function collectFiles(rootDir: string, skipHidden = true): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skipHidden && entry.name.startsWith('.')) continue
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue
        walk(path.join(dir, entry.name))
      } else if (entry.isFile() && isIndexableFile(entry.name)) {
        out.push(path.join(dir, entry.name))
      }
    }
  }
  walk(rootDir)
  return out
}

/** 扫描 → 分块 → 向量化 → 入库；返回入库块数 */
export async function indexDirectory(opts: IndexOptions): Promise<number> {
  const files = collectFiles(opts.rootDir, opts.skipHidden !== false)
  await opts.store.clear()

  let total = 0
  for (const file of files) {
    let text: string
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }
    const rel = normalizeRel(path.relative(opts.rootDir, file))
    const chunks: Chunk[] = chunkText(text, rel)
    const items = []
    for (const c of chunks) {
      const vector = await opts.embed.embed(c.text)
      items.push({ vector, text: c.text, source: c.source, index: c.index })
    }
    if (items.length > 0) {
      await opts.store.upsert(items)
      total += items.length
    }
  }
  return total
}
