import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import path from 'node:path'
import os from 'node:os'
import { getEmbedProvider } from './embed.js'
import { indexDirectory } from './indexer.js'
import { topK, formatResults } from './search.js'
import { openStore } from './store.js'

export const name = 'tool-rag-local'
export const inject = ['tools']

/** 索引存储位置：$DSH_HOME/rag/（JSON 或 sqlite） */
function storePath(): string {
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
  return path.join(home, 'rag', 'index.db')
}

export function apply(ctx: Context) {
  ctx.tools.register(
    defineTool({
      name: 'rag_index',
      description:
        'Build a local retrieval index over a directory (docs/code). ' +
        'Use before rag_search so the model can answer questions from a local knowledge base.',
      parameters: {
        directory: {
          type: 'string',
          required: true,
          description: 'Absolute path of the directory to index',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const embed = await getEmbedProvider()
        const store = await openStore(storePath())
        const count = await indexDirectory({ rootDir: args.directory, embed, store })
        return `已索引 ${count} 个文档块（目录：${args.directory}）`
      },
    }),
  )

  ctx.tools.register(
    defineTool({
      name: 'rag_search',
      description:
        'Search the local index for chunks relevant to a question. ' +
        'Index the directory with rag_index first. Returns top-k document snippets with sources.',
      parameters: {
        query: {
          type: 'string',
          required: true,
          description: 'Search question or keywords',
        },
        k: {
          type: 'number',
          description: 'Number of results (default 5)',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const store = await openStore(storePath())
        const items = await store.all()
        if (items.length === 0) {
          return '索引为空，请先用 rag_index 建立本地索引。'
        }
        const embed = await getEmbedProvider()
        const queryVec = await embed.embed(args.query)
        const k = args.k && args.k > 0 ? Math.min(Math.floor(args.k), 20) : 5
        const results = topK(
          queryVec,
          items.map((it) => ({ vector: it.vector, text: it.text, source: it.source, index: it.index })),
          k,
        )
        return formatResults(results, args.query)
      },
    }),
  )
}
