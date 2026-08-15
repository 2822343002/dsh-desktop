import fs from 'node:fs'
import path from 'node:path'

export interface StoredItem {
  vector: number[]
  text: string
  source: string
  index: number
}

export interface VectorStore {
  upsert(items: StoredItem[]): Promise<void>
  all(): Promise<StoredItem[]>
  clear(): Promise<void>
  count(): Promise<number>
}

/**
 * 向量存储：优先 sqlite-vec（本地 SQLite 扩展），加载失败自动降级为
 * JSON 文件存储（纯 JS，跨平台零原生依赖）。
 */
export async function openStore(dbPath: string): Promise<VectorStore> {
  try {
    const vec = await import('sqlite-vec')
    const { DatabaseSync } = await import('node:sqlite')
    const db = new DatabaseSync(dbPath)
    vec.load(db)
    db.exec(`
      CREATE TABLE IF NOT EXISTS chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vector BLOB NOT NULL,
        text TEXT NOT NULL,
        source TEXT NOT NULL,
        idx INTEGER NOT NULL
      );
    `)
    return new SqliteVecStore(db)
  } catch {
    return new JsonStore(dbPath)
  }
}

class SqliteVecStore implements VectorStore {
  constructor(private db: { exec(s: string): void; prepare(s: string): any }) {}

  async upsert(items: StoredItem[]) {
    const insert = this.db.prepare(
      'INSERT INTO chunks (vector, text, source, idx) VALUES (?, ?, ?, ?)',
    )
    for (const it of items) {
      insert.run(Buffer.from(Float32Array.from(it.vector).buffer), it.text, it.source, it.index)
    }
  }

  async all(): Promise<StoredItem[]> {
    const rows = this.db.prepare('SELECT vector, text, source, idx FROM chunks').all() as Array<{
      vector: Buffer
      text: string
      source: string
      idx: number
    }>
    return rows.map((r) => ({
      vector: Array.from(new Float32Array(r.vector.buffer, r.vector.byteOffset, r.vector.byteLength / 4)),
      text: r.text,
      source: r.source,
      index: r.idx,
    }))
  }

  async clear() {
    this.db.exec('DELETE FROM chunks')
  }

  async count(): Promise<number> {
    const r = this.db.prepare('SELECT COUNT(*) AS n FROM chunks').get() as { n: number }
    return r.n
  }
}

export class JsonStore implements VectorStore {
  file: string
  private items: StoredItem[] = []

  constructor(file: string) {
    this.file = file
    if (fs.existsSync(file)) {
      try {
        this.items = JSON.parse(fs.readFileSync(file, 'utf8'))
      } catch {
        this.items = []
      }
    }
  }

  private persist() {
    fs.writeFileSync(this.file, JSON.stringify(this.items))
  }

  async upsert(items: StoredItem[]) {
    this.items.push(...items)
    this.persist()
  }

  async all(): Promise<StoredItem[]> {
    return this.items
  }

  async clear() {
    this.items = []
    this.persist()
  }

  async count(): Promise<number> {
    return this.items.length
  }
}
