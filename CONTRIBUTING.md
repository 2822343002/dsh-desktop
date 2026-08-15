# 贡献指南

感谢你考虑为 **dsh-desktop** 贡献代码！请阅读以下约定。

## 开发环境

- 本仓库开发机使用 `.tools/` 下的 portable Node.js 24（不入库），无系统 Node 依赖。
- npm 建议使用国内镜像加速：`--registry=https://registry.npmmirror.com`。
- 完整构建流程见 [README：从源码构建](README.md#从源码构建开发者)。

## 分支与提交

- 基于 `main` 创建功能分支：`git checkout -b feat/xxx`
- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)：
  - `feat: ...` / `fix: ...` / `docs: ...` / `chore: ...` / `refactor: ...` / `test: ...`
- 提交前确认 `.gitignore` 已排除：`node_modules/`、`dist/`、`node-runtime/`、`.tools/`、密钥文件。

## 改动范围

| 目录 | 说明 |
|---|---|
| `dsh-desktop/electron/` | 主进程/预加载（壳逻辑，勿改 dsh 源码） |
| `runtime/` | dsh 运行时依赖版本（升级需重新打包并更新文档） |
| `scripts/` | 构建/运行时准备脚本 |
| `docs/` | 开发记录与验证报告 |

## 测试与验证

- 主进程改动：`node --check dsh-desktop/electron/main.js`
- 打包后请按 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) 的 P7 流程做空白机端到端验证（启动 → UI → 真实会话）。

## 提交流程

1. Fork 本仓库并创建分支。
2. 完成改动并本地验证。
3. 提交 PR，说明改动动机、验证结果（最好附日志）。
4. 维护者 review 后合并。

## 报告问题

- 使用 GitHub Issues，附上：平台/版本、`userData/dsh-desktop.log` 内容、复现步骤。
