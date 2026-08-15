/** 余弦相似度（纯函数，可单测） */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('向量维度不一致')
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

export interface ScoredChunk {
  text: string
  source: string
  index: number
  score: number
}

/** 对向量列表做 Top-K 相似度检索（纯函数，可单测） */
export function topK(
  query: number[],
  items: Array<{ vector: number[]; text: string; source: string; index: number }>,
  k: number,
): ScoredChunk[] {
  return items
    .map((it) => ({ ...it, score: cosineSimilarity(query, it.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ text, source, index, score }) => ({ text, source, index, score }))
}

/** 结果格式化为模型可读文本（纯函数，可单测） */
export function formatResults(results: ScoredChunk[], query: string): string {
  if (results.length === 0) return `未检索到与「${query}」相关的文档片段。`
  const lines = [`检索到 ${results.length} 个相关片段（query: ${query}）：`, '']
  for (const r of results) {
    lines.push(`【${r.source} #${r.index} | 相似度 ${r.score.toFixed(3)}】`)
    lines.push(r.text)
    lines.push('')
  }
  return lines.join('\n')
}
