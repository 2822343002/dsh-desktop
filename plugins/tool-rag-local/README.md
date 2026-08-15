# @dsh-desktop/tool-rag-local

本地文档检索（RAG）：模型可通过 `rag_index` 建立目录索引、`rag_search` 语义检索，
基于本地知识库（文档/代码）回答问题。全程本地，数据不出本机。

## 能力

- `rag_index(directory)`：扫描目录（md/txt/json/代码等）→ 分块 → 本地向量化 → 入库
- `rag_search(query, k?)`：语义检索 Top-K，返回片段 + 来源文件 + 相似度
- 本地 embedding：`@xenova/transformers`（bge-small-zh，纯 JS/WASM，离线）
- 存储：优先 sqlite-vec（本地 SQLite），加载失败自动降级 JSON 文件
- 自动跳过 `node_modules`/`.git`/`dist`/隐藏目录与二进制文件

## 挂载

```yaml
# cordis.patch.yml
- insert:
    - id: tool-rag-local
      name: '@dsh-desktop/tool-rag-local'
```

## 使用流程

1. 让模型调用 `rag_index(directory: "C:/projects/my-app")` 建立索引（首次需下载 embedding 模型，约几十 MB）
2. 之后调用 `rag_search(query: "这个项目的模块结构是什么")` 获取相关片段
3. 模型依据片段回答；知识库更新后可重新 `rag_index`

## 说明

- 索引存于 `$DSH_HOME/rag/index.db`（跨会话复用）
- 首次运行 `@xenova/transformers` 会下载模型（HuggingFace）；后续离线
- 默认按 800 字符分块、重叠 100；超长段落自动硬切

## 开发

```sh
npm install
npm run build   # tsc → lib/
npm test        # node --test（纯函数 + mock embedding 端到端，不下载模型）
```

## Changelog

见 [CHANGELOG.md](./CHANGELOG.md)。
