import {ExternalLink} from 'lucide-react';
import type {SiteLocale} from '@/lib/site-brand';

const COPY={
 zh:{title:'本周口碑',intro:'各平台的每周社区评价与读者投票。榜单由来源网站定期发布，最新一期与日期以原站为准。',anilab:'社区周度评价',anilabLink:'查看 AniLab 最新周榜',corner:'读者偏好投票',results:'Anime Corner 最新已公布结果',categories:'各类投票',weekly:'每周动画投票目录（含进行中）',note:'各站参与者与统计方法不同，请与 Bangumi、Kitsu、MAL 的长期评分分开看。本页只提供原站入口，不转载榜单。'},
 en:{title:'This week’s community picks',intro:'Weekly community ratings and reader polls. Each source publishes its own editions; open the source for the latest results and dates.',anilab:'Weekly community ratings',anilabLink:'Open the latest AniLab chart',corner:'Reader preference polls',results:'Latest published Anime Corner results',categories:'All poll categories',weekly:'Weekly anime poll directory (includes open polls)',note:'Participating audiences and methods differ. Keep these results separate from long-term Bangumi, Kitsu and MAL ratings. Source links only; charts are not republished here.'},
 ja:{title:'今週の評判',intro:'各サイトの週間評価と読者投票です。最新回と対象期間は、定期更新されるリンク先でご確認ください。',anilab:'コミュニティの週間評価',anilabLink:'AniLabの最新週間ランキングを見る',corner:'読者の好みを集めた投票',results:'Anime Cornerの公開済み最新結果',categories:'全カテゴリー',weekly:'週間アニメ投票一覧（受付中を含む）',note:'参加者や集計方法はサイトごとに異なります。Bangumi・Kitsu・MALの長期評価とは分けてご覧ください。このページはリンクのみを案内し、ランキングは転載しません。'},
} as const;

/** Source-managed destinations only: no chart acquisition or local freshness claim. */
export function WeeklyReputation({locale}:{locale:SiteLocale}){
 const copy=COPY[locale];
 return <section className="weekly-reputation" aria-labelledby="weekly-reputation-title">
  <header><h2 id="weekly-reputation-title" tabIndex={-1}>{copy.title}</h2><p>{copy.intro}</p></header>
  <div className="weekly-reputation-sources">
   <article><h3>AniLab</h3><p>{copy.anilab}</p><a href="https://anilabb.com/rate/anime" target="_blank" rel="noreferrer"><span className="weekly-reputation-link-copy">{copy.anilabLink}</span><ExternalLink size={14} aria-hidden="true"/></a></article>
   <article><h3>Anime Corner</h3><p>{copy.corner}</p><a href="https://animecorner.me/polls/browse?status=results" target="_blank" rel="noreferrer"><span className="weekly-reputation-link-copy">{copy.results}<small>{copy.categories}</small></span><ExternalLink size={14} aria-hidden="true"/></a><a href="https://animecorner.me/polls/browse/anime-of-the-week" target="_blank" rel="noreferrer"><span className="weekly-reputation-link-copy">{copy.weekly}</span><ExternalLink size={14} aria-hidden="true"/></a></article>
  </div>
  <p className="weekly-reputation-note">{copy.note}</p>
 </section>;
}
