/** Resolve a public video page into metadata plus a transcript or a decodable audio URL. */

import {
  VideoSummaryError,
  cleanText,
  decodeHtmlEntities,
  extractJsonAfter,
  fetchBuffer,
  fetchJson,
  fetchText,
  formatDuration,
  hostOf,
  metaContent,
  normalizeUrl,
  pageTitle,
  parseIsoDuration,
  parseTimestamp,
  stripTags,
  timestampLabel,
  truncate,
} from './util.js';

const BILIBILI_HOST = /(^|\.)bilibili\.com$/i;
const BILIBILI_SHORT_HOST = /(^|\.)b23\.tv$/i;
const YOUTUBE_HOST = /(^|\.)(youtube\.com|youtu\.be)$/i;
const MEDIA_EXTENSION = /\.(mp4|m4a|m4s|mov|m4v)(?:$|[?#])/i;

export async function resolveVideoSource(rawUrl, options = {}) {
  const signal = options.signal;
  const url = normalizeUrl(rawUrl);
  if (BILIBILI_SHORT_HOST.test(new URL(url).hostname)) {
    const resolved = await resolveShortLink(url, signal);
    return dispatch(resolved, options);
  }
  return dispatch(url, options);
}

async function dispatch(url, options) {
  const parsed = new URL(url);
  if (BILIBILI_HOST.test(parsed.hostname)) return resolveBilibili(url, options);
  if (YOUTUBE_HOST.test(parsed.hostname)) return resolveYouTube(url, options);
  return resolveGeneric(url, options);
}

async function resolveShortLink(url, signal) {
  const { finalUrl } = await fetchText(url, { signal, timeoutMs: 20000, maxBytes: 2 * 1024 * 1024 });
  return finalUrl;
}

export async function resolveBilibili(url, options = {}) {
  const { signal } = options;
  const parsed = new URL(url);
  const bvid = /(BV[0-9A-Za-z]{10})/.exec(parsed.pathname)?.[1];
  if (!bvid) {
    throw new VideoSummaryError(
      'UNSUPPORTED_BILIBILI_URL',
      '没有从链接中识别到 BV 号。',
      '请使用形如 https://www.bilibili.com/video/BV1xx411c7mD 的链接。',
    );
  }
  const wantedPage = Math.max(1, Number.parseInt(parsed.searchParams.get('p') ?? '1', 10) || 1);
  const apiHeaders = { referer: `https://www.bilibili.com/video/${bvid}` };
  const view = await fetchJson(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
    signal,
    headers: apiHeaders,
  });
  if (view.data?.code !== 0 || !view.data?.data) {
    throw new VideoSummaryError('BILIBILI_API', `B 站接口返回错误：${view.data?.message ?? '未知错误'}`, '视频可能已删除、仅会员可见或需要登录。');
  }
  const data = view.data.data;
  const pages = Array.isArray(data.pages) ? data.pages : [];
  const page = pages.find((item) => Number(item.page) === wantedPage) ?? pages[0];
  if (!page?.cid) throw new VideoSummaryError('BILIBILI_PAGE', '找不到该视频的分 P 信息。');
  const title = pages.length > 1 ? `${data.title} · P${page.page} ${page.part}` : data.title;
  const duration = Number(page.duration || data.duration || 0);
  const base = {
    kind: 'bilibili',
    sourceUrl: `https://www.bilibili.com/video/${bvid}/?p=${page.page}`,
    title: cleanText(title) || bvid,
    author: cleanText(data.owner?.name ?? ''),
    duration,
    description: cleanText(data.desc ?? ''),
    cover: data.pic ?? '',
    publishedAt: data.pubdate ? new Date(data.pubdate * 1000).toISOString() : undefined,
    language: 'zh',
    asrSupported: true,
    transcript: null,
    media: null,
    subtitleHint: '',
    pages: pages.map((item) => ({ page: item.page, part: item.part, duration: item.duration, cid: item.cid })),
  };

  const subtitle = await readBilibiliSubtitles(bvid, page.cid, signal);
  if (subtitle) {
    base.transcript = subtitle;
    base.subtitleHint = '';
    return base;
  }
  base.subtitleHint = 'B 站字幕接口未公开返回字幕（通常需要登录）。将尝试下载音频并本地转写。';
  if (options.skipMedia) return base;

  const play = await fetchJson(
    `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${page.cid}&fnval=16&qn=64&fourk=1`,
    { signal, headers: apiHeaders, timeoutMs: 30000 },
  );
  if (play.data?.code !== 0 || !play.data?.data) {
    throw new VideoSummaryError(
      'BILIBILI_PLAYURL',
      `无法获取视频音频：${play.data?.message ?? '未知错误'}`,
      '该视频可能需要登录、会员或已下架；也可以展开“手动转录”粘贴文稿。',
    );
  }
  const audios = Array.isArray(play.data.data.dash?.audio) ? play.data.data.dash.audio : [];
  if (audios.length === 0) {
    throw new VideoSummaryError('BILIBILI_NO_AUDIO', '该视频没有可读取的音频流。', '可以展开“手动转录”粘贴文稿。');
  }
  const sorted = [...audios].sort((a, b) => Number(a.bandwidth ?? 0) - Number(b.bandwidth ?? 0));
  const chosen = sorted.find((item) => Number(item.bandwidth ?? 0) >= 96000) ?? sorted[0];
  const mediaUrl = chosen.baseUrl || chosen.base_url;
  if (!mediaUrl) throw new VideoSummaryError('BILIBILI_NO_AUDIO', '音频地址为空。');
  base.media = {
    url: mediaUrl,
    headers: {
      ...apiHeaders,
      origin: 'https://www.bilibili.com',
      accept: '*/*',
    },
    contentType: 'audio/mp4',
  };
  return base;
}

async function readBilibiliSubtitles(bvid, cid, signal) {
  let payload;
  try {
    const response = await fetchJson(
      `https://api.bilibili.com/x/player/v2?bvid=${bvid}&cid=${cid}`,
      {
        signal,
        headers: { referer: `https://www.bilibili.com/video/${bvid}` },
        timeoutMs: 20000,
      },
    );
    payload = response.data;
  } catch {
    return null;
  }
  if (payload?.code !== 0) return null;
  const tracks = payload.data?.subtitle?.subtitles;
  if (!Array.isArray(tracks) || tracks.length === 0) return null;
  const rank = (track) => {
    const lang = String(track.lan ?? '').toLowerCase();
    if (lang.startsWith('zh')) return 0;
    if (lang.startsWith('ai-zh')) return 1;
    if (lang.startsWith('en')) return 2;
    return 3;
  };
  const track = [...tracks].sort((a, b) => rank(a) - rank(b))[0];
  const subtitleUrl = String(track.subtitle_url ?? '').startsWith('//') ? `https:${track.subtitle_url}` : track.subtitle_url;
  if (!subtitleUrl) return null;
  try {
    const response = await fetchJson(subtitleUrl, {
      signal,
      headers: { referer: `https://www.bilibili.com/video/${bvid}` },
      timeoutMs: 20000,
    });
    const body = Array.isArray(response.data?.body) ? response.data.body : [];
    const segments = body
      .map((item) => ({
        start: Number(item.from ?? 0),
        end: Number(item.to ?? 0),
        text: cleanText(item.content ?? ''),
      }))
      .filter((item) => item.text.length > 0);
    if (segments.length === 0) return null;
    return {
      source: 'bilibili-captions',
      label: track.lan_doc || track.lan || 'B 站字幕',
      segments,
      text: transcriptText(segments),
      language: String(track.lan ?? 'zh'),
    };
  } catch {
    return null;
  }
}

export async function resolveYouTube(url, options = {}) {
  const { signal } = options;
  const parsed = new URL(url);
  let videoId = parsed.searchParams.get('v') ?? '';
  if (!videoId && /youtu\.be$/i.test(parsed.hostname)) videoId = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
  if (!videoId && /\/shorts\//i.test(parsed.pathname)) videoId = parsed.pathname.split('/').filter(Boolean)[1] ?? '';
  if (!/^[0-9A-Za-z_-]{6,20}$/.test(videoId)) {
    throw new VideoSummaryError('UNSUPPORTED_YOUTUBE_URL', '没有从链接中识别到 YouTube 视频 ID。');
  }
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let page;
  try {
    page = await fetchText(watchUrl, {
      signal,
      timeoutMs: 30000,
      headers: { cookie: 'CONSENT=YES+1', accept: 'text/html,application/xhtml+xml' },
      maxBytes: 12 * 1024 * 1024,
    });
  } catch (error) {
    if (error instanceof VideoSummaryError) {
      throw new VideoSummaryError(
        'YOUTUBE_NETWORK',
        `无法读取 YouTube 页面：${error.message}`,
        '当前网络可能无法直连 YouTube；可展开“手动转录”粘贴字幕后生成。',
      );
    }
    throw error;
  }
  const player = extractJsonAfter(page.text, 'ytInitialPlayerResponse');
  if (!player) {
    throw new VideoSummaryError('YOUTUBE_PARSE', 'YouTube 页面结构无法识别。', '可以展开“手动转录”粘贴字幕。');
  }
  const details = player.videoDetails ?? {};
  const microformat = player.microformat?.playerMicroformatRenderer ?? {};
  const base = {
    kind: 'youtube',
    sourceUrl: watchUrl,
    title: cleanText(details.title ?? microformat.title?.simpleText ?? pageTitle(page.text)) || videoId,
    author: cleanText(details.author ?? microformat.ownerChannelName ?? ''),
    duration: Number(details.lengthSeconds ?? 0),
    description: cleanText(details.shortDescription ?? microformat.description?.simpleText ?? ''),
    cover: Array.isArray(details.thumbnail?.thumbnails)
      ? details.thumbnail.thumbnails.at(-1)?.url ?? ''
      : '',
    publishedAt: microformat.publishDate ?? microformat.uploadDate ?? undefined,
    language: 'en',
    asrSupported: false,
    transcript: null,
    media: null,
    subtitleHint: '',
  };

  const tracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (Array.isArray(tracks) && tracks.length > 0) {
    const preferred = chooseYouTubeTrack(tracks);
    if (preferred?.baseUrl) {
      try {
        const captionUrl = new URL(preferred.baseUrl);
        captionUrl.searchParams.set('fmt', 'json3');
        const response = await fetchText(captionUrl.toString(), {
          signal,
          timeoutMs: 20000,
          headers: { referer: watchUrl },
          maxBytes: 5 * 1024 * 1024,
        });
        const json = JSON.parse(response.text);
        const segments = [];
        for (const event of Array.isArray(json.events) ? json.events : []) {
          if (!Array.isArray(event.segs)) continue;
          const text = cleanText(event.segs.map((seg) => seg.utf8 ?? '').join(''));
          if (!text) continue;
          segments.push({
            start: Number(event.tStartMs ?? 0) / 1000,
            end: (Number(event.tStartMs ?? 0) + Number(event.dDurationMs ?? 0)) / 1000,
            text,
          });
        }
        if (segments.length > 0) {
          base.transcript = {
            source: 'youtube-captions',
            label: preferred.name?.simpleText || preferred.languageCode || 'YouTube 字幕',
            segments,
            text: transcriptText(segments),
            language: preferred.languageCode ?? 'en',
          };
          return base;
        }
      } catch {
        // Fall through to the explicit transcript fallback.
      }
    }
  }
  base.subtitleHint = '该 YouTube 页面没有可匿名读取的字幕；插件不会尝试下载 YouTube 音频。';
  return base;
}

function chooseYouTubeTrack(tracks) {
  const rank = (track) => {
    const lang = String(track.languageCode ?? '').toLowerCase();
    if (lang.startsWith('zh')) return 0;
    if (lang.startsWith('en')) return 1;
    return 2;
  };
  return [...tracks].sort((a, b) => rank(a) - rank(b))[0];
}

export async function resolveGeneric(url, options = {}) {
  const { signal } = options;
  const direct = MEDIA_EXTENSION.test(new URL(url).pathname);
  if (direct) {
    const parsed = new URL(url);
    const fileName = decodeURIComponent(parsed.pathname.split('/').pop() ?? '视频');
    return {
      kind: 'direct',
      sourceUrl: url,
      title: cleanText(fileName.replace(/\.[^.]+$/, '')) || '视频',
      author: hostOf(url),
      duration: 0,
      description: '',
      cover: '',
      language: 'zh',
      asrSupported: true,
      transcript: null,
      media: { url, headers: { accept: '*/*' }, contentType: parsed.pathname.endsWith('.m4a') ? 'audio/mp4' : 'video/mp4' },
      subtitleHint: '直接媒体链接，将通过本地语音识别转写。',
    };
  }

  let page;
  try {
    page = await fetchText(url, {
      signal,
      timeoutMs: 30000,
      maxBytes: 12 * 1024 * 1024,
      headers: { accept: 'text/html,application/xhtml+xml' },
    });
  } catch (error) {
    if (error instanceof VideoSummaryError) {
      throw new VideoSummaryError(
        'PAGE_NETWORK',
        `无法读取网页：${error.message}`,
        '请确认链接可公开访问，或展开“手动转录”粘贴文稿。',
      );
    }
    throw error;
  }

  const html = page.text;
  const finalUrl = page.finalUrl || url;
  const jsonLd = findVideoJsonLd(html);
  const htmlTitle = pageTitle(html);
  const description =
    metaContent(html, ['og:description', 'description', 'twitter:description']) ||
    stringValue(jsonLd?.description) ||
    '';
  const title = metaContent(html, ['og:title', 'twitter:title']) || stringValue(jsonLd?.name) || htmlTitle || hostOf(finalUrl);
  const cover =
    metaContent(html, ['og:image', 'twitter:image']) ||
    (Array.isArray(jsonLd?.thumbnailUrl) ? jsonLd.thumbnailUrl[0] : stringValue(jsonLd?.thumbnailUrl)) ||
    '';
  const author =
    metaContent(html, ['author', 'og:site_name']) ||
    stringValue(jsonLd?.author?.name) ||
    stringValue(jsonLd?.publisher?.name) ||
    hostOf(finalUrl);
  const duration = parseIsoDuration(jsonLd?.duration) ?? 0;
  const base = {
    kind: 'web',
    sourceUrl: finalUrl,
    title: cleanText(title) || hostOf(finalUrl),
    author: cleanText(author),
    duration,
    description: cleanText(description),
    cover,
    publishedAt: stringValue(jsonLd?.uploadDate) || stringValue(jsonLd?.datePublished) || undefined,
    language: 'zh',
    asrSupported: false,
    transcript: null,
    media: null,
    subtitleHint: '',
  };

  const jsonLdTranscript = stringValue(jsonLd?.transcript);
  if (jsonLdTranscript && jsonLdTranscript.length > 160) {
    const text = cleanText(jsonLdTranscript);
    base.transcript = {
      source: 'page-jsonld',
      label: '页面结构化字幕',
      segments: [{ start: 0, end: duration, text }],
      text,
      language: 'zh',
    };
    return base;
  }

  const tracks = collectTrackElements(html, finalUrl);
  for (const track of tracks) {
    try {
      const response = await fetchText(track.url, {
        signal,
        timeoutMs: 20000,
        maxBytes: 6 * 1024 * 1024,
        headers: { referer: finalUrl, accept: 'text/vtt,text/plain,*/*' },
      });
      const segments = parseCaptionDocument(response.text);
      if (segments.length > 0) {
        base.transcript = {
          source: 'page-captions',
          label: track.label || '网页字幕',
          segments,
          text: transcriptText(segments),
          language: track.lang || 'zh',
        };
        return base;
      }
    } catch {
      // Try the next track.
    }
  }

  const videoUrl = collectVideoSource(html, finalUrl);
  if (options.skipMedia) {
    base.subtitleHint = '网页没有公开字幕；使用手动转录生成总结。';
    return base;
  }
  if (videoUrl && MEDIA_EXTENSION.test(new URL(videoUrl).pathname)) {
    base.media = { url: videoUrl, headers: { accept: '*/*', referer: finalUrl }, contentType: 'video/mp4' };
    base.asrSupported = true;
    base.subtitleHint = '网页没有公开字幕，将尝试下载视频音频并本地转写。';
    return base;
  }

  base.subtitleHint = '网页没有公开字幕，也没有可直接读取的 MP4 媒体地址。';
  throw new VideoSummaryError(
    'NO_TRANSCRIPT',
    '这个网页没有可自动读取的字幕或 MP4 音频。',
    '可以展开“手动转录”，把视频字幕或讲稿粘贴进来；插件仍会生成总结和 Word 文档。',
  );
}

function findVideoJsonLd(html) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(decodeHtmlEntities(match[1]).trim());
      const candidates = Array.isArray(parsed) ? parsed : [parsed, ...(Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [])];
      const video = candidates.find((item) => {
        const type = item?.['@type'];
        return type === 'VideoObject' || (Array.isArray(type) && type.includes('VideoObject'));
      });
      if (video) return video;
    } catch {
      // Ignore malformed structured data.
    }
  }
  return undefined;
}

function stringValue(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && typeof value.name === 'string') return value.name;
  return '';
}

function attr(attrs, name) {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([^"']*)["']`, 'i').exec(attrs);
  return match?.[1] ?? '';
}

function collectTrackElements(html, baseUrl) {
  const tracks = [];
  for (const match of html.matchAll(/<track\b([^>]*)>/gi)) {
    const attrs = match[1];
    const kind = attr(attrs, 'kind').toLowerCase();
    const src = attr(attrs, 'src');
    if (!src) continue;
    if (kind && kind !== 'captions' && kind !== 'subtitles') continue;
    let url;
    try {
      url = new URL(src, baseUrl).toString();
    } catch {
      continue;
    }
    tracks.push({
      url,
      label: attr(attrs, 'label'),
      lang: attr(attrs, 'srclang'),
    });
  }
  tracks.sort((a, b) => {
    const rank = (track) => (track.lang.toLowerCase().startsWith('zh') ? 0 : track.lang.toLowerCase().startsWith('en') ? 1 : 2);
    return rank(a) - rank(b);
  });
  return tracks;
}

function collectVideoSource(html, baseUrl) {
  for (const match of html.matchAll(/<(?:video|source)\b([^>]*)>/gi)) {
    const src = attr(match[1], 'src');
    if (!src) continue;
    try {
      const url = new URL(src, baseUrl).toString();
      if (MEDIA_EXTENSION.test(new URL(url).pathname)) return url;
    } catch {
      // Ignore malformed URLs.
    }
  }
  return '';
}

export function parseCaptionDocument(input) {
  let text = String(input ?? '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (/^\s*\{/.test(text)) {
    try {
      const json = JSON.parse(text);
      const body = Array.isArray(json.body) ? json.body : [];
      return body
        .map((item) => ({
          start: Number(item.from ?? 0),
          end: Number(item.to ?? 0),
          text: cleanText(item.content ?? ''),
        }))
        .filter((item) => item.text);
    } catch {
      // Treat it as a text caption document.
    }
  }
  const blocks = text.split(/\n{2,}/);
  const segments = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    if (/^WEBVTT\b/i.test(lines[0]) || /^NOTE\b/i.test(lines[0]) || /^STYLE\b/i.test(lines[0])) continue;
    let timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0 && lines.length > 1 && lines[0].includes('-->')) timingIndex = 0;
    if (timingIndex < 0) continue;
    const [startRaw, endRaw] = lines[timingIndex].split('-->').map((part) => part.trim().split(/\s+/)[0]);
    const content = cleanText(lines.slice(timingIndex + 1).join(' '));
    if (!content) continue;
    segments.push({ start: parseTimestamp(startRaw), end: parseTimestamp(endRaw), text: content });
  }
  const merged = [];
  for (const segment of segments) {
    const previous = merged.at(-1);
    if (previous && previous.text === segment.text) {
      previous.end = Math.max(previous.end, segment.end);
      continue;
    }
    merged.push(segment);
  }
  return merged;
}

export function transcriptText(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return '';
  return segments
    .map((segment) => {
      const stamp = timestampLabel(segment.start);
      return `[${stamp}] ${segment.text}`;
    })
    .join('\n');
}

export function manualTranscript(text, language = 'zh') {
  const cleaned = cleanText(text);
  if (cleaned.length < 40) {
    throw new VideoSummaryError('TRANSCRIPT_TOO_SHORT', '手动转录文本太短，至少需要 40 个字符。');
  }
  return {
    source: 'manual',
    label: '手动转录',
    segments: [{ start: 0, end: 0, text: cleaned }],
    text: cleaned,
    language,
  };
}

export async function downloadMedia(source, options = {}) {
  if (!source.media?.url) {
    throw new VideoSummaryError('NO_MEDIA', '这个来源没有可下载的音频。', '可以展开“手动转录”粘贴文稿。');
  }
  const { buffer, contentType } = await fetchBuffer(source.media.url, {
    signal: options.signal,
    headers: source.media.headers ?? {},
    maxBytes: options.maxBytes ?? 120 * 1024 * 1024,
    onProgress: options.onProgress,
  });
  return { buffer, contentType };
}

export function compactMetadata(source) {
  return {
    kind: source.kind,
    sourceUrl: source.sourceUrl,
    title: source.title,
    author: source.author,
    duration: source.duration,
    durationLabel: formatDuration(source.duration),
    description: truncate(source.description, 1200),
    cover: source.cover,
    publishedAt: source.publishedAt,
    transcriptSource: source.transcript?.source ?? '',
    transcriptLabel: source.transcript?.label ?? '',
    transcriptChars: source.transcript?.text?.length ?? 0,
    subtitleHint: source.subtitleHint ?? '',
  };
}
