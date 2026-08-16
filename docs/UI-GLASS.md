# dsh-desktop 玻璃态 UI 美化 + 背景自定义实施 Plan

> 目标：为 dsh 桌面端注入「雾面玻璃卡片 + 背景渐变/自定义图片 + 细腻高光」视觉体系，
> 支持用户上传自定义背景图（自动覆盖一层玻璃态模糊层），主界面预留上传接口。

---

## 一、可行性结论（调研结果）

| 项 | 结论 |
|---|---|
| dsh 前端 | `runtime/node_modules/@deepseek-ai/dsh-web-frontend/dist`（SPA：index.html + assets/*.css/js），由 dsh web 服务器（端口 3080）托管 |
| 主题机制 | 无插件式皮肤；dist 为编译产物，**不直接改包** |
| **注入路径** | ✅ electron 壳 `webContents.on('did-finish-load')` → `webContents.insertCSS(glassCss)` 运行时注入（不碰 dsh 包、升级不覆盖） |
| 背景存储 | 新建 `userData/backgrounds/`（用户上传图落盘于此） |
| 上传接口 | 主进程 IPC `bg:select`（dialog 选图→复制到 backgrounds/）+ 托盘菜单「设置背景」入口 + 主界面注入的悬浮设置按钮 |
| 渲染方式 | `body::before` 背景层（渐变或图片 cover）→ 其上覆盖玻璃模糊层（backdrop-filter + 半透明遮罩）→ UI 卡片半透明浮于其上 |

---

## 二、玻璃态 UI 设计体系（#3 成果）

### 2.1 设计语言
- **层级**：雾面玻璃卡片 + 背景渐变 + 细腻高光；卡片半透明白/灰 + `backdrop-blur`
- **描边**：1px–2px 高光/渐变描边（顶部高光 > 侧面柔光）
- **文字**：主文字高对比（≥0.92 不透明度）；次级资讯半透明浅色（0.55–0.7）
- **背景**：深色或彩色渐变衬托通透感；自定义图片 cover + 玻璃模糊层
- **透明度梯度**：0.05–0.2 形成层级（导航/面板 < 主卡片 < 浮层）
- **氛围**：清透、现代、轻盈、未来感；避免厚重实体感

### 2.2 CSS 变量体系（注入时定义在 :root）
```css
:root {
  /* 玻璃基础 */
  --glass-bg: rgba(255, 255, 255, 0.06);
  --glass-bg-strong: rgba(255, 255, 255, 0.12);
  --glass-bg-hover: rgba(255, 255, 255, 0.10);
  --glass-border: rgba(255, 255, 255, 0.14);
  --glass-border-highlight: rgba(255, 255, 255, 0.28);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  --glass-inner-glow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  /* 背景 */
  --bg-grad-a: #0f172a;  /* 深蓝紫 */
  --bg-grad-b: #1e1b4b;  /* 靛蓝 */
  --bg-grad-c: #312e81;  /* 紫 */
  /* 霓虹高光（CTA/强调） */
  --accent-1: #22d3ee;   /* 青 */
  --accent-2: #a78bfa;   /* 紫 */
  --accent-glow: 0 0 12px rgba(34, 211, 238, 0.45);
  /* 文字 */
  --text-primary: rgba(255, 255, 255, 0.94);
  --text-secondary: rgba(255, 255, 255, 0.62);
  /* 动效 */
  --motion-fast: 150ms;
  --motion-base: 200ms;
  --ease-glass: cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

### 2.3 背景层（body::before / body::after）
```css
body::before {            /* 渐变底 */
  content: '';
  position: fixed; inset: 0; z-index: -2;
  background: linear-gradient(135deg, var(--bg-grad-a), var(--bg-grad-b) 50%, var(--bg-grad-c));
}
body::after {             /* 自定义图片层（无图时透明） */
  content: '';
  position: fixed; inset: 0; z-index: -1;
  background: var(--user-bg-image, none) center/cover no-repeat;
  filter: blur(24px) brightness(0.7);   /* 玻璃态模糊层 */
  transform: scale(1.05);               /* 防边缘透白 */
  opacity: var(--user-bg-opacity, 0.55);
}
```
> 上传图片后主进程更新 `--user-bg-image: url(file:///.../backgrounds/xxx.png)` 即可整体生效，
> 图片自动被 blur + 遮罩压暗，UI 浮于其上——即"上传的图片上覆盖玻璃态模糊效果"。

### 2.4 玻璃卡片
```css
.glass-card { /* 注入时对 dsh 主要面板/卡片容器统一覆盖 */
  background: var(--glass-bg);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  border: 1px solid var(--glass-border);
  border-top-color: var(--glass-border-highlight);  /* 顶部高光 */
  box-shadow: var(--glass-shadow), var(--glass-inner-glow);
  border-radius: 14px;
  transition: background var(--motion-base) var(--ease-glass),
              box-shadow var(--motion-base) var(--ease-glass),
              transform var(--motion-fast) var(--ease-glass);
}
.glass-card:hover {
  background: var(--glass-bg-hover);
  box-shadow: 0 12px 40px rgba(0,0,0,0.45), var(--glass-inner-glow);
}
.glass-card:active { transform: scale(0.98); }
```

### 2.5 CTA / 强调
```css
.cta { color: var(--text-primary); background: linear-gradient(135deg, var(--accent-1), var(--accent-2)); border: none; }
.cta:hover { box-shadow: var(--accent-glow); filter: brightness(1.1); }
.cta:active { transform: scale(0.98); }
```

### 2.6 动效规范
- Hover：透明度略升、阴影加深、CTA 亮度提高 + 微弱光晕
- Active：`scale(0.98)` 轻微下沉，不夸张
- 时长 150–250ms，`cubic-bezier(0.25,0.46,0.45,0.94)`，**避免弹跳**

---

## 三、背景自定义方案（#2 成果）

### 3.1 数据流
```
用户选择图片 → 主进程 dialog.showOpenDialog（filter: png/jpg/webp）
→ 复制到 %APPDATA%\dsh-desktop\backgrounds\bg.png（持久化）
→ 更新 settings 记录 → 向渲染进程 insertCSS 更新 --user-bg-image
→ body::after 显示图片（blur 玻璃层覆盖）→ UI 浮于其上
```

### 3.2 上传接口（主界面留好入口）
1. **主进程 IPC**（`ipcMain.handle('bg:select', ...)` / `ipcMain.on('bg:apply')`）：
   - 选图 → 落盘 `backgrounds/` → 记录配置 → 触发 `insertCSS` 刷新
2. **主界面悬浮入口**（渲染进程注入，通过 `webContents.executeJavaScript` 注入一个小浮层按钮）：
   - 右下角悬浮「🎨 背景」按钮 → 点击调起主进程选图 IPC
3. **托盘菜单**：新增「设置背景图片…」条目（`Tray` 菜单，调同一 IPC）
4. 背景状态持久化：`settings.yaml`（dsh 自身）或独立 `userData/bg-config.json`（简单可靠）

### 3.3 默认背景
- 无自定义图时：深色渐变（--bg-grad-a/b/c）+ 可选内置纹理/光斑（CSS radial-gradient 点缀）

---

## 四、实施步骤（按序）

| 步骤 | 内容 | 文件 |
|---|---|---|
| 1 | 新建 `electron/lib/glass-theme.js`：导出玻璃态 CSS 模板（含变量/背景层/卡片/CTA/动效）+ `injectGlassTheme(webContents, bgConfig)` 注入函数 | `dsh-desktop/electron/lib/glass-theme.js`（新） |
| 2 | 主进程接入：`mainWindow.webContents.on('did-finish-load')` → `injectGlassTheme`；`loadURL` 前先注入背景配置 | `dsh-desktop/electron/main.js`（改） |
| 3 | 背景管理：`lib/bg-store.js`——`selectAndStoreBackground(mainWindow)`（dialog+复制+配置落盘）、`readBgConfig()`、`applyBgToTheme()` | `dsh-desktop/electron/lib/bg-store.js`（新） |
| 4 | IPC：`ipcMain.handle('bg:select')` / `ipcMain.on('bg:apply')` | `main.js`（改） |
| 5 | 托盘菜单：加「设置背景图片…」；浮层按钮注入（executeJavaScript 注入悬浮按钮 → 触发 bg:select） | `main.js`（改） |
| 6 | 默认渐变背景 + 可选内置预设（深空蓝紫 / 墨绿 / 暖金 3 档，CSS 变量切换） | `glass-theme.js` |
| 7 | 测试：`test/glass-theme.test.js`（纯函数：CSS 模板生成、bg-config 读写、注入幂等）+ 现有冒烟 | `dsh-desktop/test/`（新） |
| 8 | 打包验证：win-unpacked 启动 → 检查渐变背景生效、上传图片后 blur 生效、托盘/浮层入口可用 | 重新打包 |

## 五、验证方式

1. **默认态**：启动后界面为深色渐变 + 玻璃卡片（截图对比改造前）
2. **上传态**：托盘「设置背景图片」选图 → 背景立即变为图片 + blur 玻璃层，UI 可读性正常
3. **持久化**：重启应用后背景保持
4. **动效**：Hover 卡片透明度/阴影变化、CTA 光晕、Active 缩放 0.98，时长 150–250ms
5. **回归**：`node --test` 全绿；会话/工具/插件功能不受影响

## 六、风险与对策

| 风险 | 对策 |
|---|---|
| dsh 前端类名/结构变化导致 CSS 覆盖失效 | 用属性选择器 + `!important` 兜底；升级 dsh 后回归检查 |
| backdrop-filter 性能（大面积 blur） | 背景层用固定定位 + 低 blur（18–24px）；`will-change` 优化；低配机可降级为纯渐变 |
| 注入时机（did-finish-load 早于 SPA 渲染） | 注入后延时 300ms 再 insertCSS，或监听 DOM 就绪 |
| 上传超大图片 | 落盘时压缩/限制（≤8MB，主进程 sharp 或拒绝），防内存/磁盘问题 |
| 浮层按钮注入被 dsh 样式冲突 | 独立高 z-index + 自定义 class（`#dsh-bg-fab`），避免污染 |
