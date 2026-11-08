/** Audio extraction and the optional local SenseVoice transcription path. */

import decodeMp4 from '../vendor/node_modules/@audio/decode-mp4/decode-mp4.js';
import { VideoSummaryError, formatDuration } from './util.js';

const TARGET_RATE = 16000;
const MAX_AUDIO_SECONDS = 60 * 60;

export async function decodeMediaAudio(buffer, options = {}) {
  let decoded;
  try {
    decoded = await decodeMp4(buffer);
  } catch (error) {
    throw new VideoSummaryError(
      'AUDIO_DECODE',
      `无法解码音频：${error instanceof Error ? error.message : String(error)}`,
      '该媒体可能不是受支持的 MP4/M4A 容器；可以展开“手动转录”粘贴文稿。',
    );
  }
  if (!decoded?.channelData?.length || !decoded.sampleRate) {
    throw new VideoSummaryError('AUDIO_DECODE', '媒体中没有可解码的音轨。', '可以展开“手动转录”粘贴文稿。');
  }
  const seconds = decoded.channelData[0].length / decoded.sampleRate;
  if (!Number.isFinite(seconds) || seconds < 1) {
    throw new VideoSummaryError('AUDIO_EMPTY', '音轨为空或过短。');
  }
  if (seconds > MAX_AUDIO_SECONDS) {
    throw new VideoSummaryError(
      'AUDIO_TOO_LONG',
      `视频音频约 ${formatDuration(seconds)}，超过 ${formatDuration(MAX_AUDIO_SECONDS)} 的转写上限。`,
      '可以粘贴文稿生成总结，或选择一个较短的视频。',
    );
  }
  options.onProgress?.({ phase: 'decoded', seconds });
  const mono = toMono(decoded.channelData);
  const resampled = resampleLinear(mono, decoded.sampleRate, TARGET_RATE);
  return {
    wav: encodeWav16(resampled, TARGET_RATE),
    seconds: resampled.length / TARGET_RATE,
    sampleRate: TARGET_RATE,
  };
}

function toMono(channels) {
  if (channels.length === 1) return channels[0];
  const length = Math.min(...channels.map((channel) => channel.length));
  const mono = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    let sum = 0;
    for (const channel of channels) sum += channel[i] ?? 0;
    mono[i] = sum / channels.length;
  }
  return mono;
}

function resampleLinear(samples, fromRate, toRate) {
  if (fromRate === toRate) return samples;
  const ratio = fromRate / toRate;
  const length = Math.max(1, Math.floor(samples.length / ratio));
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const position = i * ratio;
    const left = Math.floor(position);
    const right = Math.min(samples.length - 1, left + 1);
    const fraction = position - left;
    out[i] = (samples[left] ?? 0) * (1 - fraction) + (samples[right] ?? 0) * fraction;
  }
  return out;
}

export function encodeWav16(samples, sampleRate) {
  const dataBytes = samples.length * 2;
  const wav = Buffer.alloc(44 + dataBytes);
  wav.write('RIFF', 0, 'ascii');
  wav.writeUInt32LE(36 + dataBytes, 4);
  wav.write('WAVE', 8, 'ascii');
  wav.write('fmt ', 12, 'ascii');
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36, 'ascii');
  wav.writeUInt32LE(dataBytes, 40);
  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i] ?? 0));
    wav.writeInt16LE(Math.round(clamped * 32767), offset);
    offset += 2;
  }
  return wav;
}

export function speechStatus(speechToText, preferredId = 'video-summary-sensevoice') {
  if (!speechToText) return { available: false, ready: false, providerId: '', label: '', phase: 'unavailable' };
  try {
    const snapshot = speechToText.snapshot();
    const provider = chooseSpeechProvider(snapshot, preferredId);
    if (!provider) return { available: false, ready: false, providerId: preferredId, label: '', phase: 'no-provider' };
    const phase = provider.preparation?.phase ?? 'unprepared';
    return {
      available: true,
      ready: phase === 'ready' || phase === 'standby',
      providerId: provider.id,
      label: provider.name,
      phase,
      languages: provider.languages ?? [],
    };
  } catch {
    return { available: false, ready: false, providerId: preferredId, label: '', phase: 'unavailable' };
  }
}

function chooseSpeechProvider(snapshot, preferredId) {
  const providers = Array.isArray(snapshot?.providers) ? snapshot.providers : [];
  return (
    providers.find((provider) => provider.id === preferredId) ??
    providers.find((provider) => String(provider.id).includes('sensevoice')) ??
    providers.find((provider) => (provider.languages ?? []).some((language) => String(language).startsWith('zh'))) ??
    providers[0]
  );
}

export async function transcribeWithSpeech(speechToText, options) {
  const { wav, language = 'zh', signal, preferredId = 'video-summary-sensevoice', onProgress } = options;
  if (!speechToText) {
    throw new VideoSummaryError(
      'ASR_UNAVAILABLE',
      '本地语音识别服务未启用。',
      '可以展开“手动转录”粘贴文稿后重试。',
    );
  }
  let snapshot;
  try {
    snapshot = speechToText.snapshot();
  } catch (error) {
    throw new VideoSummaryError('ASR_UNAVAILABLE', `本地语音识别服务不可用：${error instanceof Error ? error.message : String(error)}`);
  }
  const provider = chooseSpeechProvider(snapshot, preferredId);
  if (!provider) {
    throw new VideoSummaryError(
      'ASR_NO_PROVIDER',
      '没有可用的本地语音识别器。',
      '可以展开“手动转录”粘贴文稿后重试。',
    );
  }
  const providerId = provider.id;
  let phase = provider.preparation?.phase ?? 'unprepared';
  if (phase !== 'ready' && phase !== 'standby') {
    onProgress?.({ phase: 'preparing', message: '首次使用需要准备本地语音模型（约 240 MB）。', providerId });
    const prepareSignal = AbortSignal.any([signal, AbortSignal.timeout(20 * 60 * 1000)]);
    speechToText.prepare(providerId);
    try {
      for await (const next of speechToText.follow(prepareSignal)) {
        const current = chooseSpeechProvider(next, providerId);
        const preparation = current?.preparation;
        phase = preparation?.phase ?? 'unprepared';
        if (phase === 'downloading') {
          const completed = Number(preparation.completedBytes ?? 0);
          const total = Number(preparation.totalBytes ?? 0);
          onProgress?.({
            phase: 'downloading',
            message: total > 0
              ? `正在下载语音模型 ${(completed / 1024 / 1024).toFixed(0)} / ${(total / 1024 / 1024).toFixed(0)} MB`
              : '正在下载语音模型…',
            progress: total > 0 ? Math.min(0.99, completed / total) : undefined,
          });
        } else if (phase === 'checking' || phase === 'loading' || phase === 'waking') {
          onProgress?.({ phase, message: phase === 'loading' ? '正在加载语音模型…' : '正在准备语音模型…' });
        } else if (phase === 'ready' || phase === 'standby') {
          onProgress?.({ phase: 'ready', message: '语音模型已就绪。' });
          break;
        } else if (phase === 'failed') {
          throw new VideoSummaryError(
            'ASR_PREPARE_FAILED',
            `语音模型准备失败：${preparation?.message ?? '未知错误'}`,
            '请检查网络后重试，或在插件详情中手动准备模型；也可以粘贴文稿。',
          );
        }
      }
    } catch (error) {
      if (error instanceof VideoSummaryError) throw error;
      throw new VideoSummaryError(
        'ASR_PREPARE_FAILED',
        `语音模型准备失败：${error instanceof Error ? error.message : String(error)}`,
        '可以展开“手动转录”粘贴文稿后重试。',
      );
    }
    if (phase !== 'ready' && phase !== 'standby') {
      throw new VideoSummaryError(
        'ASR_PREPARE_TIMEOUT',
        '语音模型仍未就绪。',
        '可以展开“手动转录”粘贴文稿后重试。',
      );
    }
  }
  onProgress?.({ phase: 'transcribing', message: '正在本地识别语音，可能需要几分钟…' });
  let spec;
  try {
    spec = speechToText.resolve({ audio: wav, providerId, language });
  } catch (error) {
    throw new VideoSummaryError(
      'ASR_RESOLVE',
      `无法启动语音识别：${error instanceof Error ? error.message : String(error)}`,
      '可以展开“手动转录”粘贴文稿后重试。',
    );
  }
  try {
    const transcript = await speechToText.transcribe(spec, signal);
    const text = String(transcript?.text ?? '').trim();
    if (!text) throw new VideoSummaryError('ASR_EMPTY', '语音识别没有返回文字。', '可以粘贴文稿后重试。');
    onProgress?.({ phase: 'done', message: `语音识别完成（${Math.round(transcript.audioSeconds ?? 0)} 秒音频）。` });
    return {
      text,
      audioSeconds: transcript.audioSeconds,
      inferenceSeconds: transcript.inferenceSeconds,
    };
  } catch (error) {
    if (error instanceof VideoSummaryError) throw error;
    throw new VideoSummaryError(
      'ASR_FAILED',
      `语音识别失败：${error instanceof Error ? error.message : String(error)}`,
      '可以展开“手动转录”粘贴文稿后重试。',
    );
  }
}

export { TARGET_RATE };
