# @dsh-desktop 插件包规范

本目录存放 dsh-desktop 的**独立插件包**。每个插件是独立 npm 包（`@dsh-desktop/*`），
遵循模块化开发约定（见 [docs/PLUGINS.md](../docs/PLUGINS.md) 与 [ROADMAP.md](../docs/ROADMAP.md#七模块化开发约定)）。

## 目录结构

```
plugins/
├── README.md              # 本文件：包清单与规范摘要
├── _template/             # 新插件脚手架模板（复制改名为真实插件）
├── tool-notify/           # 示例：@dsh-desktop/tool-notify
├── tool-clipboard/        # 示例：@dsh-desktop/tool-clipboard
└── ...                    # 其余插件
```

## 每个插件包必备文件

| 文件 | 说明 |
|---|---|
| `package.json` | `name: @dsh-desktop/<name>`、独立 SemVer、`main`/`exports` 指向 `lib/index.js` |
| `src/index.ts` | 导出 `apply(ctx)`；必要时声明 `inject`；所有注册走 `ctx`（卸载自动回收） |
| `README.md` | 能力说明、配置项、挂载示例（cordis.yml patch） |
| `CHANGELOG.md` | 该插件的独立变更记录 |

## 挂载方式（cordis.yml patch）

插件不修改主壳源码。在对应层的 patch 文件中用 `insert` 挂载（绝对路径或包名）：

```yaml
- insert:
    - id: tool-notify
      name: '@dsh-desktop/tool-notify'        # 或 /absolute/path/to/plugins/tool-notify/src/index.ts
```

- **开发模式**：`pnpm dsh web --patch <patch.yml>`
- **profile 级**：写入 `$DSH_HOME/profiles/web/cordis.patch.yml`（`[]` 数组）
- **home 级**：写入 `$DSH_HOME/cordis.patch.yml`（所有 profile 共享）

## 依赖与命名约束

- 插件只依赖 `@deepseek-ai/*` 官方 API 与自身依赖，**禁止依赖其他插件或主壳内部模块**。
- npm 包名统一 `@dsh-desktop/<name>`；目录名与包名 `<name>` 一致。
- 插件版本独立 SemVer；主应用在挂载配置中锁定版本。

## 插件清单（状态）

| 包 | 能力 | 状态 |
|---|---|---|
| `@dsh-desktop/tool-notify` | 系统通知（长任务完成提醒） | ✅ 已交付 v0.1.0 |
| `@dsh-desktop/tool-clipboard` | 读写系统剪贴板 | ✅ 已交付 v0.1.0 |
| `@dsh-desktop/hooks-desk` | 危险命令门禁 | ✅ 已交付 v0.1.0 |
| `@dsh-desktop/tool-screenshot` | 截屏/区域截图 → 图片附件（视觉模型可见） | ✅ 已交付 v0.1.0 |
| `@dsh-desktop/tool-ocr` | 图片文字识别（Tesseract.js 本地） | ✅ 已交付 v0.1.0 |
| `@dsh-desktop/tool-rag-local` | 本地文档向量化 + 语义检索 | ✅ 已交付 v0.1.0 |
| `@dsh-desktop/cost-guard` | token 预算/降级 | 计划 |
| `@dsh-desktop/plan-review` | 计划模式强制评审 | 计划 |
| `@dsh-desktop/llm-ollama` | 本地 Ollama 适配器 | 计划 |
| `@dsh-desktop/llm-azure` | Azure OpenAI 适配器 | 计划 |
| `@dsh-desktop/skill-repo-reviewer` | 仓库评审技能包 | 计划 |
