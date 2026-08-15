# @dsh-desktop/tool-clipboard

系统剪贴板读写工具：模型可通过 `clipboard_read` / `clipboard_write` 读写系统剪贴板，
用于把内容交还给用户粘贴、或读取用户复制的文本。

## 能力

- `clipboard_read`：读取系统剪贴板文本
- `clipboard_write(text)`：把文本写入系统剪贴板
- 跨平台：Windows（PowerShell Get/Set-Clipboard）/ macOS（pbpaste/pbcopy）/ Linux（xclip）
- 写入内容经 stdin 传递，不进入命令行参数，天然防注入

## 挂载

```yaml
# cordis.patch.yml
- insert:
    - id: tool-clipboard
      name: '@dsh-desktop/tool-clipboard'
```

## 依赖

- Linux 需要 `xclip`（`sudo apt install xclip` 或 `pacman -S xclip`）

## 开发

```sh
npm install
npm run build   # tsc → lib/
npm test        # node --test
```

## Changelog

见 [CHANGELOG.md](./CHANGELOG.md)。
