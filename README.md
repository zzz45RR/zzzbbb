# DSH 工作区快照：视频总结插件 + 小游戏

这是 DeepSeek Harness（DSH）桌面端一个工作区的快照，主要包含**一个自建的视频总结插件**和一个浏览器小游戏。用来备份和分享插件源码，不包含任何 API Key、账号凭据或模型缓存。

## 目录结构

| 路径 | 内容 |
| --- | --- |
| `video-summary-plugin/` | 视频总结插件（宿主 + 客户端面板 + 本地语音转写 + Word 渲染） |
| `docs/agents/workspace.yaml` | DSH 工作区与后端的绑定配置 |
| `捕鱼游戏/` | 单文件 HTML5 捕鱼小游戏 |
| `.gitignore` | 排除本地缓存（`.tmp/`、`.pnpm-store/`、`node_modules/` 等） |

## video-summary-plugin

把网站视频变成一份排版好的 Word 总结。

- **输入**：B 站 `BV...`、YouTube、带 `<track captions>` 的普通网页、直链 `.mp4/.m4a`，或直接粘贴字幕文本。
- **取内容**：优先抓字幕；没有字幕时下载音轨，在本机用 SenseVoice + Silero VAD 转写（模型缓存在 `~/.dsh/speech-to-text`）。
- **出结果**：调用当前默认模型生成结构化总结，写成 `.docx`，同时提供面板下载。

文档固定包含：一句话总结、视频概览、核心要点、内容脉络、金句摘录、启发与行动、视频信息、转写附录。

### 组成

```text
video-summary-plugin/
├── index.js              # 宿主：注册 video_summary 工具与设置项
├── client.js             # 左侧栏「视频总结」面板（无构建步骤）
├── lib/
│   ├── sources.js        # 站点识别、字幕抓取、音频下载
│   ├── audio.js          # 音频解码与本地语音识别
│   ├── summarize.js      # 提示词、长转写分段、结构化结果归一化
│   ├── docx.js           # 零依赖 OOXML 写入器（生成 .docx）
│   └── util.js           # 文本清洗、时长格式化等
├── locale/               # 中英文文案
└── cordis.patch.yml      # 插件行与语音识别 provider 的配置
```

### 安装与使用

```powershell
# 安装到当前 profile（示例为官方桌面端的 desktop profile）
dsh plugin --profile desktop add "link:<video-summary-plugin 的绝对路径>"
```

重启 DSH 后有两种用法：

1. 左侧栏点 **视频总结**，粘贴链接、选语言、勾选「无字幕时用本地语音转写」，生成后下载 Word；
2. 直接在对话里让 Agent 调用 `video_summary` 工具。

### 已知问题与修复

模型偶尔不按约定的 JSON 结构输出，早期版本会把原始 JSON 文本直接倒进 Word（标题变成「模型返回了非结构化总结。」，后续章节缺失）。

现在 `lib/summarize.js` 在解析失败时会**自动重试一次**：temperature 降到 0，并追加「只输出一个 JSON 对象、不要解释和代码围栏」的硬约束；仍失败才回退到旧行为。

## 捕鱼游戏

`捕鱼游戏/` 是一个纯前端小游戏，`Untitled-1.html` 为入口，其余为逻辑、音效和鱼种配置脚本，直接用浏览器打开即可，无需构建或服务器。

## 环境

- Windows + DSH Desktop（0.2.x，`dsh --version` 可查）
- 插件要求 Node `>=22.19`
- 仓库不含二进制依赖，克隆后按上面的命令重新安装插件即可

## 许可

- 插件代码：见 `video-summary-plugin/LICENSE`
- 第三方组件与素材来源：见 `video-summary-plugin/THIRD_PARTY_NOTICES.md`
- 捕鱼游戏：个人练习项目，仅作示例
