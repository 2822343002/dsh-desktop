# DeepSeek Harness Desktop（dsh-desktop）

> 🖥️ 把 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 装进桌面——**空白电脑双击即用**的 Agent 工作台。

**dsh-desktop** 是 DeepSeek Harness（`dsh`，官方开源 Agent 运行时）的桌面端封装：内置完整的 Node.js 运行时与 dsh 引擎，打包成**自包含桌面应用**。无需安装 Node.js、Python 或任何依赖，在没有任何环境的电脑上双击即可运行完整的 DeepSeek Agent 工作台（文件编辑、Shell、联网检索、Skills、子代理、工作流）。

## ✨ 功能特性

| 特性 | 说明 |
|---|---|
| 🚀 一键运行 | 双击即用，内置运行时，零环境依赖（无 Node/Python 要求） |
| 🖼️ 启动提示 | 便携版双击后立即显示"正在启动"画面（NSIS splash），自解压期间有反馈，不再"无反应" |
| 🖥️ 桌面形态 | Electron 壳 + 官方 dsh Web UI，原生窗口体验 |
| 🔌 完整 Agent 能力 | 文件编辑、Shell、文件/网页检索、Skills、计划、目标、子代理、工作流 |
| 🎛️ 多种运行模式 | 标准模式 / PTC 模式 / 极简模式 / 创造模式（dsh 原生 preset） |
| 🔒 数据隔离 | DSH_HOME 指向应用 userData，密钥只写不回显（`.credentials.yaml`） |
| 📦 多平台产物 | Windows（portable + 安装版）；macOS / Linux 由 CI 构建 |
| 🧩 可扩展 | 底层即 dsh 插件体系（一切皆插件），可按官方文档扩展工具/模型/技能 |

## 🖼️ 界面预览

> 应用启动后加载官方 DeepSeek Harness Web UI（`http://127.0.0.1:3080`）。

```
┌──────────────────────────────────────────────────────────┐
│  DeepSeek Harness Desktop                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │        DeepSeek Harness（官方 Web UI）              │  │
│  │  会话列表 · 模型选择 · 工作区 · 工具调用 · Trajectory │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## 🚀 快速开始

### 一键运行（最终用户）

1. 下载对应平台的发布产物（Releases 页面）：
   - **Windows**：`DeepSeek Harness Desktop-<版本>.exe`（便携版，双击即用）或 `... Setup <版本>.exe`（安装版）
   - **macOS / Linux**：`.dmg` / `.AppImage` 等（由 CI 构建）
2. 双击运行，应用自动启动内置 dsh 服务并打开界面（首次启动稍慢，需初始化数据目录）。
3. 在 **设置 → 模型** 中填入 DeepSeek API Key。
4. 选择工作区，开始你的 Agent 会话。

### 从源码构建（开发者）

要求：Node.js 24+（或使用仓库 `scripts/` 内置的 portable Node 方式）。

```bash
# 1. 准备 dsh 运行时（runtime/node_modules）
cd runtime
npm install --omit=dev

# 2. 准备内置 Node 运行时（dsh-desktop/node-runtime/）
cd ..
bash scripts/prepare-runtime.sh win   # 或 mac-arm64 / mac-x64 / linux-x64

# 3. 构建桌面应用
cd dsh-desktop
npm install
npm start                              # 开发模式运行
npx electron-builder --win --x64       # 打包（产出 portable + 安装版）
```

> macOS / Linux 产物因 electron-builder 交叉构建限制，请在对应平台构建，或推送 `v*` tag 触发 [CI](./.github/workflows/build.yml)。

## 📁 项目结构

```
dsh-desktop/
├── dsh-desktop/            # Electron 桌面壳（主进程、预加载、图标、构建配置）
├── runtime/                # dsh 运行时（依赖 @deepseek-ai/dsh，版本锁定）
├── scripts/                # 构建脚本（prepare-runtime.sh 等）
├── docs/                   # 开发记录（DEVELOPMENT.md）
├── .github/workflows/      # 三平台打包 CI
└── README.md
```

## 🏗️ 架构

```
┌──────────────────────────────────────────────┐
│  Electron 桌面壳（唯一可见窗口）               │
│   ┌────────────────────────────────────────┐ │
│   │ 主进程 main.js                         │ │
│   │  ├─ 单实例锁 / 生命周期 / 错误弹窗       │ │
│   │  └─ spawn ▸ 内置 node ▸ dsh web         │ │
│   └────────────────┬───────────────────────┘ │
│  BrowserWindow ◂── 加载 http://127.0.0.1:PORT │
│   （官方 dsh Web UI，与服务器版本强一致）       │
└───────────────────┬──────────────────────────┘
                    │ electron-builder 打包
        dsh-桌面端（portable / 安装版，三平台）
```

- **内置运行时**：捆绑官方 portable Node.js（非 Electron 内嵌 Node），规避原生模块 ABI 不匹配。
- **数据隔离**：`DSH_HOME` → 应用 `userData` 目录（密钥、会话、配置）。
- **端口策略**：主进程自动探测空闲端口，避免 3080 冲突。
- **日志**：主进程日志写入 `userData/dsh-desktop.log`。

## 📚 文档

- [开发记录与验证报告](./docs/DEVELOPMENT.md)（P0–P8 全流程、空白机端到端验证）
- [DeepSeek Harness 官方文档](https://deepseek-harness.github.io/deepseek-harness/)
- [DeepSeek Harness GitHub](https://github.com/deepseek-ai/deepseek-harness)

## 🗺️ 路线图

- [ ] 三平台 CI 构建与自动发布
- [ ] 应用内一键升级 dsh 版本
- [ ] 首次运行引导页（工作区 + API Key 向导）
- [ ] 系统托盘、开机自启
- [ ] 代码签名（Windows / macOS）

## ⚠️ 已知限制

- 产物未做代码签名（已按项目决定跳过，待后续提供 Authenticode/notarization 证书后启用；CI 的 `CSC_LINK`/`APPLE_ID` 等 secrets 已接线，配置后自动签名）。Windows SmartScreen 可能提示"未知发布者"，选择"仍要运行"即可。
- **体积与启动速度**：产物约 161MB（Electron + Node + dsh 依赖树），属自包含方案固有成本。打包前运行 `scripts/prune-runtime.sh` 按平台裁剪原生二进制（如 node-pty 跨平台 prebuilds），可进一步缩小体积、缩短 portable 自解压与安装耗时。已验证：win-unpacked 版启动至 UI 就绪约 3.7s；portable 版含 NSIS 自解压环节，期间会显示"正在启动"提示画面（勿重复双击）。
- dsh 处于 Developer Preview（当前锁定 `0.1.0-rc.6`），核心插件与 API 持续迭代，升级见[升级指南](./docs/DEVELOPMENT.md)。
- Windows 使用官方 pwsh 后端，POSIX 特有工具（如 tmux）不可用。

## 📄 许可

本项目基于 [MIT](./LICENSE) 开源协议发布。底层 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 同样采用 MIT 协议。
