export interface Chunk {
  text: string
  source: string // 文件相对路径
  index: number // 块序号
}

const DEFAULT_CHUNK_SIZE = 800
const DEFAULT_CHUNK_OVERLAP = 100

/**
 * 按段落+长度分块：先按空行分段，再合并到接近 chunkSize（带重叠）。
 * 中文按字符计长（简单可靠），保留来源与序号。（纯函数，可单测）
 */
export function chunkText(
  text: string,
  source: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP,
): Chunk[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0)

  const chunks: Chunk[] = []
  let buf = ''
  let index = 0

  const flush = () => {
    if (!buf.trim()) return
    chunks.push({ text: buf.trim(), source, index })
    index++
  }

  for (const para of paragraphs) {
    if (para.length > chunkSize) {
      // 超长段落：按字符硬切（带重叠）
      flush()
      let rest = para
      while (rest.length > 0) {
        const piece = rest.slice(0, chunkSize)
        chunks.push({ text: piece, source, index })
        index++
        rest = rest.slice(Math.max(0, chunkSize - overlap))
      }
      buf = ''
      continue
    }
    if (buf.length + para.length + 1 > chunkSize && buf) {
      flush()
      buf = para
    } else {
      buf = buf ? `${buf}\n${para}` : para
    }
  }
  flush()
  return chunks
}

/** 从文件名推断是否可索引的文档（纯函数，可单测） */
export function isIndexableFile(name: string): boolean {
  return /\.(md|mdx|txt|json|ya?ml|ts|tsx|js|jsx|py|rs|go|java|c|cpp|h|sh|sql|html|css)$/i.test(name)
}

/** 相对路径规范化：统一正斜杠（纯函数，可单测） */
export function normalizeRel(p: string): string {
  return p.replace(/\\/g, '/')
}
