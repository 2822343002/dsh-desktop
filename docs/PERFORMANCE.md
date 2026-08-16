# dsh-desktop 体积与自解压速度优化方案（修订版 v2）

> 修订日期：2026-08-16 · 依据：v0.2.0 实测 + 后续修复后重新打包（157MB）实测。
> 本文档是 v1（PERFORMANCE.md 初稿）的**审查修订版**：修正过时基线、指出前提错误、重排优先级。

---

## 〇、审查结论速览（先看这里）

| # | 结论 |
|---|---|
| 1 | **原方案体积基线已过时**：v0.2.0 最初 236MB，修复后重新打包**当前 157MB** |
| 2 | **重大前提错误**：当前产物中 **6 个插件未打进 runtime**（`@dsh-desktop` 目录为空）——157MB 的"缩小"不是优化成果，而是插件丢失的结果 |
| 3 | 插件丢失根因：koffi 补装时在 `runtime/` 执行 `npm install`，重建 node_modules **清掉了手动拷贝的插件**（未受 package.json 管理） |
| 4 | **B1（useZip）是当前最有效的单一动作，且尚未启用**——应立即实施 |
| 5 | A1–A3（插件裁剪）前提需修正：仅当插件**重新正确进包**后才有意义 |

---

## 一、当前现状基线（2026-08-16 实测）

| 项 | 实测值 | 说明 |
|---|---|---|
| portable exe | **157.1MB** | `dist/DeepSeek Harness Desktop 0.2.0.exe` |
| Setup exe | **157.3MB** | `dist/... Setup 0.2.0.exe` |
| runtime/node_modules | 312M | dsh 本体 + 补装的 koffi/sharp |
| `runtime/node_modules/@dsh-desktop` | **空（4KB）** | ⚠️ 6 个插件未进包 |
| `@koromix/koffi-win32-x64` | 1.1M | 已补装（闪退修复） |
| `@img/sharp-win32-x64` | 19M | 已补装 |
| 插件源码（plugins/） | 6 个完好 | tool-* + hooks-desk |
| useZip 配置 | **未启用** | `portable` 仅 `splashImage` |
| 解压耗时（用户反馈） | ~10min（236MB 时代） | 157MB 未单独实测 |

### 关键问题：插件为什么丢失？
- 时间线：v0.2.0 打包前手工 `cp -r plugins/* runtime/node_modules/@dsh-desktop/` → 打包 236MB（含插件）。
- 之后闪退修复在 `runtime/` 执行 `npm install @koromix/koffi-win32-x64 @img/sharp-win32-x64`——npm 重建 node_modules，**删除未声明的手动插件目录**。
- 后续重新打包（157MB）即不含插件；当前 Release 与本地产物都缺 6 个插件。

---

## 二、降体积方案（A）—— 修订后

> ⚠️ 前提修正：以下裁剪**仅在插件重新进包后**生效。**第一步必须是修复插件进包流程**（见四）。

### A0.（新增，先做）修复插件进包流程
- 问题：手动拷贝 + npm install 会互相破坏。
- 方案：**拷入 runtime 与 npm install 分离，且插件作为受管依赖**：
  1. 在 `runtime/package.json` 声明插件为本地依赖（`"@dsh-desktop/tool-notify": "file:../plugins/tool-notify"` 等），使 npm 持久管理；
  2. 或拷贝后**不再在 runtime 执行 npm install**（需要补装的原生包改在拷入前完成）。
- 验收：`runtime/node_modules/@dsh-desktop/` 含 6 个插件且重打包后仍在。

### A1. 剔除插件 devDependencies（约 -138MB）
- 前提修正后仍有效：插件各自 node_modules 含 typescript 23M × 6。
- 修订做法：**拷入时只拷生产依赖**（`npm install --omit=dev` 的产物）或拷入后按 `devDependencies` 剔除，而非"拷全再删"。
- 预估：-138MB（前提：插件 6 个全进包）。

### A2. 裁剪 onnxruntime-web（tool-rag-local，约 -66MB）
- 前提修正后仍有效；Node 环境只用 `onnxruntime-node`。
- 修订：确认 `@xenova/transformers` 在 Node 下 `env.backends.onnx.wasm` 不被引用后删除 `onnxruntime-web`；保留 onnxruntime-node。
- 预估：-66MB。

### A3. 插件公共依赖去重（约 -10~15MB）
- 前提修正后仍有效，但**收益小、风险中**（版本解析可能失败）。
- 修订：降级为可选；仅对版本一致的 `@deepseek-ai/cordis`/`dsh-tools` 去重，失败回退保留副本。

### A4. dsh 顶层 provider 裁剪（@aws-sdk 66M 等）
- 维持"高风险、本期不动"，列为后续可选。

### 体积收益汇总（修订后，A0+A1+A2）
| 场景 | portable | 说明 |
|---|---|---|
| 当前（插件丢失） | 157MB | 缺插件，不可发布 |
| 插件重新进包（不做裁剪） | ~215MB | 6 插件 + typescript 等 |
| 进包 + A1+A2 裁剪 | **~150MB** | 与 v1 预估一致（前提达成后） |

---

## 三、增解压速度方案（B）—— 修订后

### B1. `portable.useZip: true`（**第一优先，立即实施**）
- 已确认 electron-builder 25 支持（scheme.json 有 `useZip`）。
- 当前 `portable` 仅 `splashImage`，**未启用 useZip**——这是最低成本、最高收益的单一改动。
- 预期：LZMA2 → ZIP/Deflate，解压接近纯复制，157MB 时代 ~10min → **2~3min 量级**（体积约 +10~12%，被 A 组覆盖）。
- ⚠️ 风险（v1 遗漏）：本项目使用**自定义 portable.nsi**（二次缓存）。useZip 改变打包结构（`extractEmbeddedAppPackage` vs 直接 File 复制），**必须验证自定义模板与 useZip 兼容**；若冲突，权衡：保留自定义缓存 vs useZip（缓存命中后无需解压，可能 useZip 收益被缓存覆盖）。

### B2. `unpackDirName` 固定目录（配合缓存）
- 仍有效；与已实现的二次缓存（`%LOCALAPPDATA%\dsh-desktop-cache`）配合，二次启动 <5s。

### B3. `compression` 保持 normal
- 维持。

### B4. splash 提示（已生效）
- 维持。

---

## 四、实施步骤（修订后，按优先级）

1. **B1**：`dsh-desktop/package.json` `portable.useZip: true` → 验证与自定义 portable.nsi 兼容（打包后运行一次）。
2. **A0**：修复插件进包流程（runtime/package.json 声明本地依赖，或拷贝后不再 npm install）→ 重新进包 6 个插件。
3. **A1**：拷入时只带生产依赖（-138MB）。
4. **A2**：删除 onnxruntime-web（-66MB）。
5. 重新打包 → 对比体积（目标 ≤155MB）→ 计时验证（首次自解压、二次缓存启动）。
6. 更新 ROADMAP/CHANGELOG；视结果发布 v0.2.1 或 v0.3.0。

## 五、验证指标（修订）

- 目标：portable **≤155MB**（含 6 插件）；首次自解压 **≤4min**（useZip 后）；二次启动 **<5s**（缓存命中）。
- 对照：当前 157MB（缺插件）、236MB 时代 ~10min。
- 注意：**157MB 基线不可发布**——必须先 A0 恢复插件，再做 A1/A2 减回来。

## 六、风险与对策（修订）

| 风险 | 对策 |
|---|---|
| useZip 与自定义 portable.nsi 不兼容 | 打包后实测；冲突时二选一：保留自定义缓存模板（二次快）或 useZip（首次快），优先验证兼容性 |
| npm install 再次清掉插件 | A0 用受管依赖（file: 声明），npm 不再视为多余 |
| 插件进包后体积反弹到 215MB | A1/A2 抵消至 ≤155MB |
| 去重解析失败 | 仅版本一致才去重，失败回退副本 |
