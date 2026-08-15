# @dsh-desktop/tool-screenshot

屏幕截取工具：模型可通过 `take_screenshot` 截取全屏或指定区域，图片经
`ctx.attachments.saveImage` 注册为附件，供视觉模型"看见"。

## 能力

- `take_screenshot(x?, y?, width?, height?)`：全屏或区域截屏
- 截图保存到 `$DSH_HOME/screenshots/`，并注册为图片附件（`ImageBlock`）
- 跨平台：Windows（PowerShell CopyFromScreen）/ macOS（screencapture）/ Linux（gnome-screenshot）
- 结果返回文件路径、尺寸、字节数

## 挂载

```yaml
# cordis.patch.yml
- insert:
    - id: tool-screenshot
      name: '@dsh-desktop/tool-screenshot'
```

## 配置

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `x`/`y`/`width`/`height` | number | 无 | 区域；省略则全屏 |

## 说明

- **视觉模型**：要让模型看到图片，需配置支持 `image` 模态的模型（如 DeepSeek 视觉端点或 `llm-ollama` 的视觉模型），并在模型配置中声明 `input: [text, image]`
- **与 OCR 联动**：若模型不支持视觉，可先用 `@dsh-desktop/tool-ocr` 的 `ocr_image` 读取截图文字

## 开发

```sh
npm install
npm run build   # tsc → lib/
npm test        # node --test
```

## Changelog

见 [CHANGELOG.md](./CHANGELOG.md)。
