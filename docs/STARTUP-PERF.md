# dsh-desktop 启动速度瓶颈分析与优化方案

> 日期：2026-08-17 · 依据：win-unpacked 实测（日志时间戳 + 裸 dsh 启动计时 + 模块加载计时）

---

## 一、启动链路实测（瓶颈定位）

### 1.1 各阶段耗时（win-unpacked，干净 userData）

| 阶段 | 实测耗时 | 说明 |
|---|---|---|
| ① Electron 主进程启动 → whenReady | ~2.0s | main.js 加载 + electron-updater 166ms 顶层 require |
| ② findFreePort + ensurePluginPatch + spawn dsh | ~0.3s | 端口探测、插件 patch 注入、spawn 子进程 |
| ③ **dsh 进程初始化**（模块加载 + profile 引导 + 插件加载）| **~2.9s** | 裸启动实测 2898ms；win-unpacked 日志吻合（01:38:01→04）|
| ④ waitForPort 探测就绪 | ~0.3s | net.createServer 轮询探测 |
| ⑤ createWindow + loadURL + SPA 渲染 | ~2.5s | HTTP 200 出现在 T+8.1s |
| **总计（启动 → UI 可用）** | **~8.1s** | verify 脚本实测 |

### 1.2 模块加载耗时（裸 node 计时）

| 模块 | 耗时 | 说明 |
|---|---|---|
| `@aws-sdk/client-bedrock-runtime` | **277ms** | dsh 多 provider 支持，Bedrock 客户端 |
| `sharp` | 124ms | 图像处理（可能被附件/截图插件间接加载）|
| `dsh-sandbox-local` | 45ms | 沙箱 + koffi 原生 |
| `dsh-llm-deepseek` | 43ms | DeepSeek 适配器 |
| `koffi` | 24ms | 原生绑定 |
| `cordis` | 13ms | 插件框架 |
| `electron-updater`（主进程）| 166ms | 当前 main.js 顶层 require |

### 1.3 依赖体积（磁盘，影响读取/解压）

`@aws-sdk` 39M、`@deepseek-ai` 28M、`@opentelemetry` 24M、`@earendil-works` 23M、`@smithy` 11M。

### 1.4 结论：瓶颈排序

1. **dsh 进程启动 ~2.9s（36%）**——最大单点：Node 冷启动 + provider/沙箱/插件模块加载 + profile 引导
2. **UI 渲染 ~2.5s（31%）**——createWindow 串行等待 dsh 就绪后才建窗，SPA 加载
3. **Electron 主进程 ~2.0s（25%）**——electron-updater 顶层 require 占 166ms，其余为 Electron 框架冷启动

---

## 二、针对性优化方案

### A 组 · dsh 进程启动（最大单点，-0.5~1.0s）

| 项 | 做法 | 预期 | 风险 |
|---|---|---|---|
| **A1 provider 裁剪** | 仅保留实际使用的 provider（默认 DeepSeek），通过 dsh settings 配置层禁用 Bedrock/OpenAI 等；`@aws-sdk` 277ms + `@opentelemetry` 等不再加载 | -0.5~0.8s | dsh 内部依赖，需验证 settings 是否支持按需 provider；失败回退 |
| **A2 插件并行加载** | dsh 的 cordis 插件加载改为并行（若 dsh 支持）；6 个 `@dsh-desktop/*` 插件 + 内置插件并行初始化 | -0.3~0.5s | dsh 内部机制，需调研；插件间有依赖时不能并行 |
| **A3 Node 启动参数** | spawn dsh 时加 `--v8-pool-size=2` / `--max-semi-space-size` 等调优参数 | -0.1~0.3s | 效果有限，需实测 |

### B 组 · UI 感知提速（-1.5~2.0s，推荐先做）

| 项 | 做法 | 预期 | 风险 |
|---|---|---|---|
| **B1 窗口先行（并行化）** | `startDsh` 与 `createWindow` **并行**：先建窗口加载本地 loading/splash 页，dsh 就绪后 `loadURL` 切换；用户立即看到窗口而非白屏 | 感知 -1.5~2.0s（窗口秒开）| 低：需本地 loading 页 + 就绪后切换逻辑 |
| **B2 预连接预热** | 启动早期即对 `127.0.0.1:3080` 预连接（不等待 spawn 完成）| -0.3s | 低 |
| **B3 前端资源缓存** | dsh web 前端静态资源启用缓存（HTTP 缓存头/service worker），二次启动省 SPA 下载 | 二次 -0.5~1.0s | 需 dsh 支持；版本变更要失效 |

### C 组 · Electron 主进程（-0.2s，零风险）

| 项 | 做法 | 预期 | 风险 |
|---|---|---|---|
| **C1 electron-updater 懒加载** | `require('electron-updater')` 从 main.js 顶层移到 `setupAutoUpdater()` 内部（`app.isPackaged` 时再 require）| -0.15~0.2s | 零：不检查更新的场景完全不加载 |
| **C2 托盘/图标懒初始化** | createTray 延迟到窗口就绪后 | -0.1s | 低 |

### D 组 · 跨启动缓存（已有 + 增强）

| 项 | 状态 | 说明 |
|---|---|---|
| D1 portable 二次启动缓存 | ✅ 已实现 | `%LOCALAPPDATA%\dsh-desktop-cache`，二次启动跳过自解压 |
| D2 后台保活 | ✅ 已实现 | 关窗口驻留托盘，dsh 持续运行 → **再次打开窗口 <1s** |
| D3 Node 模块缓存 | 可选 | V8 code cache / NODE_COMPILE_CACHE 预热常用模块 | 

---

## 三、预期收益汇总

| 场景 | 当前 | 优化后（A+B+C）| 说明 |
|---|---|---|---|
| 首次启动（干净 userData）| ~8.1s | **~5.5s** | A1(-0.6)+B1(感知-1.5)+C1(-0.2)+其余 |
| 二次启动（缓存命中）| ~3s（dsh 初始化为主）| **~2s** | B3 前端缓存 + A 组 |
| 关窗后再打开（保活）| <1s | <1s | 已最优，D2 |

---

## 四、实施优先级建议

1. **C1（electron-updater 懒加载）**——零风险、立即做
2. **B1（窗口先行并行化）**——感知提升最大、风险低
3. **A1（provider 裁剪）**——需调研 dsh settings 支持性，收益大风险中
4. **B3（前端缓存）**——二次启动收益，需验证 dsh 缓存头
5. A2/A3/B2 视前面成效决定

## 五、验证方式

- 优化后重跑「启动 → HTTP 200」计时（verify 脚本），对比 8.1s 基线
- 分阶段提交，每项单独验证收益，避免一次性大改
