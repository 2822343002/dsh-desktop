# @dsh-desktop/tool-ocr

本地图片文字识别（OCR）工具：模型可通过 `ocr_image` 识别截图、扫描件中的文字，
适合"截屏 → 读屏"、验证码、扫描文档等场景。基于 **Tesseract.js**（纯 JS/WASM，
免安装原生依赖），支持中英文。

## 能力

- `ocr_image(image, lang?, langPath?)`：识别图片文字并返回清洗后的文本
- 默认 `eng`，可指定 `chi_sim` / `eng+chi_sim`
- `langPath` 指向本地 tessdata 目录时完全离线
- 文本清洗：去控制字符、压缩空白、保留行结构

## 挂载

```yaml
# cordis.patch.yml
- insert:
    - id: tool-ocr
      name: '@dsh-desktop/tool-ocr'
```

## 配置

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `lang` | string | `eng` | tesseract 语言代码 |
| `langPath` | string | 无 | 本地 tessdata 目录（离线用） |
| `image` | string | 必填 | 图片绝对路径 |

## 说明

- 首次识别会下载语言数据（网络）；设置 `langPath` 指向已下载的 tessdata 可离线
- 大图自动缩放至 `maxDimension`（默认 2048px）提速

## 开发

```sh
npm install
npm run build   # tsc → lib/
npm test        # node --test（纯函数冒烟）
```

## Changelog

见 [CHANGELOG.md](./CHANGELOG.md)。
