# Changelog

## [0.1.0] - 2026-08-16

### 新增

- `rag_index` / `rag_search` 本地文档检索工具
- 本地 embedding（`@xenova/transformers` bge-small-zh，离线）
- 存储：sqlite-vec 优先，失败降级 JSON 文件
- 分块（800 字符/重叠 100）、Top-K 余弦检索、结果格式化
- node --test：纯函数单测 + mock embedding 端到端集成测试（不下载模型）
