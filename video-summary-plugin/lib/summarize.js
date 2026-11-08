/** LLM summarization with long-transcript chunking and strict JSON normalization. */

import { VideoSummaryError, cleanText, formatDuration, truncate } from './util.js';

const DIRECT_TRANSCRIPT_CHARS = 44000;
const CHUNK_TRANSCRIPT_CHARS = 18000;

const SYSTEM_ZH =
  '你是一名严谨的视频内容分析师。你只依据给定的视频标题、简介和转写文本工作；不得编造未出现的事实、数字、人名或引语。' +
  '如果文本是机器转写，允许修正明显的同音错字，但不要改变原意。你的输出必须是严格 JSON，不要使用 Markdown 代码围栏或额外解释。';

const SYSTEM_EN =
  'You are a rigorous video content analyst. Work only from the supplied title, description, and transcript; never invent facts, numbers, names, or quotations. ' +
  'Machine transcripts may contain homophone errors, which you may correct only when the intended meaning is obvious. Output strict JSON only, without Markdown fences or commentary.';

export async function summarizeVideo(options) {
  const {
    llm,
    selection,
    source,
    transcript,
    language = 'zh',
    signal,
    onProgress,
  } = options;
  if (!llm || typeof llm.stream !== 'function') {
    throw new VideoSummaryError('LLM_UNAVAILABLE', '当前 Harness 没有可用的模型服务。', '请检查模型配置后重试。');
  }
  if (!selection?.provider || !selection?.model) {
    throw new VideoSummaryError('MODEL_UNCONFIGURED', '没有读取到默认模型配置。', '请在“设置 → 模型”中选择一个默认模型。');
  }
  const transcriptText = cleanText(transcript?.text ?? '');
  if (transcriptText.length < 20) {
    throw new VideoSummaryError('NO_TRANSCRIPT', '没有足够的文本可供总结。', '请提供字幕、讲稿或开启语音转写。');
  }
  const isEnglish = language === 'en';
  const metadata = metadataBlock(source);
  let material;
  if (transcriptText.length <= DIRECT_TRANSCRIPT_CHARS) {
    onProgress?.({ stage: 'summary', message: isEnglish ? 'Analyzing the transcript…' : '正在分析转写文本…', progress: 0.15 });
    material = truncate(transcriptText, DIRECT_TRANSCRIPT_CHARS);
  } else {
    const chunks = splitTranscript(transcriptText, CHUNK_TRANSCRIPT_CHARS);
    const notes = [];
    for (let index = 0; index < chunks.length; index += 1) {
      if (signal?.aborted) throw new VideoSummaryError('ABORTED', isEnglish ? 'Cancelled.' : '已取消。');
      onProgress?.({
        stage: 'summary',
        message: isEnglish
          ? `Compressing long transcript (${index + 1}/${chunks.length})…`
          : `长文本分段压缩（${index + 1}/${chunks.length}）…`,
        progress: 0.1 + (0.45 * index) / Math.max(1, chunks.length),
      });
      const notePrompt = isEnglish
        ? `Video metadata:\n${metadata}\n\nTranscript segment ${index + 1}/${chunks.length}:\n${chunks[index]}\n\n` +
          'Extract dense factual notes for later synthesis: main claims, concrete examples, numbers, named entities, and approximate timestamps. Keep under 900 words. Plain text only.'
        : `视频信息：\n${metadata}\n\n转写文本第 ${index + 1}/${chunks.length} 段：\n${chunks[index]}\n\n` +
          '请为后续汇总提取高密度事实笔记：主要观点、具体例子、数字、专有名词和大致时间点。控制在 900 字以内，直接输出纯文本。';
      const note = await callModel({
        llm,
        selection,
        system: isEnglish ? SYSTEM_EN : SYSTEM_ZH,
        prompt: notePrompt,
        maxTokens: 1600,
        signal,
        temperature: 0.2,
      });
      notes.push(note.trim());
    }
    material = notes.map((note, index) => `### 分段 ${index + 1}\n${note}`).join('\n\n');
    if (isEnglish) material = material.replace(/### 分段/g, '### Segment');
    onProgress?.({ stage: 'summary', message: isEnglish ? 'Synthesizing the final summary…' : '正在合成最终总结…', progress: 0.6 });
  }

  const outputPrompt = isEnglish
    ? buildEnglishPrompt(metadata, material, transcript?.source)
    : buildChinesePrompt(metadata, material, transcript?.source);
  const raw = await callModel({
    llm,
    selection,
    system: isEnglish ? SYSTEM_EN : SYSTEM_ZH,
    prompt: outputPrompt,
    maxTokens: 4200,
    signal,
    temperature: 0.25,
  });
  onProgress?.({ stage: 'summary', message: isEnglish ? 'Normalizing the structured result…' : '正在整理结构化结果…', progress: 0.9 });
  let parsed = parseStructuredSummary(raw, isEnglish);
  if (parsed.unstructured) {
    // The model ignored the JSON contract. Ask once more, this time pinning the
    // reply to a single JSON object and dropping temperature, before falling back
    // to the raw dump that produces an unusable Word document.
    onProgress?.({ stage: 'summary', message: isEnglish ? 'Retrying as strict JSON…' : '模型输出不是合法 JSON，正在重试…', progress: 0.95 });
    const repairPrompt = `${outputPrompt}\n\n${
      isEnglish
        ? 'IMPORTANT: your previous reply was not valid JSON. Reply with exactly one JSON object now — no prose, no markdown fences.'
        : '重要：上一次回复不是合法 JSON。现在只输出一个 JSON 对象，不要任何解释文字，不要 Markdown 代码围栏。'
    }`;
    try {
      const retryRaw = await callModel({
        llm,
        selection,
        system: isEnglish ? SYSTEM_EN : SYSTEM_ZH,
        prompt: repairPrompt,
        maxTokens: 4200,
        signal,
        temperature: 0,
      });
      parsed = parseStructuredSummary(retryRaw, isEnglish);
    } catch {
      // Keep the first (unstructured) result when the retry itself fails.
    }
  }
  parsed.oneLine = cleanLine(parsed.oneLine);
  parsed.overview = cleanParagraph(parsed.overview);
  parsed.keyPoints = cleanList(parsed.keyPoints, 10);
  parsed.chapters = cleanChapters(parsed.chapters);
  parsed.quotes = cleanList(parsed.quotes, 6);
  parsed.takeaways = cleanList(parsed.takeaways, 8);
  parsed.wordCount = countVisibleChars(parsed.overview) + parsed.keyPoints.reduce((sum, item) => sum + countVisibleChars(item), 0);
  return parsed;
}

function metadataBlock(source) {
  const lines = [
    `标题：${source.title || '未命名视频'}`,
    source.author ? `作者/频道：${source.author}` : '',
    source.duration ? `时长：${formatDuration(source.duration)}` : '',
    source.publishedAt ? `发布时间：${source.publishedAt}` : '',
    `链接：${source.sourceUrl}`,
    source.description ? `简介：${truncate(source.description, 1200)}` : '',
  ];
  return lines.filter(Boolean).join('\n');
}

function splitTranscript(text, chunkSize) {
  const paragraphs = text.split(/\n+/);
  const chunks = [];
  let current = '';
  for (const paragraph of paragraphs) {
    if (current.length > 0 && current.length + paragraph.length + 1 > chunkSize) {
      chunks.push(current);
      current = '';
    }
    if (paragraph.length > chunkSize) {
      for (let offset = 0; offset < paragraph.length; offset += chunkSize) {
        const piece = paragraph.slice(offset, offset + chunkSize);
        if (current.length > 0) {
          chunks.push(current);
          current = '';
        }
        chunks.push(piece);
      }
    } else {
      current += (current ? '\n' : '') + paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text];
}

async function callModel(options) {
  const { llm, selection, system, prompt, maxTokens, signal, temperature } = options;
  let output = '';
  try {
    const stream = llm.stream({
      provider: selection.provider,
      model: selection.model,
      system,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      maxTokens,
      temperature,
      signal,
    });
    for await (const chunk of stream) {
      if (chunk.type === 'text-delta') output += chunk.text;
      if (chunk.type === 'finish') {
        if (chunk.reason?.kind === 'error') {
          throw new VideoSummaryError(
            'LLM_ERROR',
            `模型调用失败：${chunk.reason.failure?.message ?? '未知错误'}`,
            '请检查模型账户余额和网络后重试。',
          );
        }
        if (chunk.reason?.kind === 'aborted') {
          throw new VideoSummaryError('ABORTED', '生成已取消。');
        }
      }
    }
  } catch (error) {
    if (error instanceof VideoSummaryError) throw error;
    throw new VideoSummaryError(
      'LLM_ERROR',
      `模型调用失败：${error instanceof Error ? error.message : String(error)}`,
      '请检查模型配置、账户余额和网络后重试。',
    );
  }
  const text = output.trim();
  if (!text) throw new VideoSummaryError('LLM_EMPTY', '模型没有返回总结内容。', '请重试，或换一个默认模型。');
  return text;
}

function buildChinesePrompt(metadata, material, transcriptSource) {
  return `请根据以下材料生成一份中文视频总结。

视频信息：
${metadata}

内容来源：${sourceLabel(transcriptSource)}
转写/字幕文本：
${material}

请严格输出以下 JSON 对象，不要输出任何其他内容：
{
  "oneLine": "一句话总结，40-90 字，抓住视频的核心结论",
  "overview": "300-700 字的连贯概述，说明视频讨论了什么、如何展开、结论是什么",
  "keyPoints": ["5-8 条核心要点，每条 20-60 字，信息密度高"],
  "chapters": [
    {"time": "00:00", "title": "章节标题", "summary": "该章节讲了什么，40-100 字"}
  ],
  "quotes": ["最多 5 条原文金句；如果没有值得引用的原话就返回空数组"],
  "takeaways": ["3-5 条可执行的启发或结论"]
}

要求：
1. 只使用材料中的信息，不补充外部事实，不编造数字、人名或引语。
2. chapters 按时间顺序，尽量覆盖视频的主要阶段；无法判断时间时用 "00:00"。
3. 如果材料是机器转写，可修正明显错别字，但不要改变含义。
4. 所有字段都必须存在；没有内容时用空数组或空字符串。`;
}

function buildEnglishPrompt(metadata, material, transcriptSource) {
  return `Create an English summary of the video below.

Video metadata:
${metadata}

Content source: ${sourceLabel(transcriptSource)}
Transcript / captions:
${material}

Return exactly one JSON object and nothing else:
{
  "oneLine": "One-sentence summary, 20-50 words, naming the core conclusion",
  "overview": "A coherent 180-400 word overview: what the video covers, how it develops, and what it concludes",
  "keyPoints": ["5-8 dense key points, 10-30 words each"],
  "chapters": [
    {"time": "00:00", "title": "Chapter title", "summary": "What this chapter covers, 20-50 words"}
  ],
  "quotes": ["Up to 5 verbatim quotations; use an empty array when none are worth quoting"],
  "takeaways": ["3-5 actionable conclusions"]
}

Rules:
1. Use only the supplied material. Do not add outside facts or invent numbers, names, or quotations.
2. Order chapters chronologically and cover the main phases; use "00:00" when timing is unknown.
3. Correct obvious machine-transcription errors without changing meaning.
4. Every field must be present; use an empty array or string when there is nothing to report.`;
}

function parseStructuredSummary(raw, isEnglish) {
  let text = String(raw ?? '').trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const candidate = text.slice(start, end + 1);
    try {
      const parsed = JSON.parse(candidate);
      return {
        oneLine: stringOr(parsed.oneLine, ''),
        overview: stringOr(parsed.overview, ''),
        keyPoints: arrayOr(parsed.keyPoints),
        chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [],
        quotes: arrayOr(parsed.quotes),
        takeaways: arrayOr(parsed.takeaways),
      };
    } catch {
      // Fall through to a readable fallback.
    }
  }
  return {
    oneLine: isEnglish ? 'The model returned an unstructured summary.' : '模型返回了非结构化总结。',
    overview: text,
    keyPoints: [],
    chapters: [],
    quotes: [],
    takeaways: [],
    unstructured: true,
  };
}

function stringOr(value, fallback) {
  return typeof value === 'string' ? value : fallback;
}

function arrayOr(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function cleanLine(value) {
  return cleanText(value).replace(/\s+/g, ' ').slice(0, 300);
}

function cleanParagraph(value) {
  return cleanText(value).slice(0, 5000);
}

function cleanList(value, max) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const text = cleanText(item).replace(/^[-*•\d.\s]+/, '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text.slice(0, 500));
    if (out.length >= max) break;
  }
  return out;
}

function cleanChapters(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((chapter) => ({
      time: cleanText(chapter?.time ?? '00:00').slice(0, 20),
      title: cleanText(chapter?.title ?? '').slice(0, 120),
      summary: cleanText(chapter?.summary ?? '').slice(0, 800),
    }))
    .filter((chapter) => chapter.title || chapter.summary)
    .slice(0, 20);
}

function countVisibleChars(value) {
  return String(value ?? '').replace(/\s+/g, '').length;
}

function sourceLabel(source) {
  switch (source) {
    case 'bilibili-captions':
      return 'B 站公开字幕';
    case 'youtube-captions':
      return 'YouTube 字幕';
    case 'page-captions':
      return '网页字幕';
    case 'page-jsonld':
      return '网页结构化转录';
    case 'speech-to-text':
      return '本地语音识别转写';
    case 'manual':
      return '用户手动提供的转录';
    default:
      return '自动提取的文本';
  }
}
