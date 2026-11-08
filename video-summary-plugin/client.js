window.__ModuleLoader__.load({
  id: '@local/video-summary',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'video-summary';

    const zh = {
      panel: '视频总结',
      kicker: 'VIDEO → WORD',
      title: '把视频变成一份可读的 Word 总结',
      subtitle: '粘贴 B 站、YouTube 或带字幕 / MP4 的网页链接。自动读取字幕；没有字幕时可用本地语音识别，最后下载排版好的文档。',
      urlLabel: '视频链接',
      urlPlaceholder: 'https://www.bilibili.com/video/BV...',
      language: '总结语言',
      chinese: '中文',
      english: 'English',
      asr: '无字幕时用本地语音转写',
      asrHint: '首次准备约 240 MB 模型；音频与识别都在本机完成。',
      manualToggle: '没有字幕？粘贴文稿',
      manualHide: '收起手动转录',
      manualLabel: '手动转录 / 讲稿',
      manualPlaceholder: '把字幕、讲稿或视频文字内容粘贴到这里…',
      manualCount: '字符',
      generate: '生成总结与 Word',
      generating: '正在处理…',
      cancel: '取消',
      emptyTitle: '从链接开始',
      emptyBody: '支持 B 站、YouTube 字幕、通用网页字幕和直链 MP4 / M4A。',
      feature1Title: '自动找字幕',
      feature1Body: '优先读取 B 站、YouTube 和网页公开字幕。',
      feature2Title: '本地语音转写',
      feature2Body: '没有字幕时下载音频，用 SenseVoice 在本机识别。',
      feature3Title: 'Word 直接下载',
      feature3Body: '生成含概览、要点、章节和金句的 .docx。',
      stepsTitle: '处理进度',
      step1: '读取视频信息',
      step2: '获取字幕或音频',
      step3: '本地语音转写（按需）',
      step4: 'AI 内容总结',
      step5: '生成 Word 文档',
      resultKicker: '总结完成',
      download: '下载 Word 文档',
      savedTo: '已保存到',
      overview: '视频概览',
      keyPoints: '核心要点',
      chapters: '内容脉络',
      quotes: '金句摘录',
      takeaways: '启发与行动',
      regenerate: '再总结一个',
      errorTitle: '这次没有完成',
      retryManual: '用手动转录重试',
      asrReady: '语音模型就绪',
      asrDownload: '语音模型首次需下载',
      asrUnavailable: '语音转写不可用',
      asrPreparing: '语音模型准备中',
      model: '模型',
      chars: '字符',
      wordCount: '字',
      source: '来源',
      transcript: '转写',
      cancelled: '已取消',
      unknownError: '未知错误',
      privacy: '字幕与音频只在本机处理；只有文本总结会发送给当前默认模型。',
      urlRequired: '请先粘贴视频链接。',
      jobFailed: '任务启动失败。',
      downloadFailed: '文档下载失败。',
      statusQueued: '排队中',
      statusRunning: '处理中',
      statusDone: '已完成',
      statusError: '失败',
      statusCancelled: '已取消',
      auto: '自动',
      manualTag: '手动',
      openManual: '粘贴文稿',
      audioNote: '音频下载与语音识别可能需要几分钟。',
    };

    const en = {
      panel: 'Video Summary',
      kicker: 'VIDEO → WORD',
      title: 'Turn a video into a readable Word summary',
      subtitle: 'Paste a Bilibili, YouTube, or subtitle / MP4 page. Captions are read automatically; when there are none, local speech recognition can transcribe the audio before a formatted document is downloaded.',
      urlLabel: 'Video URL',
      urlPlaceholder: 'https://www.bilibili.com/video/BV...',
      language: 'Summary language',
      chinese: '中文',
      english: 'English',
      asr: 'Transcribe audio when no captions exist',
      asrHint: 'First use prepares a ~240 MB model. Audio and recognition stay on this machine.',
      manualToggle: 'No captions? Paste a transcript',
      manualHide: 'Hide transcript',
      manualLabel: 'Transcript / speaker notes',
      manualPlaceholder: 'Paste captions, a transcript, or the video’s written content here…',
      manualCount: 'characters',
      generate: 'Summarize & create Word',
      generating: 'Working…',
      cancel: 'Cancel',
      emptyTitle: 'Start with a link',
      emptyBody: 'Bilibili, YouTube captions, generic page captions, and direct MP4 / M4A links are supported.',
      feature1Title: 'Find captions',
      feature1Body: 'Reads public Bilibili, YouTube, and page caption tracks first.',
      feature2Title: 'Local transcription',
      feature2Body: 'When captions are missing, downloads the audio and runs SenseVoice locally.',
      feature3Title: 'Download Word',
      feature3Body: 'Builds a .docx with an overview, key points, chapters, and quotes.',
      stepsTitle: 'Progress',
      step1: 'Read video metadata',
      step2: 'Fetch captions or audio',
      step3: 'Local transcription (when needed)',
      step4: 'Summarize with AI',
      step5: 'Build Word document',
      resultKicker: 'Summary ready',
      download: 'Download Word document',
      savedTo: 'Saved to',
      overview: 'Overview',
      keyPoints: 'Key points',
      chapters: 'Chapter map',
      quotes: 'Quotes',
      takeaways: 'Takeaways',
      regenerate: 'Summarize another',
      errorTitle: 'This one did not finish',
      retryManual: 'Retry with a transcript',
      asrReady: 'Speech model ready',
      asrDownload: 'Speech model needs a download',
      asrUnavailable: 'Transcription unavailable',
      asrPreparing: 'Preparing speech model',
      model: 'Model',
      chars: 'characters',
      wordCount: 'words',
      source: 'Source',
      transcript: 'Transcript',
      cancelled: 'Cancelled',
      unknownError: 'Unknown error',
      privacy: 'Captions and audio stay on this machine; only the text summary is sent to the current default model.',
      urlRequired: 'Paste a video URL first.',
      jobFailed: 'Could not start the job.',
      downloadFailed: 'Could not download the document.',
      statusQueued: 'Queued',
      statusRunning: 'Working',
      statusDone: 'Done',
      statusError: 'Failed',
      statusCancelled: 'Cancelled',
      auto: 'Auto',
      manualTag: 'Manual',
      openManual: 'Paste transcript',
      audioNote: 'Downloading audio and recognizing speech can take a few minutes.',
    };

    const CSS = `
.vs-page { height: 100%; min-height: 100%; overflow: auto; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); }
.vs-shell { width: 100%; max-width: 920px; margin: 0 auto; padding: 40px 32px 88px; box-sizing: border-box; }
.vs-top { display: flex; align-items: center; gap: 12px; margin-bottom: 26px; }
.vs-mark { width: 46px; height: 46px; flex: 0 0 auto; border-radius: 13px; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l1); display: flex; align-items: center; justify-content: center; }
.vs-brand { font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-secondary); letter-spacing: .04em; }
.vs-kicker { font-size: 11px; font-weight: 700; letter-spacing: .16em; color: var(--dsw-alias-brand-primary); margin-bottom: 8px; }
.vs-title { margin: 0; font-size: 32px; line-height: 1.18; letter-spacing: -.02em; font-weight: 650; }
.vs-sub { margin: 12px 0 0; max-width: 780px; color: var(--dsw-alias-label-secondary); font-size: 14.5px; line-height: 1.75; }
.vs-hero { margin-bottom: 26px; }
.vs-card { background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); border-radius: 16px; padding: 22px; box-sizing: border-box; }
.vs-form { display: flex; flex-direction: column; gap: 16px; }
.vs-label { display: flex; flex-direction: column; gap: 8px; font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-secondary); }
.vs-input { width: 100%; height: 48px; box-sizing: border-box; border-radius: 10px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); padding: 0 14px; font: inherit; font-size: 14px; outline: none; }
.vs-input::placeholder { color: var(--dsw-alias-state-idle-primary); }
.vs-input:focus { border-color: var(--dsw-alias-brand-primary); }
.vs-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.vs-select { height: 36px; border-radius: 9px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); padding: 0 10px; font: inherit; font-size: 13px; outline: none; }
.vs-select:focus { border-color: var(--dsw-alias-brand-primary); }
.vs-check { display: flex; align-items: flex-start; gap: 9px; cursor: pointer; font-size: 13px; color: var(--dsw-alias-label-primary); line-height: 1.5; }
.vs-check input { width: 16px; height: 16px; margin: 2px 0 0; accent-color: var(--dsw-alias-brand-primary); flex: 0 0 auto; }
.vs-check small { display: block; color: var(--dsw-alias-label-secondary); font-size: 11.5px; margin-top: 2px; }
.vs-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.vs-primary { height: 42px; padding: 0 18px; border: 0; border-radius: 10px; background: var(--dsw-alias-brand-primary); color: #fff; font: inherit; font-size: 13.5px; font-weight: 650; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.vs-primary:hover { filter: brightness(1.05); }
.vs-primary:disabled { opacity: .55; cursor: default; filter: none; }
.vs-secondary { height: 40px; padding: 0 14px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; font-weight: 550; cursor: pointer; }
.vs-secondary:hover { background: var(--dsw-alias-bg-layer-2); }
.vs-ghost { border: 0; background: transparent; color: var(--dsw-alias-brand-primary); font: inherit; font-size: 12.5px; cursor: pointer; padding: 4px 2px; }
.vs-manual { display: flex; flex-direction: column; gap: 7px; }
.vs-textarea { width: 100%; min-height: 150px; resize: vertical; box-sizing: border-box; border-radius: 10px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); padding: 12px 14px; font: inherit; font-size: 13px; line-height: 1.65; outline: none; }
.vs-textarea:focus { border-color: var(--dsw-alias-brand-primary); }
.vs-textarea::placeholder { color: var(--dsw-alias-state-idle-primary); }
.vs-count { align-self: flex-end; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.vs-note { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.6; }
.vs-privacy { margin-top: 14px; color: var(--dsw-alias-label-secondary); font-size: 11.5px; line-height: 1.6; }
.vs-status { margin-top: 20px; }
.vs-status-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.vs-status-title { font-size: 14px; font-weight: 650; }
.vs-pill { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 999px; padding: 4px 9px; font-size: 11px; color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-base); }
.vs-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-state-idle-primary); flex: 0 0 auto; }
.vs-dot.ok { background: var(--dsw-alias-state-success-primary); }
.vs-dot.warn { background: var(--dsw-alias-state-warn-primary); }
.vs-track { height: 7px; border-radius: 999px; background: var(--dsw-alias-bg-layer-2); overflow: hidden; }
.vs-fill { height: 100%; border-radius: inherit; background: var(--dsw-alias-brand-primary); transition: width .35s ease; }
.vs-fill.error { background: var(--dsw-alias-state-error-primary); }
.vs-steps { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
.vs-step { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: var(--dsw-alias-label-secondary); }
.vs-step.active { color: var(--dsw-alias-label-primary); font-weight: 600; }
.vs-step.done { color: var(--dsw-alias-label-secondary); }
.vs-step-dot { width: 17px; height: 17px; border-radius: 50%; border: 1px solid var(--dsw-alias-border-l2); display: inline-flex; align-items: center; justify-content: center; font-size: 10px; flex: 0 0 auto; color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-base); }
.vs-step.done .vs-step-dot { background: var(--dsw-alias-state-success-primary); border-color: var(--dsw-alias-state-success-primary); color: #fff; }
.vs-step.active .vs-step-dot { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
.vs-step.active .vs-step-dot::after { content: ''; width: 5px; height: 5px; border-radius: 50%; background: var(--dsw-alias-brand-primary); animation: vs-pulse 1.2s ease-in-out infinite; }
.vs-step.done .vs-step-dot::after { content: '✓'; }
.vs-msg { margin-top: 14px; font-size: 12.5px; color: var(--dsw-alias-label-secondary); line-height: 1.6; }
.vs-error { margin-top: 20px; border: 1px solid var(--dsw-alias-state-error-primary); border-radius: 14px; padding: 18px; background: var(--dsw-alias-bg-layer-1); }
.vs-error-title { font-size: 14px; font-weight: 650; color: var(--dsw-alias-state-error-primary); }
.vs-error-text { margin-top: 8px; font-size: 13px; line-height: 1.7; color: var(--dsw-alias-label-primary); white-space: pre-wrap; }
.vs-error-hint { margin-top: 6px; font-size: 12px; line-height: 1.7; color: var(--dsw-alias-label-secondary); white-space: pre-wrap; }
.vs-error-actions { margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
.vs-empty { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 22px; }
.vs-feature { border: 1px solid var(--dsw-alias-border-l1); border-radius: 14px; padding: 16px; background: var(--dsw-alias-bg-layer-1); }
.vs-feature-num { font-size: 11px; font-weight: 700; letter-spacing: .08em; color: var(--dsw-alias-brand-primary); }
.vs-feature-title { margin-top: 8px; font-size: 13px; font-weight: 650; }
.vs-feature-body { margin-top: 5px; font-size: 12px; line-height: 1.65; color: var(--dsw-alias-label-secondary); }
.vs-result { margin-top: 24px; }
.vs-result-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin-bottom: 18px; }
.vs-result-kicker { font-size: 11px; font-weight: 700; letter-spacing: .12em; color: var(--dsw-alias-state-success-primary); }
.vs-result-title { margin: 7px 0 0; font-size: 24px; line-height: 1.35; letter-spacing: -.01em; }
.vs-result-line { margin: 8px 0 0; color: var(--dsw-alias-brand-primary); font-size: 14px; line-height: 1.65; font-weight: 550; }
.vs-chips { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 13px; }
.vs-chip { border: 1px solid var(--dsw-alias-border-l1); border-radius: 999px; padding: 4px 9px; font-size: 11px; color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-base); }
.vs-download { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.vs-path { max-width: 340px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 10.5px; line-height: 1.5; color: var(--dsw-alias-label-secondary); word-break: break-all; text-align: right; }
.vs-section { margin-top: 24px; }
.vs-section-title { font-size: 16px; font-weight: 650; margin: 0 0 10px; }
.vs-prose { font-size: 13.5px; line-height: 1.85; color: var(--dsw-alias-label-primary); white-space: pre-wrap; }
.vs-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 9px; }
.vs-list li { position: relative; padding-left: 18px; font-size: 13px; line-height: 1.75; }
.vs-list li::before { content: ''; position: absolute; left: 2px; top: .63em; width: 5px; height: 5px; border-radius: 50%; background: var(--dsw-alias-brand-primary); }
.vs-chapter { position: relative; padding: 0 0 16px 20px; border-left: 1px solid var(--dsw-alias-border-l1); margin-left: 4px; }
.vs-chapter:last-child { border-left-color: transparent; padding-bottom: 0; }
.vs-chapter::before { content: ''; position: absolute; left: -4px; top: 4px; width: 7px; height: 7px; border-radius: 50%; background: var(--dsw-alias-brand-primary); }
.vs-chapter-head { display: flex; align-items: baseline; gap: 9px; flex-wrap: wrap; }
.vs-chapter-time { font-size: 11.5px; font-weight: 700; color: var(--dsw-alias-brand-primary); font-variant-numeric: tabular-nums; }
.vs-chapter-title { font-size: 13px; font-weight: 650; }
.vs-chapter-body { margin-top: 5px; font-size: 12.5px; line-height: 1.75; color: var(--dsw-alias-label-secondary); }
.vs-quote { border-left: 3px solid var(--dsw-alias-brand-primary); padding: 2px 0 2px 14px; margin: 0 0 12px; font-size: 13px; line-height: 1.8; color: var(--dsw-alias-label-secondary); font-style: italic; }
.vs-footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-secondary); font-size: 11.5px; line-height: 1.7; }
.vs-spin { width: 14px; height: 14px; border: 2px solid var(--dsw-alias-border-l2); border-top-color: var(--dsw-alias-brand-primary); border-radius: 50%; animation: vs-spin .9s linear infinite; }
@keyframes vs-spin { to { transform: rotate(360deg); } }
@keyframes vs-pulse { 0%, 100% { opacity: .35; transform: scale(.8); } 50% { opacity: 1; transform: scale(1.15); } }
@media (max-width: 720px) {
  .vs-shell { padding: 28px 18px 64px; }
  .vs-title { font-size: 26px; }
  .vs-empty { grid-template-columns: 1fr; }
  .vs-download { align-items: flex-start; }
  .vs-path { text-align: left; }
}
@media (prefers-reduced-motion: reduce) {
  .vs-spin, .vs-step.active .vs-step-dot::after { animation: none; }
  .vs-fill { transition: none; }
}
`;

    function Logo({ size = 46 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 64 64', 'aria-hidden': true },
        h(
          'defs',
          null,
          h(
            'linearGradient',
            { id: 'vs-logo-bg', x1: '8', y1: '6', x2: '56', y2: '58', gradientUnits: 'userSpaceOnUse' },
            h('stop', { stopColor: '#2B6CB0' }),
            h('stop', { offset: '1', stopColor: '#1A365D' }),
          ),
        ),
        h('rect', { x: 4, y: 4, width: 56, height: 56, rx: 15, fill: 'url(#vs-logo-bg)' }),
        h('path', {
          d: 'M20 17h19l9 9v21a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V21a4 4 0 0 1 4-4Z',
          fill: '#F7FAFC',
          opacity: '.96',
        }),
        h('path', { d: 'M39 17l9 9h-7a2 2 0 0 1-2-2v-7Z', fill: '#BFD3EA' }),
        h('path', {
          d: 'M27.5 29.6v11.8a1 1 0 0 0 1.53.85l9.2-5.9a1 1 0 0 0 0-1.7l-9.2-5.9a1 1 0 0 0-1.53.85Z',
          fill: '#FFFFFF',
        }),
        h('circle', { cx: 47, cy: 47, r: 9, fill: '#F6AD55' }),
        h('path', {
          d: 'M43.5 47.2l2.3 2.3 4.6-4.8',
          fill: 'none',
          stroke: '#1A202C',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      );
    }

    function PanelIcon({ size = 22, active }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          'aria-hidden': true,
          style: { color: active ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-label-secondary)' },
        },
        h('rect', { x: 2.25, y: 4.25, width: 19.5, height: 15.5, rx: 4, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }),
        h('path', { d: 'M10 9.1v5.8l5-2.9-5-2.9Z', fill: 'currentColor' }),
        h('path', { d: 'M6 17.2h4.2', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
      );
    }

    function stageIndex(stage) {
      switch (stage) {
        case 'queued':
        case 'metadata':
          return 0;
        case 'captions':
        case 'audio':
          return 1;
        case 'decode':
        case 'asr-model':
        case 'asr':
          return 2;
        case 'summary':
          return 3;
        case 'docx':
          return 4;
        case 'done':
          return 5;
        default:
          return -1;
      }
    }

    function stageLabel(t, index) {
      return [t('step1'), t('step2'), t('step3'), t('step4'), t('step5')][index] ?? '';
    }

    function Page({ t }) {
      const [url, setUrl] = React.useState('');
      const [language, setLanguage] = React.useState('zh');
      const [allowAsr, setAllowAsr] = React.useState(true);
      const [manualOpen, setManualOpen] = React.useState(false);
      const [manualText, setManualText] = React.useState('');
      const [info, setInfo] = React.useState(null);
      const [job, setJob] = React.useState(null);
      const [starting, setStarting] = React.useState(false);
      const [localError, setLocalError] = React.useState(null);

      React.useEffect(() => {
        let alive = true;
        fetch('/api/video-summary/info', { headers: { accept: 'application/json' } })
          .then((response) => (response.ok ? response.json() : null))
          .then((data) => {
            if (alive) setInfo(data);
          })
          .catch(() => {});
        return () => {
          alive = false;
        };
      }, []);

      React.useEffect(() => {
        const id = job?.id;
        const status = job?.status;
        if (!id || (status !== 'queued' && status !== 'running')) return;
        let stopped = false;
        let timer;
        const tick = async () => {
          try {
            const response = await fetch(`/api/video-summary/jobs?id=${encodeURIComponent(id)}`, {
              headers: { accept: 'application/json' },
            });
            const data = await response.json().catch(() => ({}));
            if (stopped) return;
            if (!response.ok) {
              throw new Error(data?.error?.message ?? `HTTP ${response.status}`);
            }
            setJob(data);
            if (data.status === 'queued' || data.status === 'running') timer = setTimeout(tick, 900);
          } catch (error) {
            if (!stopped) {
              setLocalError({ code: 'POLL_FAILED', message: error instanceof Error ? error.message : String(error) });
            }
          }
        };
        timer = setTimeout(tick, 350);
        return () => {
          stopped = true;
          clearTimeout(timer);
        };
      }, [job?.id, job?.status]);

      const active = starting || job?.status === 'queued' || job?.status === 'running';
      const result = job?.status === 'done' ? job.result : null;
      const error = localError ?? job?.error ?? (job?.status === 'error' ? { code: 'JOB_FAILED', message: job.message } : null);
      const currentStage = stageIndex(job?.stage);
      const progress = typeof job?.progress === 'number' ? job.progress : 0;
      const percent = Math.max(0, Math.min(100, Math.round(progress * 100)));
      const asr = info?.asr;

      const submit = async (event) => {
        event?.preventDefault();
        if (active) return;
        if (!url.trim()) {
          setLocalError({ code: 'URL_REQUIRED', message: t('urlRequired') });
          return;
        }
        setLocalError(null);
        setJob(null);
        setStarting(true);
        try {
          const response = await fetch('/api/video-summary/jobs', {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({
              url: url.trim(),
              transcript: manualText.trim() || undefined,
              language,
              allow_transcription: allowAsr,
            }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.id) {
            throw new Error(data?.error?.message ?? t('jobFailed'));
          }
          setJob(data);
        } catch (failure) {
          setLocalError({ code: 'START_FAILED', message: failure instanceof Error ? failure.message : String(failure) });
        } finally {
          setStarting(false);
        }
      };

      const cancel = async () => {
        if (!job?.id) return;
        try {
          await fetch('/api/video-summary/cancel', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id: job.id }),
          });
        } catch {
          // The status poll will settle the job.
        }
        setJob({ ...job, status: 'cancelled', stage: 'cancelled', message: t('cancelled') });
      };

      const download = () => {
        if (!result?.docxBase64 || !result?.docxName) {
          setLocalError({ code: 'DOWNLOAD_FAILED', message: t('downloadFailed') });
          return;
        }
        try {
          const binary = atob(result.docxBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          });
          const objectUrl = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = objectUrl;
          anchor.download = result.docxName;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
        } catch (failure) {
          setLocalError({ code: 'DOWNLOAD_FAILED', message: failure instanceof Error ? failure.message : t('downloadFailed') });
        }
      };

      const reset = () => {
        setJob(null);
        setLocalError(null);
      };

      const openManualForRetry = () => {
        setManualOpen(true);
        setLocalError(null);
      };

      const statusLabel = job?.status === 'done'
        ? t('statusDone')
        : job?.status === 'error'
          ? t('statusError')
          : job?.status === 'cancelled'
            ? t('statusCancelled')
            : job?.status === 'queued'
              ? t('statusQueued')
              : t('statusRunning');

      return h(
        'div',
        { className: 'vs-page' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'vs-shell' },
          h(
            'header',
            { className: 'vs-hero' },
            h(
              'div',
              { className: 'vs-top' },
              h('div', { className: 'vs-mark' }, h(Logo, { size: 34 })),
              h('div', null, h('div', { className: 'vs-brand' }, t('panel')), h('div', { className: 'vs-kicker' }, t('kicker'))),
            ),
            h('h1', { className: 'vs-title' }, t('title')),
            h('p', { className: 'vs-sub' }, t('subtitle')),
          ),
          h(
            'form',
            { className: 'vs-card vs-form', onSubmit: submit },
            h(
              'label',
              { className: 'vs-label' },
              t('urlLabel'),
              h('input', {
                className: 'vs-input',
                type: 'url',
                value: url,
                placeholder: t('urlPlaceholder'),
                onChange: (event) => setUrl(event.target.value),
                disabled: active,
                spellCheck: false,
                autoComplete: 'off',
              }),
            ),
            h(
              'div',
              { className: 'vs-row' },
              h(
                'label',
                { className: 'vs-label', style: { flexDirection: 'row', alignItems: 'center', gap: '8px' } },
                t('language'),
                h(
                  'select',
                  {
                    className: 'vs-select',
                    value: language,
                    onChange: (event) => setLanguage(event.target.value),
                    disabled: active,
                  },
                  h('option', { value: 'zh' }, t('chinese')),
                  h('option', { value: 'en' }, t('english')),
                ),
              ),
              asr && h(
                'span',
                { className: 'vs-pill', title: asr.label || '' },
                h('span', { className: `vs-dot ${asr.ready ? 'ok' : asr.available ? 'warn' : ''}` }),
                asr.ready ? t('asrReady') : asr.available ? (asr.phase === 'downloading' || asr.phase === 'loading' || asr.phase === 'checking' ? t('asrPreparing') : t('asrDownload')) : t('asrUnavailable'),
              ),
              info?.model && h('span', { className: 'vs-pill' }, `${t('model')}: ${info.model.provider} / ${info.model.model}`),
            ),
            h(
              'label',
              { className: 'vs-check' },
              h('input', {
                type: 'checkbox',
                checked: allowAsr,
                onChange: (event) => setAllowAsr(event.target.checked),
                disabled: active,
              }),
              h('span', null, t('asr'), h('small', null, t('asrHint'))),
            ),
            h(
              'div',
              null,
              h(
                'button',
                {
                  type: 'button',
                  className: 'vs-ghost',
                  onClick: () => setManualOpen((value) => !value),
                  disabled: active,
                },
                manualOpen ? t('manualHide') : t('manualToggle'),
              ),
              manualOpen && h(
                'div',
                { className: 'vs-manual', style: { marginTop: '8px' } },
                h('label', { className: 'vs-label' }, t('manualLabel')),
                h('textarea', {
                  className: 'vs-textarea',
                  value: manualText,
                  placeholder: t('manualPlaceholder'),
                  onChange: (event) => setManualText(event.target.value),
                  disabled: active,
                  spellCheck: false,
                }),
                h('span', { className: 'vs-count' }, `${manualText.length.toLocaleString()} ${t('manualCount')}`),
              ),
            ),
            h(
              'div',
              { className: 'vs-actions' },
              h(
                'button',
                { type: 'submit', className: 'vs-primary', disabled: active || !url.trim() },
                active ? h('span', { className: 'vs-spin' }) : null,
                active ? t('generating') : t('generate'),
              ),
              active && h('button', { type: 'button', className: 'vs-secondary', onClick: cancel }, t('cancel')),
              !active && job && h('button', { type: 'button', className: 'vs-secondary', onClick: reset }, t('regenerate')),
            ),
            h('div', { className: 'vs-privacy' }, t('privacy')),
          ),
          !job && !error && h(
            'div',
            { className: 'vs-empty' },
            h('div', { className: 'vs-feature' }, h('div', { className: 'vs-feature-num' }, '01'), h('div', { className: 'vs-feature-title' }, t('feature1Title')), h('div', { className: 'vs-feature-body' }, t('feature1Body'))),
            h('div', { className: 'vs-feature' }, h('div', { className: 'vs-feature-num' }, '02'), h('div', { className: 'vs-feature-title' }, t('feature2Title')), h('div', { className: 'vs-feature-body' }, t('feature2Body'))),
            h('div', { className: 'vs-feature' }, h('div', { className: 'vs-feature-num' }, '03'), h('div', { className: 'vs-feature-title' }, t('feature3Title')), h('div', { className: 'vs-feature-body' }, t('feature3Body'))),
          ),
          (job || starting) && h(
            'div',
            { className: 'vs-card vs-status' },
            h(
              'div',
              { className: 'vs-status-head' },
              h('div', { className: 'vs-status-title' }, t('stepsTitle')),
              h(
                'span',
                { className: 'vs-pill' },
                active ? h('span', { className: 'vs-spin' }) : h('span', { className: `vs-dot ${job?.status === 'done' ? 'ok' : job?.status === 'error' ? 'warn' : ''}` }),
                starting ? t('statusRunning') : statusLabel,
              ),
            ),
            h(
              'div',
              { className: 'vs-track' },
              h('div', { className: `vs-fill ${job?.status === 'error' ? 'error' : ''}`, style: { width: `${job?.status === 'error' ? 100 : percent}%` } }),
            ),
            h(
              'div',
              { className: 'vs-steps' },
              [0, 1, 2, 3, 4].map((index) => {
                const done = job?.status === 'done' || (currentStage > index && currentStage >= 0);
                const isActive = currentStage === index && active;
                return h(
                  'div',
                  { key: index, className: `vs-step ${done ? 'done' : ''} ${isActive ? 'active' : ''}` },
                  h('span', { className: 'vs-step-dot' }),
                  h('span', null, stageLabel(t, index)),
                );
              }),
            ),
            job?.message && h('div', { className: 'vs-msg' }, job.message),
            job?.stage === 'asr-model' && h('div', { className: 'vs-note' }, t('audioNote')),
          ),
          error && h(
            'div',
            { className: 'vs-error' },
            h('div', { className: 'vs-error-title' }, t('errorTitle')),
            h('div', { className: 'vs-error-text' }, error.message || t('unknownError')),
            error.hint && h('div', { className: 'vs-error-hint' }, error.hint),
            h(
              'div',
              { className: 'vs-error-actions' },
              h('button', { type: 'button', className: 'vs-primary', onClick: openManualForRetry, disabled: active }, t('retryManual')),
              h('button', { type: 'button', className: 'vs-secondary', onClick: reset }, t('regenerate')),
            ),
          ),
          result && h(
            'article',
            { className: 'vs-result' },
            h(
              'div',
              { className: 'vs-card' },
              h(
                'div',
                { className: 'vs-result-head' },
                h(
                  'div',
                  { style: { minWidth: 0, flex: '1 1 420px' } },
                  h('div', { className: 'vs-result-kicker' }, t('resultKicker')),
                  h('h2', { className: 'vs-result-title' }, result.title),
                  h('p', { className: 'vs-result-line' }, result.oneLine),
                  h(
                    'div',
                    { className: 'vs-chips' },
                    result.author && h('span', { className: 'vs-chip' }, result.author),
                    result.durationLabel && h('span', { className: 'vs-chip' }, result.durationLabel),
                    result.transcriptLabel && h('span', { className: 'vs-chip' }, `${t('transcript')}: ${result.transcriptLabel}`),
                    typeof result.transcriptChars === 'number' && h('span', { className: 'vs-chip' }, `${result.transcriptChars.toLocaleString()} ${t('chars')}`),
                    typeof result.wordCount === 'number' && h('span', { className: 'vs-chip' }, `${result.wordCount.toLocaleString()} ${t('wordCount')}`),
                  ),
                ),
                h(
                  'div',
                  { className: 'vs-download' },
                  h('button', { type: 'button', className: 'vs-primary', onClick: download }, t('download')),
                  h('div', { className: 'vs-path', title: result.docxPath }, `${t('savedTo')} ${result.docxPath}`),
                ),
              ),
              h(
                'div',
                { className: 'vs-section' },
                h('h3', { className: 'vs-section-title' }, t('overview')),
                h('div', { className: 'vs-prose' }, result.overview),
              ),
              result.keyPoints?.length > 0 && h(
                'div',
                { className: 'vs-section' },
                h('h3', { className: 'vs-section-title' }, t('keyPoints')),
                h('ul', { className: 'vs-list' }, result.keyPoints.map((item, index) => h('li', { key: index }, item))),
              ),
              result.chapters?.length > 0 && h(
                'div',
                { className: 'vs-section' },
                h('h3', { className: 'vs-section-title' }, t('chapters')),
                h(
                  'div',
                  null,
                  result.chapters.map((chapter, index) =>
                    h(
                      'div',
                      { className: 'vs-chapter', key: index },
                      h(
                        'div',
                        { className: 'vs-chapter-head' },
                        chapter.time && h('span', { className: 'vs-chapter-time' }, chapter.time),
                        h('span', { className: 'vs-chapter-title' }, chapter.title),
                      ),
                      chapter.summary && h('div', { className: 'vs-chapter-body' }, chapter.summary),
                    ),
                  ),
                ),
              ),
              result.quotes?.length > 0 && h(
                'div',
                { className: 'vs-section' },
                h('h3', { className: 'vs-section-title' }, t('quotes')),
                h('div', null, result.quotes.map((quote, index) => h('blockquote', { className: 'vs-quote', key: index }, quote))),
              ),
              result.takeaways?.length > 0 && h(
                'div',
                { className: 'vs-section' },
                h('h3', { className: 'vs-section-title' }, t('takeaways')),
                h('ul', { className: 'vs-list' }, result.takeaways.map((item, index) => h('li', { key: index }, item))),
              ),
            ),
          ),
          h('footer', { className: 'vs-footer' }, t('privacy')),
        ),
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'video-summary: dictionaries');
        const t = ctx.locale.bind(NS);
        ctx.slots.inject('main', () =>
          ctx.slots.register(
            {
              name: 'main',
              key: 'video-summary',
              locale: NS,
            },
            () => h(Page, { t }),
          ),
        );
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: 'video-summary',
              order: 20,
              label: () => t('panel'),
              locale: NS,
            },
            PanelIcon,
          ),
        );
      },
    };
  },
});
