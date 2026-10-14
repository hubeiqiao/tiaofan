import {siteBrand, SITE_ORIGIN, localePath} from './site-brand';
import {posterSources} from './poster-image';

/** Browser-only export. Reuse the catalog's bounded, original-source poster resolver. */
export type CollageItem = {key: string; name: string; image?: string; bgm?: number};
export type CollageLanguage = 'zh' | 'en' | 'ja';
export type CollageTheme = 'light' | 'dark';
export type CollageResult = {blob: Blob; missingArtwork: string[]};
// Keep export colors aligned with the main light/dark UI palette, without reading browser-global styles.
const PALETTES = {
  light: {background: '#f6f1e7', surface: '#fffcf5', ink: '#171b17', muted: '#6a665e', accent: '#d73728', empty: '#ede7db', gradientA: '#ede7db', gradientB: '#e2dacb', gradientEnd: '#d9d2c5', badgeInk: '#ffffff'},
  dark: {background: '#0d1010', surface: '#171b19', ink: '#f5f1e8', muted: '#b6b6ad', accent: '#ff5a3d', empty: '#232923', gradientA: '#232923', gradientB: '#323a33', gradientEnd: '#171b19', badgeInk: '#100d0b'},
} as const;
const FONTS = {zh: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif', en: 'system-ui, "Noto Sans", sans-serif', ja: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif'} as const;
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, {granularity: 'grapheme'}) : null;
function graphemes(value: string): string[] {
  return segmenter ? Array.from(segmenter.segment(value), part => part.segment) : Array.from(value);
}
export function safeCollageText(value: string, max = 180): string {
  const cleaned = String(value || '').replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim();
  let count = 0, output = '';
  for (const part of graphemes(cleaned)) {
    count += Array.from(part).length;
    if (count > max) break;
    output += part;
  }
  return output;
}
export function uniqueCollageItems(items: readonly CollageItem[]): CollageItem[] {
  const seen = new Set<string>();
  return items.filter(item => item.key && !seen.has(item.key) && !!seen.add(item.key)).slice(0, 9);
}
function loadArtworkSource(url?: string): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  try { if (!['https:', 'http:'].includes(new URL(url, window.location.href).protocol)) return Promise.resolve(null); }
  catch { return Promise.resolve(null); }
  return new Promise(resolve => {
    const image = new Image();
    const finish = (value: HTMLImageElement | null) => { clearTimeout(timeout); image.onload = null; image.onerror = null; resolve(value); };
    const timeout = setTimeout(() => { finish(null); image.src = ''; }, 12000);
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) return finish(null);
      try {
        // Check origin cleanliness before touching the final export canvas.
        const test = document.createElement('canvas'); test.width = test.height = 1;
        const context = test.getContext('2d'); if (!context) return finish(null);
        context.drawImage(image, 0, 0, 1, 1); context.getImageData(0, 0, 1, 1);
        finish(image);
      } catch { finish(null); }
    };
    image.onerror = () => finish(null);
    image.src = url;
  });
}
async function loadArtwork(item: CollageItem): Promise<HTMLImageElement | null> {
  // Historical records may carry only a public subject ID. The same official
  // lookup used by AnimePoster resolves that cover without a proxy, upload,
  // private metadata, or weakening the browser's CORS protection.
  for (const source of posterSources(item.image, item.bgm)) {
    const image = await loadArtworkSource(source);
    if (image) return image;
  }
  return null;
}
function textLines(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number, maxLines: number) {
  // Keep Latin words together and never split a combining mark or emoji sequence.
  const latin = /^[\p{Script=Latin}\p{N}\p{M}'’_-]+$/u;
  const tokens: string[] = [];
  for (const part of graphemes(safeCollageText(text))) {
    if (latin.test(part) && tokens.length && latin.test(tokens[tokens.length - 1])) tokens[tokens.length - 1] += part;
    else tokens.push(part);
  }
  const lines: string[] = []; let line = '';
  const finishLine = () => { if (line.trim()) lines.push(line.trimEnd()); line = ''; };
  for (const token of tokens) {
    if (token === ' ') { if (line) line += ' '; continue; }
    if (ctx.measureText(line + token).width <= width) { line += token; continue; }
    finishLine();
    if (ctx.measureText(token).width <= width) { line = token; continue; }
    for (const char of graphemes(token)) {
      if (line && ctx.measureText(line + char).width > width) finishLine();
      line += char;
    }
  }
  finishLine();
  lines.slice(0, maxLines).forEach((value, index) => {
    if (index === maxLines - 1 && lines.length > maxLines) {
      while (value && ctx.measureText(value + '…').width > width) value = graphemes(value).slice(0, -1).join('');
      value += '…';
    }
    ctx.fillText(value, x, y + index * lineHeight);
  });
}
export async function createShareCollage(input: readonly CollageItem[], options: {language?: CollageLanguage; title?: string; theme?: CollageTheme; invitation?: boolean} = {}): Promise<CollageResult> {
  const items = uniqueCollageItems(input);
  const language = options.language || 'zh';
  const copy = (zh: string, en: string, ja: string) => ({zh, en, ja})[language];
  const font = FONTS[language];
  const palette = PALETTES[options.theme === 'dark' ? 'dark' : 'light'];
  if (!items.length) throw new Error(copy("请先选择至少一部作品。", "Choose at least one anime.", "まず1作品以上選んでください。"));
  if (document.fonts) await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]);
  const artwork = await Promise.all(items.map(loadArtwork));
  const canvas = document.createElement('canvas'); canvas.width = 1440; canvas.height = 1800;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(copy("当前浏览器无法生成图片。", "This browser cannot create an image.", "このブラウザーでは画像を生成できません。"));
  ctx.fillStyle = palette.background; ctx.fillRect(0, 0, 1440, 1800);
  ctx.fillStyle = palette.accent; ctx.font = `600 23px ${font}`;
  ctx.fillText(copy('我的动画九宫格', 'MY ANIME NINE', '私のアニメ9選'), 60, 75);
  ctx.fillStyle = palette.ink; ctx.font = `700 64px ${font}`;
  textLines(ctx, options.title || (copy("这些动画，我真的很推荐", "Anime I wholeheartedly recommend", "心からおすすめしたいアニメ")), 60, 149, 1300, 65, 1);
  ctx.fillStyle = palette.muted; ctx.font = `400 26px ${font}`;
  ctx.fillText(copy(`${items.length} 部动画，你看过几部？`, `${items.length} picks. How many have you seen?`, `${items.length}作品のうち、何作品見た？`), 60, 202);
  const tileW = 424, tileH = 458, top = 245, gap = 24;
  const missingArtwork: string[] = [];
  for (let i = 0; i < 9; i++) {
    const x = 60 + (i % 3) * (tileW + gap), y = top + Math.floor(i / 3) * (tileH + gap);
    const item = items[i], image = artwork[i];
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, tileW, tileH, 18); ctx.clip();
    ctx.fillStyle = palette.empty; ctx.fillRect(x, y, tileW, tileH);
    if (!item) {
      ctx.fillStyle = palette.muted; ctx.font = `500 26px ${font}`; ctx.textAlign = 'center';
      textLines(ctx, copy("留给下一部心头好", "Room for a new favorite", "次のお気に入りのために"), x + tileW / 2, y + tileH / 2, tileW - 56, 34, 2);
      ctx.restore(); continue;
    }
    if (image) {
      const scale = Math.max(tileW / image.naturalWidth, 360 / image.naturalHeight);
      const sw = tileW / scale, sh = 360 / scale;
      ctx.drawImage(image, (image.naturalWidth - sw) / 2, Math.max(0, (image.naturalHeight - sh) * .32), sw, sh, x, y, tileW, 360);
    } else {
      missingArtwork.push(safeCollageText(item.name));
      const gradient = ctx.createLinearGradient(x, y, x + tileW, y + 360);
      gradient.addColorStop(0, i % 2 ? palette.gradientB : palette.gradientA); gradient.addColorStop(1, palette.gradientEnd);
      ctx.fillStyle = gradient; ctx.fillRect(x, y, tileW, 360);
      ctx.fillStyle = palette.ink; ctx.font = `600 37px ${font}`;
      textLines(ctx, item.name, x + 30, y + 114, tileW - 60, 49, 4);
      ctx.fillStyle = palette.ink; ctx.font = `400 18px ${font}`;
      textLines(ctx, copy("文字卡 · 海报暂不可导出", "TITLE CARD · ARTWORK UNAVAILABLE", "タイトルカード · ポスターは書き出せません"), x + 24, y + 310, tileW - 48, 22, 2);
    }
    ctx.fillStyle = palette.surface; ctx.fillRect(x, y + 360, tileW, tileH - 360);
    ctx.fillStyle = palette.ink; ctx.font = `600 27px ${font}`;
    textLines(ctx, item.name, x + 21, y + 399, tileW - 42, 33, 2);
    ctx.fillStyle = palette.accent; ctx.beginPath(); ctx.roundRect(x + 14, y + 14, 52, 40, 10); ctx.fill();
    ctx.fillStyle = palette.badgeInk; ctx.font = `600 23px ${font}`;
    ctx.fillText(String(i + 1).padStart(2, '0'), x + 25, y + 42);
    ctx.restore();
  }
  ctx.fillStyle = palette.accent; ctx.font = `600 30px ${font}`; ctx.fillText(siteBrand(language), 60, 1740);
  ctx.fillStyle = palette.muted; ctx.font = `500 25px ${font}`; ctx.textAlign = 'right';
  if (options.invitation !== false) ctx.fillText(copy('来挑番，做你的九宫格 →', 'Make your own on Tiaofan →', 'ティアオファンであなたの9選を →'), 1380, 1732);
  ctx.font = `400 21px ${font}`; ctx.fillText('example.invalid', 1380, options.invitation === false ? 1740 : 1766);
  ctx.textAlign = 'left'; ctx.fillStyle = palette.muted; ctx.font = `400 18px ${font}`;
  ctx.fillText(copy("个人推荐片单 · 海报版权归各自权利人所有", "Personal recommendations · Artwork belongs to its respective rights holders", "個人のおすすめリスト · ポスターの権利は各権利者に帰属します"), 60, 1776);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error(copy("PNG 导出失败，请重试。", "PNG export failed. Please try again.", "PNGの書き出しに失敗しました。もう一度お試しください。"))), 'image/png'));
  return {blob, missingArtwork};
}


/** Public invitation only: never encode the owner's identity or selections in a URL. */
export function collageShareMessage(language: CollageLanguage = 'zh', invitation = true): {title: string; text: string; url?: string} {
  const copy = (zh: string, en: string, ja: string) => ({zh, en, ja})[language];
  return {
    title: copy('我的动画九宫格', 'My anime nine', '私のアニメ9選'),
    text: copy('这 9 部动画，你看过几部？', 'My anime nine. How many have you seen?', '私のアニメ9選。何作品見た？') + (invitation ? copy(' 来挑番，做你的九宫格。', ' Make your own on Tiaofan.', ' ティアオファンであなたの9選も作ってみよう。') : ''),
    ...(invitation ? {url: SITE_ORIGIN + localePath('/', language)} : {}),
  };
}
export type CollageShareOutcome = 'returned' | 'cancelled' | 'unsupported' | 'failed';
type NativeShareTarget = {canShare?: (data: ShareData) => boolean; share?: (data: ShareData) => Promise<void>};
/** Call directly in a user click, with an already prepared File. No async work precedes share(). */
export async function shareCollageFile(file: File | null, language: CollageLanguage, target: NativeShareTarget = typeof navigator === 'undefined' ? {} : navigator, invitation = true): Promise<CollageShareOutcome> {
  if (!file || typeof target.share !== 'function' || typeof target.canShare !== 'function') return 'unsupported';
  try { if (!target.canShare({files: [file]})) return 'unsupported'; }
  catch { return 'unsupported'; }
  try {
    await target.share({...collageShareMessage(language, invitation), files: [file]});
    // Some platforms resolve when their sheet opens. This never means "sent".
    return 'returned';
  } catch (cause) {
    return cause && typeof cause === 'object' && 'name' in cause && cause.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
