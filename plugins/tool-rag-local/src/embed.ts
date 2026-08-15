import { readFile } from 'node:fs/promises'

/**
 * 本地 embedding 提供方：基于 @xenova/transformers（纯 JS/WASM，离线）。
 * 懒加载管道，默认使用小型多语模型 bge-small-zh-v1.5。
 */
let pipelinePromise: Promise<{ embed: (t: string) => Promise<number[]> }> | null = null

export interface EmbedProvider {
  embed(text: string): Promise<number[]>
  dims(): number
}

export async function getEmbedProvider(modelName = 'Xenova/bge-small-zh-v1.5'): Promise<EmbedProvider> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline } = await import('@xenova/transformers')
      const extractor = await pipeline('feature-extraction', modelName, {
        quantized: true,
      })
      return {
        async embed(text: string): Promise<number[]> {
          const out = await extractor(text, { pooling: 'mean', normalize: true })
          return Array.from(out.data as Float32Array)
        },
      }
    })()
  }
  const p = await pipelinePromise
  return {
    async embed(text: string): Promise<number[]> {
      return p.embed(text)
    },
    dims() {
      return 512 // bge-small 输出维度
    },
  }
}

export { readFile }
