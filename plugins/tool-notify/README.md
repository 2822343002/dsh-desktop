# @dsh-desktop/tool-notify

系统通知工具：模型可通过 `notify` 工具发送桌面通知，适合长任务完成提醒、后台构建结束、用户离开终端时的通知。

## 能力

- 模型可调 `notify(title, message)` 发送跨平台桌面通知
- Windows（PowerShell 气泡）/ macOS（osascript）/ Linux（notify-send）三平台支持
- 输入做危险字符清洗，防止命令注入

## 挂载

```yaml
# cordis.patch.yml
- insert:
    - id: tool-notify
      name: '@dsh-desktop/tool-notify'
```

## 开发

```sh
npm install
npm run build   # tsc → lib/
npm test        # node --test
```

## Changelog

见 [CHANGELOG.md](./CHANGELOG.md)。
