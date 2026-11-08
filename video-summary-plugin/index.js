/**
 * Host half of the Video Summary plugin.
 *
 * The panel talks to this half over authenticated same-origin Fetch routes under
 * /api/video-summary/*. Jobs are process-local and short-lived; the durable
 * artifact is the .docx written into the session workspace.
 */

import path from 'node:path';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { buildDocx, docxMetaFromSource } from './lib/docx.js';
import { compactMetadata, downloadMedia, manualTranscript, resolveVideoSource } from './lib/sources.js';
import { decodeMediaAudio, speechStatus, transcribeWithSpeech } from './lib/audio.js';
import { summarizeVideo } from './lib/summarize.js';
import {
  VideoSummaryError,
  cleanText,
  formatBytes,
  formatDuration,
  localStamp,
  normalizeUrl,
  safeFileName,
} from './lib/util.js';

const JOB_TTL_MS = 60 * 60 * 1000;
const JOB_MAX = 24;
const PREFERRED_SPEECH_ID = 'video-summary-sensevoice';

export const name = 'video-summary';
export const inject = ['tools', 'webServer', 'connection', 'llm', 'agentDefaultModel', 'workingDirectory'];

export async function apply(ctx, config) {
  const settings = {
    maxMediaMB: clampNumber(config?.maxMediaMB, 20, 500, 120),
    maxTranscriptChars: clampNumber(config?.maxTranscriptChars, 4000, 200000, 60000),
    outputDir: typeof config?.outputDir === 'string' ? config.outputDir : '',
  };
  const jobs = new Map();
  const speech = ctx.get('speechToText');

  const outputDirectory = () => {
    const base = ctx.workingDirectory.defaultDirectory || process.cwd();
    if (settings.outputDir) return path.isAbsolute(settings.outputDir) ? settings.outputDir : path.resolve(base, settings.outputDir);
    return path.join(base, 'video-summaries');
  };

  const update = (job, patch) => {
    if (!job || job.status === 'done' || job.status === 'error' || job.status === 'cancelled') return;
    Object.assign(job, patch, { updatedAt: Date.now() });
  };

  const progress = (job, stage, message, percent) => {
    update(job, {
      stage,
      message,
      ...(Number.isFinite(percent) ? { progress: Math.max(0, Math.min(1, percent)) } : {}),
    });
  };

  const startJob = (payload) => {
    const job = {
      id: randomUUID(),
      status: 'queued',
      stage: 'queued',
      message: '任务已创建，等待开始…',
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      payload,
      controller: new AbortController(),
      result: null,
      error: null,
      cancelled: false,
    };
    jobs.set(job.id, job);
    trimJobs(jobs);
    void runJob(job).catch(() => {});
    return job;
  };

  const runJob = async (job) => {
    job.status = 'running';
    update(job, { progress: 0.02 });
    try {
      const result = await runSummary(job.payload, {
        signal: job.controller.signal,
        onProgress: (event) => {
          if (job.cancelled) return;
          progress(job, event.stage, event.message, event.progress);
        },
        outputDirectory,
        settings,
        ctx,
        speech,
      });
      if (job.cancelled) {
        update(job, { status: 'cancelled', stage: 'cancelled', message: '任务已取消。' });
        return;
      }
      job.status = 'done';
      job.stage = 'done';
      job.progress = 1;
      job.message = 'Word 文档已生成。';
      job.result = result;
      job.updatedAt = Date.now();
    } catch (error) {
      const normalized = normalizeError(error);
      if (job.cancelled || (error instanceof Error && error.name === 'AbortError')) {
        job.status = 'cancelled';
        job.stage = 'cancelled';
        job.message = '任务已取消。';
      } else {
        job.status = 'error';
        job.stage = 'error';
        job.error = normalized;
        job.message = normalized.message;
      }
      job.updatedAt = Date.now();
    } finally {
      job.controller = null;
    }
  };

  const cancelJob = (id) => {
    const job = jobs.get(id);
    if (!job || job.status === 'done' || job.status === 'error' || job.status === 'cancelled') return false;
    job.cancelled = true;
    job.controller?.abort();
    update(job, { status: 'cancelled', stage: 'cancelled', message: '任务已取消。' });
    return true;
  };

  const disposeCleanup = ctx.effect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      for (const [id, job] of jobs) {
        if (job.status === 'done' || job.status === 'error' || job.status === 'cancelled') {
          if (now - job.updatedAt > JOB_TTL_MS) jobs.delete(id);
        }
      }
    }, 5 * 60 * 1000);
    timer.unref?.();
    return () => clearInterval(timer);
  }, 'video-summary: job cleanup');

  const routes = [
    {
      path: '/api/video-summary/jobs',
      methods: ['POST', 'GET'],
      handler: async (request) => {
        if (request.method === 'GET') {
          const id = new URL(request.url).searchParams.get('id') ?? '';
          const job = jobs.get(id);
          if (!job) return json(404, { ok: false, error: { code: 'JOB_NOT_FOUND', message: '任务不存在或已过期。' } });
          return json(200, jobView(job, true));
        }
        const body = await readJson(request);
        const payload = validatePayload(body);
        const job = startJob(payload);
        return json(202, jobView(job, false));
      },
    },
    {
      path: '/api/video-summary/cancel',
      methods: ['POST'],
      handler: async (request) => {
        const body = await readJson(request);
        const id = typeof body?.id === 'string' ? body.id : '';
        const cancelled = cancelJob(id);
        return json(cancelled ? 200 : 404, { ok: cancelled, ...(cancelled ? {} : { error: { code: 'JOB_NOT_FOUND', message: '任务不存在或已结束。' } }) });
      },
    },
    {
      path: '/api/video-summary/info',
      methods: ['GET'],
      handler: async () => {
        let selection;
        try {
          selection = ctx.agentDefaultModel.currentSelection();
        } catch {
          selection = null;
        }
        return json(200, {
          ok: true,
          asr: speechStatus(ctx.get('speechToText') ?? speech, PREFERRED_SPEECH_ID),
          model: selection,
          outputDir: outputDirectory(),
          limits: { maxMediaMB: settings.maxMediaMB, maxTranscriptChars: settings.maxTranscriptChars },
        });
      },
    },
  ];

  const routeDisposers = routes.map((route) =>
    ctx.connection.fetch.register({
      path: route.path,
      methods: route.methods,
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          return await route.handler(request);
        } catch (error) {
          const normalized = normalizeError(error);
          return json(normalized.code === 'BAD_REQUEST' ? 400 : 500, { ok: false, error: normalized });
        }
      },
    }),
  );
  ctx.effect(() => () => {
    for (const dispose of routeDisposers) dispose();
    disposeCleanup?.();
  }, 'video-summary: routes');

  const disposeTool = ctx.tools.register({
    name: 'video_summary',
    description:
      'Read a public website video (Bilibili/YouTube captions, a generic page with captions, or a direct MP4/M4A link), summarize it, and write a formatted Word document into the workspace. ' +
      'If automatic captions and local speech recognition are unavailable, pass the transcript explicitly.',
    parameters: {
      url: {
        type: 'string',
        required: true,
        description: 'Public video page URL or direct MP4/M4A URL.',
      },
      transcript: {
        type: 'string',
        description: 'Optional transcript or speaker notes. Supplying this skips caption/audio extraction.',
      },
      language: {
        type: 'string',
        enum: ['zh', 'en'],
        default: 'zh',
        description: 'Summary language. Defaults to Chinese.',
      },
      allow_transcription: {
        type: 'boolean',
        default: true,
        description: 'When no public captions exist, download the audio and run local speech recognition.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: [
          'title',
          'oneLine',
          'overview',
          'keyPoints',
          'chapters',
          'takeaways',
          'docxPath',
          'docxName',
          'sourceUrl',
          'transcriptSource',
          'transcriptChars',
        ],
        properties: {
          title: { type: 'string' },
          oneLine: { type: 'string' },
          overview: { type: 'string' },
          keyPoints: { type: 'array', items: { type: 'string' } },
          chapters: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['time', 'title', 'summary'],
              properties: {
                time: { type: 'string' },
                title: { type: 'string' },
                summary: { type: 'string' },
              },
            },
          },
          takeaways: { type: 'array', items: { type: 'string' } },
          docxPath: { type: 'string' },
          docxName: { type: 'string' },
          sourceUrl: { type: 'string' },
          transcriptSource: { type: 'string' },
          transcriptChars: { type: 'number' },
        },
      },
      render: (_args, value) => [
        {
          type: 'text',
          text: [
            `# ${value.title}`,
            value.oneLine,
            '',
            value.overview,
            '',
            value.keyPoints?.length ? `## 核心要点\n${value.keyPoints.map((item) => `- ${item}`).join('\n')}` : '',
            `## Word 文档\n${value.docxPath}`,
            `来源：${value.sourceUrl}`,
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
    },
    timeoutMs: 20 * 60 * 1000,
    isConcurrencySafe: () => false,
    presentCall: (args) => ({
      card: 'generic',
      title: args?.url ? `总结视频：${args.url}` : '总结视频',
      kind: 'other',
      rawInput: args?.url,
    }),
    async execute(args, exec) {
      const payload = validatePayload(args ?? {});
      const result = await runSummary(payload, {
        signal: exec.signal,
        onProgress: () => {},
        outputDirectory,
        settings,
        ctx,
        speech,
      });
      return {
        title: result.title,
        oneLine: result.oneLine,
        overview: result.overview,
        keyPoints: result.keyPoints,
        chapters: result.chapters,
        takeaways: result.takeaways,
        docxPath: result.docxPath,
        docxName: result.docxName,
        sourceUrl: result.sourceUrl,
        transcriptSource: result.transcriptSource,
        transcriptChars: result.transcriptChars,
      };
    },
  });

  ctx.effect(() => disposeTool, 'video-summary: tool');

  ctx.logger?.info?.('[video-summary] ready');
}

export async function runSummary(payload, options) {
  const { signal, onProgress, outputDirectory, settings, ctx, speech } = options;
  const speechService = speech ?? ctx.get('speechToText');
  const language = payload.language === 'en' ? 'en' : 'zh';
  const url = payload.url;
  const manualText = typeof payload.transcript === 'string' ? cleanText(payload.transcript) : '';
  const allowAsr = payload.allowAsr !== false;
  const emit = (stage, message, percent) => {
    if (signal?.aborted) throw new VideoSummaryError('ABORTED', '任务已取消。');
    onProgress?.({ stage, message, progress: percent });
  };

  emit('metadata', language === 'en' ? 'Reading video metadata…' : '正在读取视频信息…', 0.04);
  let source;
  if (manualText) {
    try {
      source = await resolveVideoSource(url, { signal, skipMedia: true, metadataOnly: true });
    } catch {
      source = fallbackSource(url, language);
    }
  } else {
    source = await resolveVideoSource(url, { signal });
  }

  if (source.pages?.length > 1) {
    // The selected page is already reflected in source.title and source.duration.
  }

  let transcript;
  if (manualText) {
    emit('captions', language === 'en' ? 'Using the supplied transcript…' : '正在使用手动转录…', 0.12);
    transcript = manualTranscript(manualText, language);
  } else if (source.transcript?.text) {
    emit('captions', language === 'en' ? 'Captions found; preparing the transcript…' : '已找到字幕，正在整理文本…', 0.12);
    transcript = source.transcript;
  } else {
    if (!allowAsr) {
      throw new VideoSummaryError(
        'NO_TRANSCRIPT',
        language === 'en'
          ? 'This page has no publicly readable captions, and automatic speech recognition is disabled.'
          : '这个页面没有可自动读取的字幕，且你关闭了语音转写。',
        language === 'en'
          ? 'Enable “transcribe audio when no captions exist”, or paste a transcript.'
          : '请勾选“无字幕时用本地语音转写”，或展开“手动转录”粘贴文稿。',
      );
    }
    if (!source.media?.url) {
      throw new VideoSummaryError(
        'NO_TRANSCRIPT',
        language === 'en'
          ? 'No captions and no readable MP4 audio were found on this page.'
          : '这个页面既没有公开字幕，也没有可读取的 MP4 音频。',
        language === 'en' ? 'Paste a transcript to continue.' : '展开“手动转录”粘贴文稿后仍可生成总结。',
      );
    }
    if (!speechService) {
      throw new VideoSummaryError(
        'ASR_UNAVAILABLE',
        language === 'en'
          ? 'Local speech recognition is not available in this Harness profile.'
          : '当前 Harness 配置没有启用本地语音识别。',
        language === 'en' ? 'Paste a transcript to continue.' : '展开“手动转录”粘贴文稿后重试。',
      );
    }
    emit('audio', language === 'en' ? 'Downloading the audio track…' : '正在下载视频音频…', 0.16);
    const media = await downloadMedia(source, {
      signal,
      maxBytes: settings.maxMediaMB * 1024 * 1024,
      onProgress: (done, total) => {
        const percent = total ? 0.16 + 0.2 * Math.min(1, done / total) : 0.2;
        emit('audio', `${language === 'en' ? 'Downloading audio' : '正在下载音频'} · ${formatBytes(done)}${total ? ` / ${formatBytes(total)}` : ''}`, percent);
      },
    });
    emit('decode', language === 'en' ? 'Decoding the audio…' : '正在解码音频…', 0.38);
    const audio = await decodeMediaAudio(media.buffer, {
      onProgress: (event) => {
        if (event.phase === 'decoded') {
          emit('decode', `${language === 'en' ? 'Audio ready' : '音频已就绪'} · ${formatDuration(event.seconds)}`, 0.42);
        }
      },
    });
    emit('asr', language === 'en' ? 'Preparing local speech recognition…' : '正在准备本地语音识别…', 0.45);
    const asrLanguage = source.language === 'en' || language === 'en' ? 'en' : 'zh';
    const transcribed = await transcribeWithSpeech(speechService, {
      wav: audio.wav,
      language: asrLanguage,
      signal,
      preferredId: PREFERRED_SPEECH_ID,
      onProgress: (event) => {
        const stage = event.phase === 'downloading' || event.phase === 'preparing' ? 'asr-model' : 'asr';
        const percent = event.phase === 'downloading' ? 0.45 + 0.3 * (event.progress ?? 0) : 0.55;
        emit(stage, event.message ?? (language === 'en' ? 'Transcribing…' : '正在本地识别语音…'), percent);
      },
    });
    transcript = {
      source: 'speech-to-text',
      label: language === 'en' ? 'Local speech recognition' : '本地语音识别',
      segments: [{ start: 0, end: audio.seconds, text: transcribed.text }],
      text: transcribed.text,
      language: asrLanguage,
    };
    if (!source.duration) source.duration = Math.round(audio.seconds);
  }

  source.transcript = transcript;
  const transcriptChars = transcript.text.length;
  if (transcriptChars > settings.maxTranscriptChars) {
    transcript.text = `${transcript.text.slice(0, settings.maxTranscriptChars)}\n\n…（转写文本过长，已截断）`;
    source.transcript = transcript;
  }
  if (!source.duration && transcript.segments?.length) {
    source.duration = Math.round(Math.max(...transcript.segments.map((segment) => Number(segment.end) || 0)));
  }

  emit('summary', language === 'en' ? 'Summarizing with the default model…' : '正在用默认模型生成总结…', 0.62);
  const summary = await summarizeVideo({
    llm: ctx.llm,
    selection: ctx.agentDefaultModel.currentSelection(),
    source,
    transcript: source.transcript,
    language,
    signal,
    onProgress: (event) => emit(event.stage ?? 'summary', event.message, event.progress != null ? 0.62 + 0.2 * event.progress : 0.7),
  });

  emit('docx', language === 'en' ? 'Writing the Word document…' : '正在生成 Word 文档…', 0.86);
  const generatedAt = new Date().toLocaleString(language === 'en' ? 'en-US' : 'zh-CN', { hour12: false });
  const meta = { ...docxMetaFromSource(source, summary, { language, generatedAt }), transcriptChars };
  const docx = buildDocx(summary, meta);
  const dir = outputDirectory();
  await mkdir(dir, { recursive: true });
  const baseName = safeFileName(`${source.title} - ${localStamp()}`, '视频总结');
  const docxPath = await uniquePath(dir, baseName, '.docx');
  try {
    await writeFile(docxPath, docx, { flag: 'wx' });
  } catch (error) {
    throw new VideoSummaryError(
      'WRITE_FAILED',
      `无法写入 Word 文档：${error instanceof Error ? error.message : String(error)}`,
      '请检查工作区写入权限。',
    );
  }
  emit('done', language === 'en' ? 'Done.' : '完成。', 1);
  return {
    title: source.title,
    author: source.author,
    duration: source.duration,
    durationLabel: formatDuration(source.duration),
    sourceUrl: source.sourceUrl,
    cover: source.cover,
    publishedAt: source.publishedAt,
    language,
    oneLine: summary.oneLine,
    overview: summary.overview,
    keyPoints: summary.keyPoints,
    chapters: summary.chapters,
    quotes: summary.quotes,
    takeaways: summary.takeaways,
    wordCount: summary.wordCount,
    transcriptSource: transcript.source,
    transcriptLabel: transcript.label,
    transcriptChars,
    docxBase64: docx.toString('base64'),
    docxName: path.basename(docxPath),
    docxPath,
    docxBytes: docx.length,
    createdAt: new Date().toISOString(),
    metadata: compactMetadata(source),
  };
}

function validatePayload(input) {
  if (!input || typeof input !== 'object') throw new VideoSummaryError('BAD_REQUEST', '请求格式不正确。');
  let url;
  try {
    url = normalizeUrl(input.url);
  } catch (error) {
    if (error instanceof VideoSummaryError) throw error;
    throw new VideoSummaryError('BAD_REQUEST', '视频链接无效。');
  }
  if (url.length > 2048) throw new VideoSummaryError('BAD_REQUEST', '视频链接过长。');
  const transcript = typeof input.transcript === 'string' ? input.transcript : '';
  if (transcript.length > 300000) throw new VideoSummaryError('BAD_REQUEST', '手动转录文本过长（最多 30 万字符）。');
  return {
    url,
    transcript,
    language: input.language === 'en' ? 'en' : 'zh',
    allowAsr: input.allow_transcription !== false,
  };
}

function fallbackSource(url, language) {
  let host = '视频';
  let title = '视频总结';
  try {
    const parsed = new URL(url);
    host = parsed.hostname;
    const last = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).at(-1) ?? '');
    title = last.replace(/\.[^.]+$/, '') || host;
  } catch {
    // Keep generic labels.
  }
  return {
    kind: 'manual',
    sourceUrl: url,
    title,
    author: host,
    duration: 0,
    description: '',
    cover: '',
    publishedAt: undefined,
    language,
    asrSupported: false,
    transcript: null,
    media: null,
    subtitleHint: '',
  };
}

function normalizeError(error) {
  if (error instanceof VideoSummaryError) return error.toJSON();
  if (error instanceof Error && error.name === 'AbortError') {
    return { code: 'ABORTED', message: '任务已取消。' };
  }
  return {
    code: 'INTERNAL',
    message: error instanceof Error ? error.message : String(error),
    hint: '请重试；如果问题持续出现，请查看 Harness 日志。',
  };
}

function jobView(job, includeResult) {
  return {
    schemaVersion: 1,
    id: job.id,
    status: job.status,
    stage: job.stage,
    message: job.message,
    progress: job.progress ?? 0,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    ...(job.error ? { error: job.error } : {}),
    ...(includeResult && job.result ? { result: job.result } : {}),
  };
}

function trimJobs(jobs) {
  if (jobs.size <= JOB_MAX) return;
  const finished = [...jobs.values()]
    .filter((job) => job.status === 'done' || job.status === 'error' || job.status === 'cancelled')
    .sort((a, b) => a.updatedAt - b.updatedAt);
  while (jobs.size > JOB_MAX && finished.length > 0) {
    const job = finished.shift();
    jobs.delete(job.id);
  }
}

async function uniquePath(dir, baseName, extension) {
  for (let index = 0; index < 100; index += 1) {
    const suffix = index === 0 ? '' : ` (${index + 1})`;
    const candidate = path.join(dir, `${baseName}${suffix}${extension}`);
    try {
      await access(candidate);
    } catch {
      return candidate;
    }
  }
  return path.join(dir, `${baseName}-${randomUUID().slice(0, 8)}${extension}`);
}

async function readJson(request) {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new VideoSummaryError('BAD_REQUEST', '请求必须使用 application/json。');
  }
  try {
    return await request.json();
  } catch {
    throw new VideoSummaryError('BAD_REQUEST', '请求 JSON 无法解析。');
  }
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}
