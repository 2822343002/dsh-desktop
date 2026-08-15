# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

- [ ] 三平台 CI 构建与自动发布（`v*` tag 触发）
- [ ] 应用内一键升级 dsh 版本
- [ ] 首次运行引导页（工作区 + API Key 向导）
- [ ] 系统托盘、开机自启
- [ ] 代码签名（Windows Authenticode / macOS notarization）

## [0.1.2] - 2026-08-16

### 新增（重插件）

- `@dsh-desktop/tool-ocr` v0.1.0：本地 OCR（Tesseract.js 7），`ocr_image` 识别截图/扫描件文字，支持中英文与离线 tessdata
- `@dsh-desktop/tool-screenshot` v0.1.0：`take_screenshot` 全屏/区域截屏，图片经 `ctx.attachments` 注册为附件供视觉模型可见（win/mac/linux）
- `@dsh-desktop/tool-rag-local` v0.1.0：`rag_index` / `rag_search` 本地文档语义检索（`@xenova/transformers` 本地 embedding + sqlite-vec，自动降级 JSON 存储）

### 说明

- 三个插件均为独立 `@dsh-desktop/*` npm 包，独立版本与 CHANGELOG，经 cordis.yml patch 挂载
- 每个插件含 node --test 冒烟测试（tool-ocr 5 项 / tool-screenshot 7 项 / tool-rag-local 11 项含端到端）

## [0.1.1] - 2026-08-15

### 新增

- 便携版启动提示画面：双击后立即显示"正在启动" splash 图（NSIS `portable.splashImage`），自解压期间有反馈，消除"双击无反应"的观感

### 优化

- 新增 `scripts/prune-runtime.sh`：打包前按目标平台裁剪原生二进制（node-pty 跨平台 prebuilds 等），Windows 产物由约 173MB 降至 161MB，缩短 portable 自解压与安装耗时
- CI workflow 增加裁剪步骤，三平台产物均受益
- 验证：win-unpacked 版启动至 UI 就绪约 3.7s；裁剪后引擎与打包应用端到端正常（HTTP 200）

## [0.1.0] - 2026-08-15

### 新增

- 自包含桌面端封装：Electron 壳 + 内置 portable Node.js + dsh 运行时（`@deepseek-ai/dsh@0.1.0-rc.6`）
- 一键运行：空白电脑（无 Node/Python/依赖）双击即用，内置官方 dsh Web UI
- 主进程：单实例锁、空闲端口探测、启动失败弹窗、文件日志（`userData/dsh-desktop.log`）、退出时 dispose dsh
- 数据隔离：DSH_HOME → 应用 userData；密钥只写不回显
- 多平台运行时准备脚本 `scripts/prepare-runtime.sh`（win / mac-arm64 / mac-x64 / linux-x64）
- 三平台打包 CI（`.github/workflows/build.yml`）
- Windows 产物：portable（173MB）+ NSIS 安装版（174MB）

### 已验证

- 空白机模拟（纯净 PATH）一键启动 → HTTP 200 / "DeepSeek Harness" / 3080 监听
- 打包产物内置运行时 headless 真实会话 → 模型返回成功（EXIT=0）

### 说明

- dsh 处于 Developer Preview，核心插件与 API 持续迭代，版本锁定 `0.1.0-rc.6`；升级流程见 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)。
