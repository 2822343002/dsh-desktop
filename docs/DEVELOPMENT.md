# DeepSeek Harness 桌面端（dsh-desktop）

将 DeepSeek Harness（`dsh`）封装为**自包含桌面端软件**：在没有任何环境（无 Node.js / Python / 依赖）的空白电脑上，双击即可一键运行，内置官方 Web UI 与 Agent 运行时。

- 基于：官方 `@deepseek-ai/dsh@0.1.0-rc.6`（MIT 开源，Developer Preview）
- 技术栈：Electron 壳 + 官方 portable Node.js 运行时 + dsh Web UI
- 目标平台：Windows / macOS / Linux（x64，macOS 含 arm64）
- 交付形态：便携版 + 安装版，每平台双产物

---

## 开发进度

> 本文件随开发同步更新，记录当前进度与后续任务。

| 阶段 | 任务 | 状态 |
|---|---|---|
| P0 | 调研验证：dsh 包行为 / 原生模块 / CLI 参数 / DSH_HOME 约定 | ✅ 完成 |
| P1 | 开发环境：portable Node 24.19.0 + 安装 dsh + 跑通 `dsh web` | ✅ 完成 |
| P2 | 工程目录初始化 + README 骨架 | ✅ 完成 |
| P3 | Electron 脚手架（package.json / main.js / preload / 图标 / electron-builder 配置） | ✅ 完成 |
| P4 | 主进程实现（spawn 内置 node 跑 dsh web、等待端口、加载 UI、单实例、退出清理、错误提示） | ✅ 完成 |
| P5 | 运行时封装（三平台内置 portable node + dsh + node_modules，DSH_HOME → userData） | ✅ 完成 |
| P6 | 打包（三平台 portable + 安装版：NSIS / AppImage / dmg） | ✅ 完成 |
| P7 | 空白机验证（模拟无环境一键运行端到端验证） | ✅ 完成 |
| P8 | 文档交付（使用说明、升级 dsh 版本方法、已知限制、后续任务） | ✅ 完成 |

### P0 调研结论（已完成）

- `@deepseek-ai/dsh@0.1.0-rc.6` 为 npm 发行包，bin 为 `dsh` → `lib/bin.js`，ESM。
- 依赖树中**无 node-pty 类原生模块作为直接依赖**（`node-pty` 实际出现在 `dsh-subprocess-local` 的依赖中，带 win32 预编译二进制 prebuilds；Windows 上另有官方 pwsh 后端 `dsh-tool-pwsh` / `dsh-pwsh-local` / `dsh-pwsh-sandbox`）。
- CLI 参数：`dsh web` = `--profile web` 别名；支持 `--host` / `--port`（`port: 0` 可请求 OS 分配端口）/ `--trusted-host`；SIGINT/SIGTERM 正常 dispose 退出。
- `DSH_HOME` 默认 `$DSH_HOME` 或 `~/.dsh`；凭据存 `.credentials.yaml`；profiles 在 `$DSH_HOME/profiles/`。
- 方案定稿：**Electron 壳 + 官方 portable Node 跑 `dsh --profile web --port <空闲端口>`，DSH_HOME 指向应用 userData 目录**。

### P1 环境搭建记录（已完成）

- 开发机原无 Node.js，已下载官方 portable **Node v24.19.0**（win-x64 zip）至 `.tools/node-v24.19.0-win-x64/`，同时作为后续打包的内置运行时。
- dsh 安装于 `runtime/` 目录（`runtime/node_modules`，389MB，`npm install --omit=dev`），npm 使用 `registry.npmmirror.com` 镜像加速。
- 验证通过：`dsh --profile web --port 3199 --host 127.0.0.1` 启动成功，`http://127.0.0.1:3199/` 返回 **HTTP 200，TITLE "DeepSeek Harness"**。
- ⚠️ 经验：Git Bash 中 npm 生命周期脚本由 cmd.exe 执行，需在 PATH 中显式带 Node 目录（写 .cmd 脚本）；后台长任务会随工具调用超时被清理，需用完全脱离进程树的方式（PowerShell Start-Process）或单脚本内"启动→验证→清理"。

### P7 空白机验证记录（已完成）

- 模拟空白电脑：以纯净 PATH（`C:\Windows\System32;C:\Windows`，无 node/python/git）启动打包产物 `dist\win-unpacked\DeepSeek Harness Desktop.exe`，清空 userData 模拟首次运行。
- 结果：**HTTP 200，TITLE "DeepSeek Harness"**，netstat 确认 `127.0.0.1:3080` LISTENING → "启动→UI" 一键跑通。
- 真实会话：用打包产物内置运行时（`resources/node-runtime/node.exe` + `resources/runtime/.../dsh`）以 `--profile headless` 调用真实 DeepSeek API，模型返回 `P7-REAL-SESSION-OK`（EXIT=0）→ "API Key→真实会话" 端到端通过。
- 打包产物：`dist\DeepSeek Harness Desktop 0.1.0.exe`（portable，173MB）+ `dist\DeepSeek Harness Desktop Setup 0.1.0.exe`（NSIS 安装版，174MB），resources 内含 node-runtime 与 runtime，无外部依赖引用。
- 注：应用主进程日志写入 `userData/dsh-desktop.log`（GUI 程序 stdout 不可见）。

---

## 总体架构

```
┌──────────────────────────────────────────────┐
│  Electron 桌面壳（唯一可见窗口）               │
│   ┌────────────────────────────────────────┐ │
│   │ 主进程 main.js                         │ │
│   │  ├─ 单实例锁 / 生命周期 / 错误弹窗       │ │
│   │  └─ spawn ▸ 内置 node.exe ▸ dsh web     │ │
│   └────────────────┬───────────────────────┘ │
│  BrowserWindow ◂── 加载 http://127.0.0.1:PORT │
│   （官方 dsh Web UI，与服务器版本强一致）       │
└───────────────────┬──────────────────────────┘
                    │ 打包（electron-builder）
        dsh-桌面端（便携版 / 安装版，三平台）
```

- **为什么 Electron**：自带 Chromium + Node 运行时，满足"空白电脑可运行"；官方 Web UI 直接内嵌加载，零 UI 重开发。
- **内置运行时**：捆绑官方 portable `node.exe`（而非 Electron 内嵌 Node）跑 dsh，规避原生模块 ABI 不匹配。
- **数据隔离**：`DSH_HOME` → Electron `userData` 目录（API Key、会话、配置都在其中）。
- **端口策略**：主进程探测空闲端口后传给 `--port`，避免 3080 冲突。

---

## 目录结构

```
dsh/
├── README.md                  # 本文件：进度 + 后续任务
├── .gitignore
├── .tools/                    # 开发工具链（portable node、脚本、日志）— 不入库
│   ├── node-v24.19.0-win-x64/ # 开发用 portable Node（打包时复制进资源）
│   ├── *.ps1 / *.cmd          # 安装/验证脚本
│   └── *.log                  # 安装与运行日志
├── runtime/                   # dsh 运行时（node_modules 已装）— 打包时作为资源
│   ├── package.json           # 依赖 @deepseek-ai/dsh@0.1.0-rc.6
│   └── node_modules/          # 389MB（--omit=dev）
├── dsh-desktop/               # Electron 桌面壳工程
│   ├── package.json
│   ├── electron/              # main.js / preload.js
│   ├── build/                 # 图标、元数据
│   └── dist/                  # 打包产物（portable + 安装版）
└── scripts/                   # 构建/打包脚本
```

---

## 使用说明

### 一键运行（空白电脑）

1. 拷贝对应平台的产物到目标电脑（无需安装任何环境）：
   - Windows：`DeepSeek Harness Desktop 0.1.0.exe`（便携版，双击即用）或 `... Setup 0.1.0.exe`（安装版）
   - macOS / Linux：由 CI（`.github/workflows/build.yml`）构建，产物为 `.dmg` / `.zip` / `.AppImage` / `.deb`
2. 双击运行，应用自动启动内置 dsh Web 服务并打开官方 UI（首次启动稍慢，需初始化 userData）。
3. 在 **设置 → 模型** 中填入 DeepSeek API Key（密钥只写不回显，存于 `userData/.credentials.yaml`）。
4. 选择工作区后即可开始会话（文件编辑、Shell、检索、子代理、Skills 等全部能力）。

### 数据与日志位置

| 项 | 位置 |
|---|---|
| 应用数据（DSH_HOME） | Windows `%APPDATA%\dsh-desktop`；macOS `~/Library/Application Support/dsh-desktop`；Linux `~/.config/dsh-desktop` |
| 密钥 | `userData/.credentials.yaml`（只写） |
| 主进程日志 | `userData/dsh-desktop.log` |
| 会话日志 | `userData/sessions/`（JSONL，可回放） |

### 开发运行（本仓库）

```sh
# 开发机需 Node 24（本仓库用 .tools 下 portable node）
bash scripts/prepare-runtime.sh win   # 准备 node-runtime/
cd dsh-desktop
npm install
npm start                            # Electron 加载开发模式运行时
```

## 升级 dsh 版本

dsh 处于 Developer Preview，迭代快、可能存在破坏性变更。升级流程：

```sh
# 1. 更新 runtime 依赖版本并重装
cd runtime
node <portable-node>/node_modules/npm/bin/npm-cli.js install @deepseek-ai/dsh@<新版本> --omit=dev
# 2. 同步更新 dsh-desktop/package.json 中无直接依赖（运行时独立），
#    但需更新 README 版本说明与 CI 触发 tag
# 3. 重新打包
cd ../dsh-desktop
node <portable-node>/node_modules/electron-builder/out/cli/cli.js --win --x64
```

版本锁定：`runtime/package.json` 中 `@deepseek-ai/dsh` 固定精确版本（如 `0.1.0-rc.6`），升级时显式改版本号并重跑上述流程。

## 已知限制

- **三平台产物构建**：Windows 产物可在本机构建；Linux（AppImage/deb）与 macOS（dmg）因 electron-builder 交叉构建限制（mksquashfs、hdiutil 为平台原生工具），需在对应平台或 CI（`.github/workflows/build.yml`，推送 `v*` tag 触发）构建。
- **Windows 终端能力**：dsh 在 Windows 上使用官方 pwsh 后端；POSIX 特有工具（如 tmux）不可用，属上游行为。
- **Developer Preview 兼容性**：dsh 核心插件与 API 持续迭代，升级后可能出现配置兼容问题，请按"升级 dsh 版本"流程操作并保留旧版备份。
- **体积**：当前产物约 173MB（Electron + Node + dsh 依赖树），属自包含方案固有成本。
- **签名**：产物未做代码签名，Windows SmartScreen 可能提示"未知发布者"，选择"仍要运行"即可；正式分发建议配置证书签名。

## 后续任务（未来增强）

- [ ] 三平台 CI 构建跑通并上传产物（需推送 `v*` tag 触发 `.github/workflows/build.yml`）
- [ ] 应用内集成"检查并升级 dsh 版本"按钮（读取 npm registry 最新版）
- [ ] 首次运行引导页（选择工作区 + 填写 API Key 的向导）
- [ ] 系统托盘 + 最小化到托盘、开机自启选项
- [ ] 代码签名（Windows Authenticode / macOS notarization）
- [ ] 自定义 Agent preset 封装成内置 profile（利用 dsh 的 profile/bundle 机制）
- [ ] 自动更新器（electron-updater 接入）

## 常见问题（开发期备忘）

- `npm install` 在 Git Bash 下超时/被杀：写 .cmd 脚本由 cmd.exe 执行，或前台重跑（npm 可断点续装）。
- 后台 node 进程随工具调用消失：用 PowerShell `Start-Process`（无 `-Wait`）脱离进程树，或单脚本内完成启动→验证→清理。
