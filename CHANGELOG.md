# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

- [ ] 三平台 CI 构建与自动发布（`v*` tag 触发）
- [ ] 应用内一键升级 dsh 版本
- [ ] 首次运行引导页（工作区 + API Key 向导）
- [ ] 系统托盘、开机自启
- [ ] 代码签名（Windows Authenticode / macOS notarization）

## [0.1.1] - 2026-08-15

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
