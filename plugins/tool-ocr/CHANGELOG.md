# Changelog

## [0.1.0] - 2026-08-16

### 新增

- `ocr_image` 本地 OCR 工具（Tesseract.js 7，纯 JS/WASM）
- 支持 `lang` / `langPath`（离线 tessdata）/ 大图缩放
- 文本清洗（控制字符/空白压缩/保留行结构）
- node --test 冒烟测试（参数构造 + 清洗 + 结果提取）
