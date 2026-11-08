# 视频总结转 Word (Video Summary to Word)

一个 DeepSeek Harness Web 插件：读取网站视频的字幕，或在没有字幕时把音频下载到本机做语音识别，然后用当前默认模型生成结构化总结，并输出排版好的 `.docx` 文档。

## 使用

1. 在左侧栏点击 **视频总结** 图标。
2. 粘贴视频链接，选择总结语言。
3. 按需勾选 **无字幕时用本地语音转写**。
4. 点击 **生成总结与 Word**，等待进度完成，然后点击 **下载 Word 文档**。

也可以直接在对话里让 Agent 调用 `video_summary` 工具：

```text
用 video_summary 总结 https://www.bilibili.com/video/BV...
```

## 内容来源

| 来源 | 字幕 | 音频转写 | 说明 |
| --- | --- | --- | --- |
| Bilibili `bilibili.com/video/BV...` | 优先 | 支持 | 公开字幕接口经常要求登录；无字幕时自动下载 AAC 音轨 |
| YouTube `youtube.com/watch?v=...` / `youtu.be/...` | 优先 | 不支持 | 需要当前网络能访问 YouTube；不支持下载 YouTube 音频 |
| 通用网页 | `<track kind="captions">`、JSON-LD `transcript` | 仅直链 MP4/M4A | 适用于带 WebVTT/SRT 字幕的课程、播客页面 |
| 直链 `.mp4` / `.m4a` / `.m4s` | — | 支持 | 从文件名生成标题 |
| 手动转录 | — | — | 粘贴字幕/讲稿，仍会生成总结和 Word |

## 本地语音识别

- 使用 Harness 自带的 SenseVoiceSmall + Silero VAD，在 Host CPU 上运行。
- 首次准备会从 Hugging Face / hf-mirror 下载约 **239 MB** 的模型，并缓存到 `~/.dsh/speech-to-text/sensevoice`。
- 音频只在本机内存中处理，不会上传到模型服务；只有最终文本会发送给当前默认模型。
- 单次音频上限 60 分钟，默认下载上限 120 MB。

## Word 文档

生成的文件保存在当前会话工作区的 `video-summaries/` 目录，同时在面板中提供直接下载。文档包含：

- 一句话总结
- 视频概览
- 核心要点
- 内容脉络（带时间点）
- 金句摘录
- 启发与行动
- 视频信息与转写附录

## 配置

可在 `cordis.patch.yml` 的 `video-summary` 行覆盖默认值：

```yaml
- id: video-summary
  name: '@local/video-summary'
  config:
    maxMediaMB: 120
    maxTranscriptChars: 60000
    outputDir: video-summaries
```

- `maxMediaMB`：单次音频下载上限，20–500。
- `maxTranscriptChars`：送给模型的转写字符上限，4000–200000。
- `outputDir`：相对于会话工作区的输出目录；绝对路径也可。

## 隐私与边界

- 视频页面、字幕和音频都由 Host 进程在本机读取；第三方页面可能看到正常网络请求。
- AI 总结仍受模型能力限制，机器转写可能有个别错字；重要事实请回看原视频。
- Bilibili 会员/付费/登录专属视频可能无法取到音频；此时请使用手动转录。
- 不绕过 DRM、登录墙或付费墙。

## 开发

- Host：`index.js`、`lib/*.js`
- Client：`client.js`（无构建步骤，`window.__ModuleLoader__` 懒加载工厂）
- 音频解码：`vendor/node_modules/@audio/decode-mp4` + `@audio/decode-aac`
- 安装：`plugin_manager` 的 `install_bundle`，目标是本目录的绝对路径。

安装后如果修改 Host 代码，需要重新安装/重启以加载新的 JavaScript 模块；Client 槽注册变化通常在刷新页面后可见。
