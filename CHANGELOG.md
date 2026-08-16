# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

- [ ] 应用内一键升级 dsh 版本
- [ ] 代码签名（Windows Authenticode / macOS notarization）

### 新增（玻璃态 UI 美化 + 背景自定义）

- 运行时注入玻璃态主题（`electron/lib/glass-theme.js`）：雾面玻璃卡片（backdrop-blur + 高光描边）、深色渐变背景、霓虹 CTA、Hover/Active 动效（150–250ms，scale 0.98），不改 dsh 前端包、升级不覆盖
- 背景自定义（`electron/lib/bg-store.js`）：3 档渐变预设（深空蓝紫/墨绿/暖金）+ 自定义图片上传（托盘菜单「设置背景图片…」/ 悬浮 🎨 按钮 / IPC `bg:select`），图片自动覆盖玻璃模糊层（blur 24px + 亮度 0.7），配置持久化 `userData/bg-config.json`，重启保持
- 测试：`test/glass-theme.test.js` 6 项（CSS 生成/预设/图片 URL/透明度/悬浮按钮），node --test 全绿（13/13）

### 修复

- 内置插件自动注入：主进程启动时基于 `process.resourcesPath` 自动生成 `profiles/web/cordis.patch.yml`（以 `file://` URL 书写插件入口），portable/安装版/win-unpacked 通用，不再依赖固定绝对路径。此前手动写入的 `C:\...` 盘符路径会触发 `ERR_UNSUPPORTED_ESM_URL_SCHEME`，导致插件加载失败、dsh 启动超时、GUI 加载不出来
- 幂等：patch 文件已含自动注入标记则跳过重写，不覆盖用户自定义配置

## [0.2.0] - 2026-08-16

### 性能优化

- 新增 `scripts/bundle-plugins.sh`：打包前按生产依赖形态打入 6 个插件（A0 修复插件丢失：此前 koffi 补装时 npm install 清掉了手动拷贝的插件目录）+ A1 剔除插件 devDependencies（typescript 等）+ A2 删除 onnxruntime-web（Node 仅用 onnxruntime-node）
- 打包时清理 runtime 全树 `.d.ts`/`.d.ts.map`（类型声明运行时不需要，兼做瘦身）
- `portable.useZip` 曾启用，但因深嵌套依赖（`@smithy/core/dist-es` 等超长路径）导致 NSIS zip 内嵌失败，已回退（保留 LZMA2 + 二次启动缓存兜底）

### 主壳新增

- 系统托盘：最小化到托盘、托盘菜单（打开/退出）、窗口关闭常驻后台
- 自动更新：electron-updater 接入，GitHub release feed（`latest.yml`），启动延迟检查 + 下载/重启提示
- portable 二次启动缓存：自定义 NSIS 模板 + 应用播种 `%LOCALAPPDATA%\dsh-desktop-cache`，命中后跳过自解压，版本失效自动重建
- 可测性重构：抽出 `lib/net-utils.js` / `lib/runtime.js`，7 项 `node --test` 冒烟测试 + CI 测试步骤
- CI 三平台构建修复：linux/mac 的 prune 短名参数、homepage/author 元数据、mac 单架构 arm64，三平台全绿

### 移除

- 首次运行引导向导（wizard.html/wizard.js 及主进程向导逻辑）：因完成/跳过无法切换到主界面（回调缺陷），已整体移除；启动后直接加载 dsh Web UI

### 插件（独立 `@dsh-desktop/*` 包，cordis.yml patch 挂载）

- `@dsh-desktop/tool-notify` v0.1.0：系统通知（win/mac/linux），防注入
- `@dsh-desktop/tool-clipboard` v0.1.0：剪贴板读写（stdin 传递防注入）
- `@dsh-desktop/hooks-desk` v0.1.0：危险命令门禁（删库/格式化/关机/外传拦截）
- `@dsh-desktop/tool-screenshot` v0.1.0：全屏/区域截屏 → 图片附件（视觉模型可见）
- `@dsh-desktop/tool-ocr` v0.1.0：本地 OCR（Tesseract.js 7），中英文 + 离线 tessdata
- `@dsh-desktop/tool-rag-local` v0.1.0：本地文档语义检索（本地 embedding + sqlite-vec，降级 JSON）

### 说明

- 三平台产物：Windows（portable + Setup）、Linux（AppImage + deb）、macOS（dmg，arm64）由 CI 构建
- 代码签名仍为已知限制（CI secrets 已接线，配置证书后自动签名）

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
