/** Japanese presentation only. Keep source dates, numeric values and machine keys untouched. */
import type {Anime} from './types';
const seasons = ['冬', '春', '夏', '秋'] as const;
const movieFormats = new Set(['movie', '剧场版', '电影']);
export function japaneseFormat(value: string) {
  return ({'其他':'その他',tv:'TVアニメ','电视动画':'TVアニメ',web:'Webアニメ',ona:'Webアニメ','网络动画':'Webアニメ',ova:'OVA',oad:'OAD',movie:'劇場版','剧场版':'劇場版','电影':'劇場版',special:'特別編','特别篇':'特別編',music:'ミュージックビデオ','音乐短片':'ミュージックビデオ','原创影像':'OVA','附赠动画':'OAD'} as Record<string,string>)[value.toLowerCase()] || value || '作品形式は未確認';
}
export function japanesePremiere(value: string, today = new Date().toISOString().slice(0, 10), format = 'TV') {
  const date = (value || '').trim(), movie = movieFormats.has(format.toLowerCase());
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const d = new Date(date + 'T00:00:00Z');
    if (!Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === date) {
      return (movie ? '出典の公開日：' : date > today ? '初回放送予定：' : '初回放送：') + new Intl.DateTimeFormat('ja-JP', {year:date.slice(0,4) === today.slice(0,4) ? undefined : 'numeric', month:'long', day:'numeric', timeZone:'UTC'}).format(d);
    }
  }
  if (/^\d{4}-\d{2}$/.test(date) && Number(date.slice(5)) >= 1 && Number(date.slice(5)) <= 12) {
    const pastMonth = date < today.slice(0,7);
    const label = new Intl.DateTimeFormat('ja-JP', {year:'numeric', month:'long', timeZone:'UTC'}).format(new Date(date + '-01T00:00:00Z'));
    return (pastMonth ? movie ? '出典の公開月：' : '出典の初回放送月：' : '予定：') + label + (pastMonth ? '' : '（日付は未確認）');
  }
  const quarter = date.match(/^(\d{4})-Q([1-4])$/i);
  if (quarter) return `予定：${quarter[1]}年${seasons[Number(quarter[2])-1]}`;
  return movie ? '公開日は未確認' : '初回放送日は未確認';
}
export function japaneseScoreComment(a: Anime, today = new Date().toISOString().slice(0,10)) {
  const r = a.rating.bgm, parts: string[] = [], date = new Date(a.date + 'T00:00:00Z');
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(a.date) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === a.date;
  if (validDate && a.date > today) parts.push(movieFormats.has(a.format.toLowerCase()) ? '出典に記載された公開日はまだ先です。映画祭や別の地域ではすでに上映されている可能性があり、点数は元サイトの現時点の評価を示します。' : '初回放送日はまだ先です。現在の点数は初期の参考情報であり、放送後の作品全体への評価ではありません。');
  if (r?.count) {
    const n = r.count.toLocaleString('ja-JP');
    parts.push(r.count < 50 ? `Bangumiの評価は${n}人のみです。サンプルが少ないため、少数の意見で点数が変わりやすい状態です。` : r.count < 500 ? `Bangumiでは${n}人が評価しています。初期の傾向は見えますが、放送が進むにつれて大きく変わる可能性があります。` : `Bangumiでは${n}人が評価しています。評価の分布も見ると、意見のまとまり方を確認できます。`);
  } else {
    parts.push(Object.values(a.rating).some(r=>r.score!=null) ? 'Bangumiの評価はまだ取得できていません。他の出典の点数と評価人数は別々にご覧ください。異なるコミュニティの評価を同一視することはできません。' : '接続している出典から、評価をまだ取得できていません。評価がないことは0点という意味でも、作品が悪いという意味でもありません。');
  }
  if (r?.distribution) {
    const entries = Object.entries(r.distribution), total = entries.reduce((sum,[,count])=>sum+count,0);
    if (total) {
      const high = entries.filter(([score])=>Number(score)>=8).reduce((sum,[,count])=>sum+count,0), low = entries.filter(([score])=>Number(score)<=4).reduce((sum,[,count])=>sum+count,0);
      parts.push(`この分布では8〜10点が${Math.round(high/total*100)}%、1〜4点が${Math.round(low/total*100)}%です。コミュニティの投票分布であり、当サイトによる作品の評価ではありません。`);
    }
  }
  return parts;
}
/** Relative text stays relative to the original collection time; never fabricate a date. */
export function japaneseRelativeReviewDate(value: string) {
  if (!/^(?:\d+d\s*)?(?:\d+h\s*)?(?:\d+m\s*)?\s*ago$/.test(value.trim()) || !/\d/.test(value)) return value;
  return value.trim().replace(/(\d+)d\s*/g,'$1日').replace(/(\d+)h\s*/g,'$1時間').replace(/(\d+)m\s*/g,'$1分').replace(/\s*ago$/,'前');
}
export function japaneseSeasonLabel(year:number,quarter:number) { return `${year}年${seasons[quarter]}アニメ`; }
export function japaneseReviewLabel(count:number,hasReview:boolean) {return !hasReview ? 'レビューは準備中' : count > 0 ? `レビュー · ${count}` : 'レビューの要約';}
