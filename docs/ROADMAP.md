# dsh-desktop 路线图与开发约定（ROADMAP）

> 目标版本：v0.2.x 起。本文档是改进 / 优化 / 扩展 / 插件增量的全量方案，也是**版本管理与模块化开发**的约定来源。
> 维护规则：每完成一个里程碑项，在下方勾选并同步更新 CHANGELOG.md，按约定打 tag。

---

## 一、现状与短板（方案依据）

| 维度 | 现状问题 |
|---|---|
| 体积/启动 | 产物 161MB；portable 每次运行 NSIS 静默解压 10–25s，安装版 86–130s |
| CI | 三平台构建在 mac/linux 的 prune 步骤失败（bash 兼容问题），尚未跑通 |
| 分发 | 无代码签名（SmartScreen 警告）、无自动更新器 |
| 体验 | 首次运行需手动选工作区 + 填 API Key，无引导；无托盘/自启 |
| 功能 | 仅封装官方 Web UI，无桌面端特有增强 |
| 扩展 | 尚未利用 dsh「一切皆插件」体系定制专属插件 |

---

## 二、改进优化

### P0 · 工程必做
- [ ] **修复 CI 三平台构建**：prune 步骤加 `set -x` 调试日志，定位 mac/linux 的 bash 兼容问题（`du -sk`/glob 空匹配/`set -euo pipefail` 管道 SIGPIPE），修通后三平台产物全自动
- [ ] **代码签名**：Windows Authenticode 证书 + macOS notarization（CI 注入 secrets）
- [ ] **自动更新器**：接入 `electron-updater`，Release 资产附带 `latest.yml`，应用内检查更新
- [ ] **可测性重构与冒烟测试**：main.js 抽出可测模块（端口探测/运行时解析/生命周期），CI 加 `node --test`

### P1 · 性能优化
- [ ] **portable 二次启动缓存**：首次解压后缓存解压目录到 `%LOCALAPPDATA%`（校验 hash 复用），后续启动跳过 NSIS 自解压（启动 25s → 3–5s）
- [ ] **体积再压缩**：按 provider 裁剪 `@aws-sdk`/`@opentelemetry` 等；runtime 改 pnpm 严格安装去重（161MB → 130MB 以下）
- [ ] **懒加载**：主进程先出窗口 + loading 页，dsh server 后台就绪后注入
- [ ] **端口冲突兜底**：3080 被占自动递增（已实现）+ 冲突弹窗提示

### P2 · 体验增强
- [ ] **首次运行引导向导**：欢迎页 → 选工作区 → 填 API Key → 选 preset（标准/PTC/极简）→ 完成
- [ ] **系统托盘**：最小化到托盘、后台常驻、托盘菜单（打开/设置/退出）
- [ ] **开机自启**（可选开关）
- [ ] **多语言**：UI 文案 i18n（中/英）
- [ ] **崩溃诊断**：`userData/dsh-desktop.log` 一键「复制诊断信息」

---

## 三、功能扩展（桌面端特有）

| 功能 | 说明 | 依托机制 |
|---|---|---|
| 会话管理面板 | 桌面侧边栏：历史会话搜索/恢复/分叉 | `ctx.sessions` + `session/event` |
| 多账号/多端点配置 | 一键切换 DeepSeek/OpenAI 兼容网关/本地 Ollama | `ctx.llm` 适配器 + settings.yaml |
| 用量与成本统计 | Token 计量面板（会话/日/模型汇总） | `dsh-token-meter` + 会话事件 |
| 工作区收藏 | 常用目录收藏、最近打开、多工作区切换 | Web UI 工作区 + 本地状态 |
| 导出/分享 | 会话导出 Markdown/JSON，复盘报告 | `session/event` 流 + 渲染 |
| 云同步（可选） | 会话/配置加密同步到用户自选存储（WebDAV/S3） | 插件层实现 |

---

## 四、插件增量（模块化开发核心）

> 每个插件为独立 npm 包（`@dsh-desktop/*`），独立版本号与 CHANGELOG，经 `cordis.yml` patch 挂载，
> 主壳零侵入；插件组合可封装为 profile（bundle）分发。

### 4.1 工具类插件（`ctx.tools.register`）
- [x] `@dsh-desktop/tool-notify`：系统通知（长任务完成提醒）— v0.1.0 已交付
- [x] `@dsh-desktop/tool-clipboard`：读写系统剪贴板 — v0.1.0 已交付
- [x] `@dsh-desktop/tool-screenshot`：截屏/区域截图 → 图片附件（视觉模型可见）— v0.1.0 已交付
- [x] `@dsh-desktop/tool-rag-local`：本地目录文档向量化 + 检索 — v0.1.0 已交付
- [x] `@dsh-desktop/tool-ocr`：图片文字识别（Tesseract.js）— v0.1.0 已交付

### 4.2 钩子/策略插件（事件扩展点）
- [ ] `@dsh-desktop/hooks-desk`：危险命令门禁（删库/清盘/curl 外传拦截）`tools/pre-execute`
- [ ] `@dsh-desktop/cost-guard`：token 预算 / 模型价位自动降级或暂停 `ctx.approval`
- [ ] `@dsh-desktop/plan-review`：计划模式强制「先计划后执行」`agent/turn-stopping`

### 4.3 模型适配器（`ctx.llm` registerAdapter）
- [ ] `@dsh-desktop/llm-ollama`：本地 Ollama（离线可用）
- [ ] `@dsh-desktop/llm-azure`：Azure OpenAI 网关

### 4.4 技能/记忆/定时
- [ ] `@dsh-desktop/skill-repo-reviewer`：仓库评审技能包
- [ ] 记忆增强：session 间长期记忆（section 提供方）
- [ ] 定时任务：每日项目日报（cron + 通知）

### 4.5 UI/集成
- [ ] 自定义会话节点（`ConversationNodeDefinition`）：内嵌「项目速览/文件树」卡片
- [ ] ACP 桥（`packages/acp`）：对外暴露 Agent Client Protocol

### 4.6 Profile 封装
- [ ] `dsh-desktop-pro` profile（bundle）：标准 / 极简 / 专业版三档 preset

---

## 五、分发与生态

- CI 三平台构建 → 自动创建 Release + 上传资产 + `latest.yml`（更新器用）
- README 增加「插件开发指南」章节（扩展点清单）
- 插件仓库规范：`dsh-plugin` topic、模板 repo、`create-dsh-plugin` 脚手架
- 里程碑：v0.2.0（CI+签名+引导向导）、v0.3.0（托盘+自动更新+性能）、v0.4.0（插件市场）

---

## 六、版本管理约定

| 规则 | 说明 |
|---|---|
| 语义化版本 | 主应用遵循 SemVer：`主.次.补丁`；破坏性变更升主版本 |
| 版本来源 | 单一事实：`dsh-desktop/package.json` 的 `version`；发版前同步 `package-lock.json` |
| Tag | 每次发版打 `v<版本>` tag（如 `v0.2.0`），推送触发 CI 三平台构建 |
| Changelog | 每个版本在 `CHANGELOG.md` 记录，遵循 Keep a Changelog |
| 插件版本 | 插件独立 SemVer，独立 `plugins/<name>/CHANGELOG.md`；主应用在 `cordis.yml` 中锁定插件版本 |
| 未发布变更 | 全部记录于 `Unreleased` 节，发版时归档 |
| 分支策略 | `main` 为发布分支，功能开发在 `feat/*` 分支，合并后删除 |

## 七、模块化开发约定

| 规则 | 说明 |
|---|---|
| 目录结构 | 插件统一放 `plugins/<name>/`（含 package.json、src/、README、CHANGELOG）；主壳代码在 `dsh-desktop/electron/` |
| 依赖方向 | 插件只依赖 `@deepseek-ai/*` 官方 API 与自身依赖，**禁止依赖其他插件或主壳内部模块** |
| 挂载方式 | 插件通过 `cordis.yml` patch 的 `insert` 条目挂载（绝对路径或包名），不修改主壳源码 |
| 命名 | npm 包名 `@dsh-desktop/<name>`；导出 `apply(ctx)` 函数，必要时声明 `inject` 依赖 |
| 副作用清理 | 所有注册通过 `ctx`（监听/工具/定时器），插件卸载自动回收；手动资源用 `ctx.effect()` |
| 测试 | 每个插件至少一个冒烟测试（`node --test`），CI 执行 |
| 文档 | 每个插件必须有 README（能力、配置、挂载示例）与 CHANGELOG |

## 八、执行顺序（难度/耗时由小到大）

1. P0-CI 修复 + 冒烟测试（工程地基）
2. portable 二次启动缓存（用户感知最强的「慢」）
3. 首次运行引导 + 系统托盘（完整产品感）
4. 首批轻插件：`tool-notify`、`tool-clipboard`、`hooks-desk`（见效快、演示性强）
5. 自动更新器 + 代码签名（分发完备）
6. 重插件（screenshot/ocr/rag）与 profile 封装按需排期
