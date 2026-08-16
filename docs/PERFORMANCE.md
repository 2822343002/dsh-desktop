# dsh-desktop 体积与自解压速度优化方案

> 问题：portable 版自解压耗时近 10 分钟，安装版同样偏慢。
> 根因：**包体过大**（v0.2.0 portable 236MB）+ **NSIS 默认 LZMA2 解压慢**。
> 本文档给出「降体积 + 增解压速度」的完整方案（含收益预估、风险、实施步骤）。

---

## 一、体积构成分析（实测，v0.2.0）

| 项 | 体积 | 说明 |
|---|---|---|
| `runtime/node_modules/@dsh-desktop`（6 个插件） | **451MB** | 插件本体 + 各自完整 node_modules |
| 其中 `tool-rag-local` | 261MB | onnxruntime-node 92M + onnxruntime-web 66M + @xenova 45M + typescript 23M + protobufjs 19M |
| 其中 `tool-ocr` | 78MB | tesseract.js-core 44M + typescript 23M + zlibjs 3.7M |
| 其余 4 个轻插件 | 各 29MB | 每个都含 **typescript 23M**（devDependency 被打包！） |
| runtime 顶层其余（dsh 本体等） | ~312M | @aws-sdk 66M、@deepseek-ai 33M 等（dsh 固有） |
| **可裁剪总量** | **~200M+** | 见下方方案 A |

## 二、降体积方案（A）

### A1. 打包时剔除插件 devDependencies（收益最大，约 -138MB）
- 现状：`plugins/*` 的 `npm install` 装了 `typescript`、`@types/node` 等 devDependencies，
  拷贝进 runtime 时被一并打包（每插件 23M × 6 ≈ 138M）。
- 方案：拷入 runtime 前执行**生产依赖裁剪**：
  ```bash
  # 在 runtime/node_modules/@dsh-desktop/<pkg> 内移除 devDependencies
  node -e "const p=require('./package.json');
    const d=Object.keys(p.devDependencies||{});
    for (const m of d) require('fs').rmSync('node_modules/'+m,{recursive:true,force:true})"
  # 同时清理 @types/* 与 .d.ts 之外的无用产物
  ```
- 预期：**-138MB**（typescript/@types 全部移除）。

### A2. 裁剪 onnxruntime-web（tool-rag-local，约 -66MB）
- `@xenova/transformers` 在 Node 环境只用 `onnxruntime-node`；`onnxruntime-web`（66M）是浏览器用 WASM 版。
- 方案：`transformers` 配置 `env.backends.onnx.wasm` 不需要时，删 `node_modules/onnxruntime-web` 即可；
  Node 端自动回退 `onnxruntime-node`。在拷贝进 runtime 时删除该目录。
- 预期：**-66MB**（rag 插件 261M → ~195M）。

### A3. 插件依赖去重 / 符号链接（约 -10MB）
- 6 个插件各自装了 `@deepseek-ai/cordis`、`@deepseek-ai/dsh-tools` 等公共依赖（各 2.5M × 6）。
- 方案：拷贝时用 `--link-dest` 或直接依赖 runtime 顶层已存在的 `@deepseek-ai/*`（删除插件内副本，
  让 Node 向上查找）。预期 **-10~15MB**。

### A4.（可选）dsh 顶层 provider 裁剪
- `@aws-sdk` 66M / `@opentelemetry` 31M 等是 dsh 的多 provider 支持（Bedrock/OpenAI 等）。
- 若只使用 DeepSeek，可在 `runtime/package.json` 用 `overrides`/删除对应依赖，风险较高（可能破坏 dsh 加载），
  **建议本期不动**，列为后续可选。

### 体积收益汇总（A1+A2+A3）
| 项 | 当前 | 优化后 |
|---|---|---|
| portable exe | ~236MB | **~150MB**（约 -36%） |
| 解压耗时 | ~10min | 预期 **3~4min**（体积减半 + 解压更快） |

## 三、增自解压速度方案（B）

### B1. `portable.useZip: true`（核心，官方支持）
- 现状：portable 默认用 **7z + LZMA2** 压缩（`-mx=9`），解压需大量 CPU 解压 + 写盘。
- 方案：electron-builder 官方 `portable.useZip: true`，改用 **ZIP/Deflate** 压缩——
  解压接近「纯复制」速度（社区实测大幅提速；electron-builder issue #2548 确认 ZIP 解压非常快）。
- 代价：体积约 +12%（ZIP 压缩率低于 LZMA2）——但配合 A 组降体积，总体仍显著更小更快。
- 实施：`dsh-desktop/package.json` 的 `portable` 配置加 `"useZip": true`。

### B2. `unpackDirName` 固定解压目录（配合缓存）
- 现状：每次运行都解压到新的随机 temp 目录再清理。
- 方案：`portable.unpackDirName: "dsh-desktop"` 固定目录；结合已实现的
  「二次启动缓存」（`%LOCALAPPDATA%\dsh-desktop-cache`），命中缓存直接运行，跳过解压。
- 预期：首次 ~3min → 二次 **<5s**。

### B3.（可选）NSIS `compression` 调优
- `build.compression: "normal"`（当前）平衡体积/速度；`"store"` 更快但体积 +30%（不推荐单独用）。
- 建议保持 `normal`，依靠 useZip + 降体积达成目标。

### B4.（已生效）解压期间反馈
- 已实现 splash 提示（"正在启动，请稍候"），避免用户误以为卡死；保持现状即可。

## 四、实施步骤（按序）

1. **A1+A2+A3**：改 `scripts/` 中拷贝插件进 runtime 的步骤（新增 `scripts/prune-plugin-deps.sh`）：
   安装后、拷贝前，对每个 `@dsh-desktop/*` 执行 devDependencies 剔除 + onnxruntime-web 删除 + 公共依赖去重。
2. **B1**：`dsh-desktop/package.json` `portable.useZip: true`；**B2**：`portable.unpackDirName`。
3. 重新打包 → 对比体积（预期 portable ≤150MB）。
4. 计时验证：首次自解压耗时、二次启动（缓存命中）耗时。
5. 更新 `docs/ROADMAP.md` 与 `CHANGELOG.md`（记入 P1 性能优化项）。

## 五、风险与对策

| 风险 | 对策 |
|---|---|
| useZip 后体积反增（+12%） | 已被 A 组 -36% 覆盖，净收益仍显著 |
| 裁剪 onnxruntime-web 后 rag 在浏览器端不可用 | dsh 是 Node 运行时，仅用 onnxruntime-node；文档注明 |
| 剔除 typescript 影响插件加载 | typescript 仅构建期需要，运行期 `lib/` 已编译完成，安全 |
| 公共依赖去重后解析失败 | 先验证 dsh 顶层已含同版本 `@deepseek-ai/cordis` 等；失败则回退保留副本 |
| 自解压仍受 CPU/磁盘限制 | 二次缓存（B2）保证后续启动 <5s，首次慢可接受并有 splash 提示 |

## 六、验证指标

- 目标：portable ≤150MB；首次自解压 ≤4min；二次启动 ≤5s（缓存命中）。
- 方法：打包后 `du -sh` + 计时运行（首次/二次各一次），与 v0.2.0（236MB / ~10min）对比。
