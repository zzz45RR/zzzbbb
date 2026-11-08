/** Shared, dependency-free helpers for the video summary Host plugin. */

export class VideoSummaryError extends Error {
  /**
   * @param {string} code stable machine code consumed by the Client panel
   * @param {string} message user-facing diagnosis
   * @param {string} [hint] concrete next step
   */
  constructor(code, message, hint) {
    super(message);
    this.name = 'VideoSummaryError';
    this.code = code;
    this.hint = hint;
  }

  toJSON() {
    return { code: this.code, message: this.message, ...(this.hint ? { hint: this.hint } : {}) };
  }
}

export const DEFAULT_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.7',
  accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
};

export function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeUrl(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) throw new VideoSummaryError('INVALID_URL', '请输入视频链接。', '例如：https://www.bilibili.com/video/BV1xx411c7mD');
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (!isHttpUrl(withScheme)) throw new VideoSummaryError('INVALID_URL', '只支持 http 或 https 链接。');
  return withScheme;
}

export function linkAbortSignal(signal, timeoutMs) {
  const signals = [];
  if (signal) signals.push(signal);
  if (timeoutMs && timeoutMs > 0) signals.push(AbortSignal.timeout(timeoutMs));
  if (signals.length === 0) return undefined;
  if (signals.length === 1) return signals[0];
  return AbortSignal.any(signals);
}

export function isAbortError(error) {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

export function abortMessage(error) {
  return error instanceof Error && error.name === 'TimeoutError' ? '请求超时' : '操作已取消';
}

export async function fetchText(url, options = {}) {
  const {
    headers = {},
    signal,
    timeoutMs = 30000,
    maxBytes = 8 * 1024 * 1024,
    method = 'GET',
    body,
  } = options;
  let response;
  try {
    response = await fetch(url, {
      method,
      body,
      redirect: 'follow',
      headers: { ...DEFAULT_HEADERS, ...headers },
      signal: linkAbortSignal(signal, timeoutMs),
    });
  } catch (error) {
    if (isAbortError(error)) throw new VideoSummaryError('NETWORK_TIMEOUT', abortMessage(error), '请检查网络后重试。');
    throw new VideoSummaryError('NETWORK_FAILED', `无法访问 ${hostOf(url)}：${error instanceof Error ? error.message : String(error)}`, '请确认链接可公开访问，或稍后重试。');
  }
  if (!response.ok) {
    throw new VideoSummaryError('HTTP_ERROR', `${hostOf(url)} 返回 HTTP ${response.status}。`, '页面可能需要登录或已失效。');
  }
  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (contentLength > maxBytes) throw new VideoSummaryError('PAGE_TOO_LARGE', '页面内容过大，无法读取。');
  const text = await response.text();
  if (text.length > maxBytes) throw new VideoSummaryError('PAGE_TOO_LARGE', '页面内容过大，无法读取。');
  return { text, response, finalUrl: response.url || url, contentType: response.headers.get('content-type') ?? '' };
}

export async function fetchJson(url, options = {}) {
  const { text, response, finalUrl } = await fetchText(url, {
    ...options,
    headers: { accept: 'application/json, text/plain, */*', ...(options.headers ?? {}) },
  });
  try {
    return { data: JSON.parse(text), response, finalUrl };
  } catch {
    throw new VideoSummaryError('INVALID_RESPONSE', `${hostOf(url)} 返回了无法解析的数据。`);
  }
}

export async function fetchBuffer(url, options = {}) {
  const {
    headers = {},
    signal,
    timeoutMs = 300000,
    maxBytes = 120 * 1024 * 1024,
    onProgress,
  } = options;
  let response;
  try {
    response = await fetch(url, {
      redirect: 'follow',
      headers: { ...DEFAULT_HEADERS, ...headers },
      signal: linkAbortSignal(signal, timeoutMs),
    });
  } catch (error) {
    if (isAbortError(error)) throw new VideoSummaryError('DOWNLOAD_TIMEOUT', abortMessage(error), '音频下载超时，请稍后重试。');
    throw new VideoSummaryError('DOWNLOAD_FAILED', `媒体下载失败：${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) {
    throw new VideoSummaryError('DOWNLOAD_HTTP', `媒体服务器返回 HTTP ${response.status}。`, '该视频可能需要登录、会员或已失效。');
  }
  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (contentLength > maxBytes) {
    throw new VideoSummaryError('MEDIA_TOO_LARGE', `音频约 ${formatBytes(contentLength)}，超过本插件限制。`, '可粘贴字幕后重试，或在配置中提高上限。');
  }
  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    return { buffer, contentType: response.headers.get('content-type') ?? '', finalUrl: response.url || url };
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      const chunk = Buffer.from(value);
      total += chunk.length;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new VideoSummaryError('MEDIA_TOO_LARGE', `音频超过 ${formatBytes(maxBytes)} 限制。`, '可粘贴字幕后重试。');
      }
      chunks.push(chunk);
      onProgress?.(total, contentLength || undefined);
    }
  } catch (error) {
    if (error instanceof VideoSummaryError) throw error;
    if (isAbortError(error)) throw new VideoSummaryError('DOWNLOAD_TIMEOUT', abortMessage(error), '音频下载超时，请稍后重试。');
    throw new VideoSummaryError('DOWNLOAD_FAILED', `下载音频失败：${error instanceof Error ? error.message : String(error)}`);
  }
  return {
    buffer: Buffer.concat(chunks, total),
    contentType: response.headers.get('content-type') ?? '',
    finalUrl: response.url || url,
  };
}

export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '远程服务器';
  }
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

export function timestampLabel(seconds) {
  return formatDuration(seconds).replace(/^(\d):/, '0$1:');
}

export function parseTimestamp(value) {
  const parts = String(value).trim().replace(',', '.').split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

export function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp|hellip|mdash|ndash|middot);/gi, (match, entity) => {
      const lower = entity.toLowerCase();
      if (lower === 'amp') return '&';
      if (lower === 'lt') return '<';
      if (lower === 'gt') return '>';
      if (lower === 'quot') return '"';
      if (lower === 'apos') return "'";
      if (lower === 'nbsp') return ' ';
      if (lower === 'hellip') return '…';
      if (lower === 'mdash' || lower === 'ndash') return '—';
      if (lower === 'middot') return '·';
      if (lower.startsWith('#x')) return String.fromCodePoint(Number.parseInt(lower.slice(2), 16) || 32);
      if (lower.startsWith('#')) return String.fromCodePoint(Number.parseInt(lower.slice(1), 10) || 32);
      return match;
    });
}

export function stripTags(value) {
  return decodeHtmlEntities(String(value).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '));
}

export function cleanText(value) {
  return decodeHtmlEntities(String(value ?? ''))
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function truncate(value, maxChars) {
  const text = String(value ?? '');
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n…（内容过长，已截断）`;
}

export function metaContent(html, keys) {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(html);
      if (match?.[1]) return decodeHtmlEntities(match[1]).trim();
    }
  }
  return '';
}

export function pageTitle(html) {
  const meta = metaContent(html, ['og:title', 'twitter:title']);
  if (meta) return meta;
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  return title ? stripTags(title).trim() : '';
}

export function extractJsonAfter(html, marker) {
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return undefined;
  const start = html.indexOf('{', markerIndex + marker.length);
  if (start < 0) return undefined;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i += 1) {
    const char = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}

export function parseIsoDuration(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i.exec(String(value ?? ''));
  if (!match) return undefined;
  return Number(match[1] ?? 0) * 86400 + Number(match[2] ?? 0) * 3600 + Number(match[3] ?? 0) * 60 + Number(match[4] ?? 0);
}

export function pad2(value) {
  return String(value).padStart(2, '0');
}

export function localStamp(date = new Date()) {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}-${pad2(date.getHours())}${pad2(date.getMinutes())}`;
}

export function safeFileName(value, fallback = '视频总结') {
  const cleaned = String(value ?? '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 60);
  return cleaned || fallback;
}

export function extractUrlFromText(value) {
  const match = String(value ?? '').match(/https?:\/\/[^\s<>"'）)]+/i);
  return match?.[0] ?? '';
}
