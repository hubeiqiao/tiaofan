import type {Anime} from '@/lib/types';

type CatalogLocale = 'zh' | 'en' | 'ja';
type CatalogFact = {kind: 'format' | 'episodes' | 'year'; label: string; description?: string};
type CatalogCardFactsProps = {anime: Anime; locale: CatalogLocale; formatLabel?: string};

// Only known source format values become metadata. Never promote source tags,
// an inferred viewing state, or an unrecognized fallback string into a fact.
const formats: Record<string, Record<CatalogLocale, string>> = {
  tv: {zh: '电视动画', en: 'TV anime', ja: 'TVアニメ'},
  web: {zh: '网络动画', en: 'Web anime', ja: 'Webアニメ'},
  ova: {zh: 'OVA', en: 'OVA', ja: 'OVA'},
  oad: {zh: 'OAD', en: 'OAD', ja: 'OAD'},
  movie: {zh: '剧场版', en: 'Movie', ja: '劇場版'},
  special: {zh: '特别篇', en: 'Special', ja: '特別編'},
  music: {zh: '音乐短片', en: 'Music video', ja: 'ミュージックビデオ'},
};
const formatAliases: Record<string, string> = {
  tv: 'tv', '电视动画': 'tv', 'tvアニメ': 'tv',
  web: 'web', ona: 'web', '网络动画': 'web', 'webアニメ': 'web',
  ova: 'ova', '原创影像': 'ova', oad: 'oad', '附赠动画': 'oad',
  movie: 'movie', '剧场版': 'movie', '电影': 'movie', '劇場版': 'movie',
  special: 'special', '特别篇': 'special', '特別編': 'special',
  music: 'music', '音乐短片': 'music',
};

/** Preserve source precision without inventing a day, season, or airing state. */
export function catalogPremiereYear(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const date = value.trim();
  const match = date.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?|-Q([1-4]))?$/i);
  if (!match || Number(match[1]) < 1) return null;
  const [, year, month, day] = match;
  if (month && (Number(month) < 1 || Number(month) > 12)) return null;
  if (day) {
    const checked = new Date(`${year}-${month}-${day}T00:00:00Z`);
    if (!Number.isFinite(checked.getTime()) || checked.toISOString().slice(0, 10) !== date) return null;
  }
  return year;
}

/** Pure presentation of fields already carried by the source-backed Anime. */
export function catalogCardFacts({anime, locale, formatLabel}: CatalogCardFactsProps): CatalogFact[] {
  const result: CatalogFact[] = [];
  const rawFormat = typeof anime.format === 'string' ? anime.format.trim().toLowerCase() : '';
  const key = Object.hasOwn(formatAliases, rawFormat) ? formatAliases[rawFormat] : undefined;
  if (key) result.push({kind: 'format', label: formatLabel?.trim() || formats[key][locale]});
  if (typeof anime.episodes === 'number' && Number.isSafeInteger(anime.episodes) && anime.episodes > 0) {
    const count = anime.episodes.toLocaleString(locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US');
    result.push({kind: 'episodes',
      label: locale === 'zh' ? `${count}集` : locale === 'ja' ? `${count}話` : `${count} ${anime.episodes === 1 ? 'ep' : 'eps'}`,
      description: locale === 'zh' ? `来源列出 ${count} 集` : locale === 'ja' ? `出典に記載された話数：${count}` : `Listed episodes: ${count}`,
    });
  }
  const year = catalogPremiereYear(anime.date);
  if (year) result.push({kind: 'year', label: year,
    description: locale === 'zh' ? `首播年份：${year}` : locale === 'ja' ? `公開年：${year}` : `Premiere year: ${year}`,
  });
  return result;
}

export function CatalogCardFacts(props: CatalogCardFactsProps) {
  const facts = catalogCardFacts(props);
  if (!facts.length) return null;
  return <p className="catalog-card-facts">{facts.map((fact, index) =>
    <span className="catalog-card-fact" data-fact={fact.kind} key={fact.kind}>
      {index > 0 && <span className="catalog-fact-separator" aria-hidden="true">·</span>}
      <span title={fact.description}>{fact.description ? <>
        <span aria-hidden="true">{fact.label}</span>
        <span className="catalog-fact-description sr-only">{fact.description}</span>
      </> : fact.label}</span>
    </span>,
  )}</p>;
}
